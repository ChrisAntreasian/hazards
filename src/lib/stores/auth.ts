import { writable, derived, get } from 'svelte/store';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthState, AuthAction } from '$lib/types/auth.js';

// Create a more structured auth state
const createAuthStore = () => {
  const initialState: AuthState = {
    user: null,
    session: null,
    loading: true,
    initialized: false
  };

  const { subscribe, set, update } = writable<AuthState>(initialState);

  const dispatch = (action: AuthAction) => {
    update(state => {
      switch (action.type) {
        case 'SIGN_IN':
          return {
            ...state,
            user: action.payload.user,
            session: action.payload.session,
            loading: false,
            initialized: true
          };
        case 'SIGN_OUT':
          return {
            ...state,
            user: null,
            session: null,
            loading: false,
            initialized: true
          };
        case 'LOADING':
          return {
            ...state,
            loading: action.payload
          };
        case 'INITIALIZE':
          return {
            ...state,
            user: action.payload.user,
            session: action.payload.session,
            loading: false,
            initialized: true
          };
        default:
          return state;
      }
    });
  };

  return {
    subscribe,
    dispatch,
    // Legacy helpers for backward compatibility
    updateAuthState: (newSession: Session | null, newUser: User | null = null) => {
      if (newSession) {
        dispatch({ 
          type: 'SIGN_IN', 
          payload: { 
            user: newUser || newSession.user, 
            session: newSession 
          } 
        });
      } else {
        dispatch({ type: 'SIGN_OUT' });
      }
    },
    clearAuthState: () => dispatch({ type: 'SIGN_OUT' }),
    setLoading: (loading: boolean) => dispatch({ type: 'LOADING', payload: loading }),
    initialize: (user: User | null, session: Session | null) => 
      dispatch({ type: 'INITIALIZE', payload: { user, session } })
  };
};

export const authStore = createAuthStore();

// Derived stores for easier component access
export const user = derived(authStore, $auth => $auth.user);
export const session = derived(authStore, $auth => $auth.session);
export const loading = derived(authStore, $auth => $auth.loading);
export const initialized = derived(authStore, $auth => $auth.initialized);
export const isAuthenticated = derived(authStore, $auth => !!$auth.session && !!$auth.user);

// Legacy exports for backward compatibility
export const { updateAuthState, clearAuthState } = authStore;
