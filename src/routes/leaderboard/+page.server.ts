import type { PageServerLoad } from './$types';
import { getTrustScoreLeaderboard } from '$lib/utils/trust-score';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { supabase } = locals;
	
	// Get timeframe from query params (default: all time)
	const timeframeParam = url.searchParams.get('timeframe') || 'all_time';
	const timeframe = (['all_time', 'month', 'week'].includes(timeframeParam) 
		? timeframeParam 
		: 'all_time') as 'all_time' | 'month' | 'week';
	const limit = 100;

	// Load leaderboard
	const leaderboard = await getTrustScoreLeaderboard(supabase, limit, timeframe);

	return {
		leaderboard,
		timeframe
	};
};
