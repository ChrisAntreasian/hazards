/**
 * @fileoverview API endpoint to get user's vote status for a hazard
 * GET /api/hazards/[id]/vote-status
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { VoteStatusResult } from '$lib/types/database';

/**
 * GET - Retrieve user's vote status for a specific hazard
 * Returns whether user has voted, vote type, and if they can vote
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { supabase } = locals;
	const session = await locals.getSession();

	const hazardId = params.id;

	// If not authenticated, they can't vote but can see vote counts
	if (!session?.user) {
		const response: VoteStatusResult = {
			has_voted: false,
			vote_type: null,
			can_vote: false
		};
		return json(response);
	}

	const userId = session.user.id;

	// Check if hazard exists
	const { data: hazard, error: hazardError } = await supabase
		.from('hazards')
		.select('id, user_id')
		.eq('id', hazardId)
		.single();

	if (hazardError || !hazard) {
		throw error(404, 'Hazard not found');
	}

	// Check if user owns the hazard
	const isOwnHazard = hazard.user_id === userId;

	// Check if user has voted
	const { data: existingVote } = await supabase
		.from('hazard_votes')
		.select('vote_type')
		.eq('hazard_id', hazardId)
		.eq('user_id', userId)
		.single();

	const response: VoteStatusResult = {
		has_voted: !!existingVote,
		vote_type: existingVote?.vote_type ?? null,
		can_vote: !isOwnHazard
	};

	return json(response);
};
