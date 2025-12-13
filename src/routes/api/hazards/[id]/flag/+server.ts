import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals: { supabase, getSession } }) => {
	const session = await getSession();
	if (!session) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { id: hazardId } = params;

	try {
		const body = await request.json();
		const { reason, notes } = body;

		// Validate
		if (!reason) {
			return json({ error: 'Reason is required' }, { status: 400 });
		}

		const validReasons = [
			'spam',
			'inappropriate',
			'dangerous_advice',
			'wrong_location',
			'duplicate',
			'offensive',
			'misinformation',
			'other'
		];

		if (!validReasons.includes(reason)) {
			return json({ error: 'Invalid reason' }, { status: 400 });
		}

		// Check if user already flagged this hazard
		const { data: existingFlag } = await supabase
			.from('hazard_flags')
			.select('id')
			.eq('hazard_id', hazardId)
			.eq('user_id', session.user.id)
			.maybeSingle();

		if (existingFlag) {
			return json({ error: 'You have already flagged this hazard' }, { status: 400 });
		}

		// Verify hazard exists
		const { data: hazard, error: hazardError } = await supabase
			.from('hazards')
			.select('id, user_id, title')
			.eq('id', hazardId)
			.single();

		if (hazardError || !hazard) {
			return json({ error: 'Hazard not found' }, { status: 404 });
		}

		// Insert flag
		const { data: flag, error: flagError } = await supabase
			.from('hazard_flags')
			.insert({
				hazard_id: hazardId,
				user_id: session.user.id,
				reason,
				notes: notes || null,
				status: 'pending'
			})
			.select()
			.single();

		if (flagError) throw flagError;

		// Add to moderation queue
		const { error: queueError } = await supabase.from('moderation_queue').insert({
			content_id: hazardId,
			type: 'hazard',
			reason: `Flagged: ${reason}`,
			notes: notes || null,
			reported_by: session.user.id,
			status: 'pending'
		});

		if (queueError) {
			console.error('Error adding to moderation queue:', queueError);
			// Continue - flag was created successfully
		}

		// Update trust score for flagging (handled by database trigger on hazard_flags insert)
		// No need to manually call update_trust_score here

		return json({ success: true, flag });
	} catch (error) {
		console.error('Error creating flag:', error);
		return json({ error: 'Failed to flag hazard' }, { status: 500 });
	}
};
