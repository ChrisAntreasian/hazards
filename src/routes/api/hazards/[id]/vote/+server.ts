/**
 * @fileoverview API endpoint for voting on hazards (upvote/downvote)
 * POST /api/hazards/[id]/vote - Cast or change vote
 * DELETE /api/hazards/[id]/vote - Remove vote
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { VoteRequest, VoteResponse } from '$lib/types/database';

/**
 * POST - Cast or change a vote on a hazard
 * Users can upvote or downvote a hazard, but not their own hazards
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { supabase } = locals;
	const session = await locals.getSession();

	// Check authentication
	if (!session?.user) {
		throw error(401, 'You must be logged in to vote');
	}

	const hazardId = params.id;
	const userId = session.user.id;

	// Parse request body
	let body: VoteRequest;
	try {
		body = await request.json();
	} catch (e) {
		throw error(400, 'Invalid request body');
	}

	const { vote_type } = body;

	// Validate vote type
	if (!vote_type || !['up', 'down'].includes(vote_type)) {
		throw error(400, 'Invalid vote type. Must be "up" or "down"');
	}

	// Check if hazard exists and user can vote on it (not their own)
	const { data: hazard, error: hazardError } = await supabase
		.from('hazards')
		.select('id, user_id, votes_up, votes_down, vote_score')
		.eq('id', hazardId)
		.single();

	if (hazardError || !hazard) {
		throw error(404, 'Hazard not found');
	}

	// Users cannot vote on their own hazards
	if (hazard.user_id === userId) {
		throw error(403, 'You cannot vote on your own hazard');
	}

	// Check if user has already voted
	const { data: existingVote } = await supabase
		.from('hazard_votes')
		.select('*')
		.eq('hazard_id', hazardId)
		.eq('user_id', userId)
		.single();

	let voteData;

	if (existingVote) {
		// User has already voted - update the vote
		if (existingVote.vote_type === vote_type) {
			// Same vote type - no change needed
			throw error(400, `You have already ${vote_type}voted this hazard`);
		}

		// Change vote type
		const { data: updatedVote, error: updateError } = await supabase
			.from('hazard_votes')
			.update({ vote_type, updated_at: new Date().toISOString() })
			.eq('id', existingVote.id)
			.select()
			.single();

		if (updateError) {
			console.error('Error updating vote:', updateError);
			throw error(500, 'Failed to update vote');
		}

		voteData = updatedVote;
	} else {
		// New vote - insert
		const { data: newVote, error: insertError } = await supabase
			.from('hazard_votes')
			.insert({
				hazard_id: hazardId,
				user_id: userId,
				vote_type
			})
			.select()
			.single();

		if (insertError) {
			console.error('Error creating vote:', insertError);
			throw error(500, 'Failed to create vote');
		}

		voteData = newVote;
	}

	// Fetch updated vote counts (triggers will have updated these)
	const { data: updatedHazard } = await supabase
		.from('hazards')
		.select('votes_up, votes_down, vote_score')
		.eq('id', hazardId)
		.single();

	const response: VoteResponse = {
		success: true,
		vote: voteData,
		hazard_votes: {
			votes_up: updatedHazard?.votes_up ?? 0,
			votes_down: updatedHazard?.votes_down ?? 0,
			vote_score: updatedHazard?.vote_score ?? 0
		}
	};

	return json(response);
};

/**
 * DELETE - Remove a user's vote from a hazard
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { supabase } = locals;
	const session = await locals.getSession();

	// Check authentication
	if (!session?.user) {
		throw error(401, 'You must be logged in to remove a vote');
	}

	const hazardId = params.id;
	const userId = session.user.id;

	// Check if user has voted
	const { data: existingVote } = await supabase
		.from('hazard_votes')
		.select('*')
		.eq('hazard_id', hazardId)
		.eq('user_id', userId)
		.single();

	if (!existingVote) {
		throw error(404, 'You have not voted on this hazard');
	}

	// Delete the vote
	const { error: deleteError } = await supabase
		.from('hazard_votes')
		.delete()
		.eq('id', existingVote.id);

	if (deleteError) {
		console.error('Error deleting vote:', deleteError);
		throw error(500, 'Failed to remove vote');
	}

	// Fetch updated vote counts
	const { data: updatedHazard } = await supabase
		.from('hazards')
		.select('votes_up, votes_down, vote_score')
		.eq('id', hazardId)
		.single();

	return json({
		success: true,
		hazard_votes: {
			votes_up: updatedHazard?.votes_up ?? 0,
			votes_down: updatedHazard?.votes_down ?? 0,
			vote_score: updatedHazard?.vote_score ?? 0
		}
	});
};
