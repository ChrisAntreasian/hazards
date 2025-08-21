import { type Handle } from '@sveltejs/kit';

// Temporarily disabled - will be implemented in Week 2 with Supabase
// This file will contain the Supabase auth setup and route protection

export const handle: Handle = async ({ event, resolve }) => {
  // For now, just pass through
  return resolve(event);
};
