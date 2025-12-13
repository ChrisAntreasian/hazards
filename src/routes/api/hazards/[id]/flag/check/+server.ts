import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals: { supabase, getSession } }) => {
	const session = await getSession();
	if (!session) {
		return json({ hasFlagged: false }, { status: 200 });
	}

	const { id } = params;

	try {
		const { data, error } = await supabase
			.from('hazard_flags')
			.select('id, status')
			.eq('hazard_id', id)
			.eq('user_id', session.user.id)
			.maybeSingle();

		if (error) throw error;

		return json({
			hasFlagged: !!data,
			flagStatus: data?.status || null
		});
	} catch (error) {
		console.error('Error checking flag status:', error);
		return json({ error: 'Failed to check flag status' }, { status: 500 });
	}
};
