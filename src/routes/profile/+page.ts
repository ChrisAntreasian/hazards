import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
  const { session, user } = await parent();
  
  // Ensure we have authentication data for the profile page
  return {
    session,
    user,
    meta: {
      title: 'Profile - Hazards App',
      description: 'Manage your profile and account settings'
    }
  };
};
