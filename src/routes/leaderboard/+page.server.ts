import type { PageServerLoad } from './$types';
import { getTrustScoreLeaderboard } from '$lib/utils/trust-score';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { supabase } = locals;
	
	// Get timeframe from query params (default: all time)
	const timeframe = url.searchParams.get('timeframe') || 'all';
	const limit = 100;

	// Load leaderboard
	const leaderboard = await getTrustScoreLeaderboard(supabase, limit, timeframe);

	return {
		leaderboard,
		timeframe
	};
};
