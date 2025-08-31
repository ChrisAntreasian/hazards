import { writable } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';

// Create reactive stores for auth state
export const session = writable<Session | null>(null);
export const user = writable<User | null>(null);
export const loading = writable(true);

// Helper to update all auth stores at once
export function updateAuthState(newSession: Session | null, newUser: User | null = null) {
  session.set(newSession);
  user.set(newUser || newSession?.user || null);
  loading.set(false);
}

// Helper to clear auth state
export function clearAuthState() {
  session.set(null);
  user.set(null);
  loading.set(false);
}
