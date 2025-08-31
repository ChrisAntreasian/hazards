import type { User, Session } from '@supabase/supabase-js';

// Enhanced auth state types
export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

// Auth action types for better state management
export type AuthAction = 
  | { type: 'SIGN_IN'; payload: { user: User; session: Session } }
  | { type: 'SIGN_OUT' }
  | { type: 'LOADING'; payload: boolean }
  | { type: 'INITIALIZE'; payload: { user: User | null; session: Session | null } };

// Auth hook return type
export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

// Route protection types
export interface RouteGuardOptions {
  requireAuth?: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
}
