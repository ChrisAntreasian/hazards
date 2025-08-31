import { vi } from 'vitest';
import type { AuthError, User, Session } from '@supabase/supabase-js';

// Mock user data
export const mockUser: User = {
	id: 'test-user-id',
	email: 'test@example.com',
	user_metadata: {
		full_name: 'Test User'
	},
	app_metadata: {},
	aud: 'authenticated',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z'
};

export const mockSession: Session = {
	access_token: 'test-access-token',
	refresh_token: 'test-refresh-token',
	expires_in: 3600,
	token_type: 'bearer',
	user: mockUser
};

// Mock auth responses
export const mockAuthSuccess = {
	data: {
		user: mockUser,
		session: mockSession
	},
	error: null
};

export const mockAuthError = new Error('Invalid credentials') as AuthError;

export const mockAuthErrorResponse = {
	data: {
		user: null,
		session: null
	},
	error: mockAuthError
};

// Mock auth store actions
export const createMockAuthStore = () => {
	const mockStore = {
		user: vi.fn(() => mockUser),
		session: vi.fn(() => mockSession),
		isAuthenticated: vi.fn(() => true),
		isLoading: vi.fn(() => false),
		dispatch: vi.fn()
	};
	
	return mockStore;
};

// Mock Supabase client
export const createMockSupabaseClient = () => ({
	auth: {
		signInWithPassword: vi.fn(),
		signInWithOAuth: vi.fn(),
		signOut: vi.fn(),
		getSession: vi.fn(),
		getUser: vi.fn(),
		onAuthStateChange: vi.fn(() => ({ 
			data: { subscription: { unsubscribe: vi.fn() } } 
		}))
	}
});
