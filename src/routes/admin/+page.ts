import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  // Redirect to the users page as the default admin view
  throw redirect(302, '/admin/users');
};