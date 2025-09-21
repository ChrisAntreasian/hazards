import { dev } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
  // Redirect to home if not in development mode
  if (!dev) {
    throw redirect(302, '/');
  }
  
  return {
    dev: true
  };
};
