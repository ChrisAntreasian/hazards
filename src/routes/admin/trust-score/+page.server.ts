import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getTrustScoreConfig } from '$lib/utils/trust-score';

export const load: PageServerLoad = async ({ locals }) => {
	const { supabase, getSession } = locals;
	const session = await getSession();

	if (!session?.user) {
		throw error(401, 'You must be logged in to access this page');
	}

	// Check if user is admin
	const { data: profile } = await supabase
		.from('users')
		.select('role')
		.eq('id', session.user.id)
		.single();

	if (profile?.role !== 'admin') {
		throw error(403, 'You must be an admin to access this page');
	}

	// Load current trust score configuration
	const configs = await getTrustScoreConfig(supabase);

	return {
		configs,
		user: session.user
	};
};
