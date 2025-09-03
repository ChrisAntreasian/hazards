import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

// Mock modules before imports
vi.mock('$lib/supabase', () => {
	return {
		supabase: {
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
		},
		isSupabaseConfigured: true
	};
});

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidate: vi.fn()
}));

vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn(() => vi.fn()),
		url: {
			searchParams: {
				get: vi.fn()
			}
		}
	}
}));

vi.mock('$lib/hooks/useAuth', () => ({
	useAuth: () => ({
		user: vi.fn(() => null),
		session: vi.fn(() => null),
		isAuthenticated: vi.fn(() => false),
		isLoading: vi.fn(() => false),
		dispatch: vi.fn()
	})
}));

// Import after mocks
import LoginPage from '../routes/auth/log-in/+page.svelte';
import { 
	mockAuthSuccess, 
	mockAuthErrorResponse, 
	mockUser,
	mockSession
} from './mocks';

// Create mock functions
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockGoto = vi.fn();

// Mock modules before imports
vi.mock('$lib/supabase', () => ({
	supabase: {
		auth: {
			signInWithPassword: mockSignInWithPassword,
			signInWithOAuth: mockSignInWithOAuth,
			signOut: vi.fn(),
			getSession: vi.fn(),
			getUser: vi.fn(),
			onAuthStateChange: vi.fn(() => ({ 
				data: { subscription: { unsubscribe: vi.fn() } } 
			}))
		}
	},
	isSupabaseConfigured: true
}));

vi.mock('$app/navigation', () => ({
	goto: mockGoto,
	invalidate: vi.fn()
}));

vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn(() => vi.fn()),
		url: {
			searchParams: {
				get: vi.fn()
			}
		}
	}
}));

vi.mock('$lib/hooks/useAuth', () => ({
	useAuth: () => ({
		user: vi.fn(() => null),
		session: vi.fn(() => null),
		isAuthenticated: vi.fn(() => false),
		isLoading: vi.fn(() => false),
		dispatch: vi.fn()
	})
}));

describe('Login Flow', () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Form Validation', () => {
		it('should display error for empty email', async () => {
			render(LoginPage);

			const submitButton = screen.getByRole('button', { name: /log in/i });
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
			});
		});

		it('should display error for invalid email format', async () => {
			render(LoginPage);

			const emailInput = screen.getByLabelText(/email/i);
			const submitButton = screen.getByRole('button', { name: /log in/i });

			await user.type(emailInput, 'invalid-email');
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
			});
		});

		it('should display error for empty password', async () => {
			render(LoginPage);

			const emailInput = screen.getByLabelText(/email/i);
			const submitButton = screen.getByRole('button', { name: /log in/i });

			await user.type(emailInput, 'test@example.com');
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/password is required/i)).toBeInTheDocument();
			});
		});

		it('should display error for short password', async () => {
			render(LoginPage);

			const emailInput = screen.getByLabelText(/email/i);
			const passwordInput = screen.getByLabelText(/password/i);
			const submitButton = screen.getByRole('button', { name: /log in/i });

			await user.type(emailInput, 'test@example.com');
			await user.type(passwordInput, '123');
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
			});
		});
	});

	describe('Authentication Flow', () => {
		it('should handle successful login', async () => {
			mockSignInWithPassword.mockResolvedValue(mockAuthSuccess);

			render(LoginPage);

			const emailInput = screen.getByLabelText(/email/i);
			const passwordInput = screen.getByLabelText(/password/i);
			const submitButton = screen.getByRole('button', { name: /log in/i });

			await user.type(emailInput, 'test@example.com');
			await user.type(passwordInput, 'password123');
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockSignInWithPassword).toHaveBeenCalledWith({
					email: 'test@example.com',
					password: 'password123'
				});
			});
		});

		it('should handle login error', async () => {
			mockSignInWithPassword.mockResolvedValue(mockAuthErrorResponse);

			render(LoginPage);

			const emailInput = screen.getByLabelText(/email/i);
			const passwordInput = screen.getByLabelText(/password/i);
			const submitButton = screen.getByRole('button', { name: /log in/i });

			await user.type(emailInput, 'test@example.com');
			await user.type(passwordInput, 'wrongpassword');
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
			});
		});

		it('should show loading state during authentication', async () => {
			mockSignInWithPassword.mockImplementation(
				() => new Promise(resolve => setTimeout(() => resolve(mockAuthSuccess), 100))
			);

			render(LoginPage);

			const emailInput = screen.getByLabelText(/email/i);
			const passwordInput = screen.getByLabelText(/password/i);
			const submitButton = screen.getByRole('button', { name: /log in/i });

			await user.type(emailInput, 'test@example.com');
			await user.type(passwordInput, 'password123');
			await user.click(submitButton);

			// Check for loading state
			expect(screen.getByText(/logging in/i)).toBeInTheDocument();

			await waitFor(() => {
				expect(screen.queryByText(/logging in/i)).not.toBeInTheDocument();
			});
		});
	});

	describe('Google OAuth', () => {
		it('should handle Google OAuth login', async () => {
			mockSignInWithOAuth.mockResolvedValue({ 
				data: { provider: 'google', url: null }, 
				error: null 
			});

			render(LoginPage);

			const googleButton = screen.getByRole('button', { name: /continue with google/i });
			await user.click(googleButton);

			expect(mockSignInWithOAuth).toHaveBeenCalledWith({
				provider: 'google',
				options: {
					redirectTo: expect.stringContaining('/auth/callback')
				}
			});
		});

		it('should handle Google OAuth error', async () => {
			mockSignInWithOAuth.mockResolvedValue({
				data: { provider: 'google', url: null },
				error: new Error('OAuth failed') as any
			});

			render(LoginPage);

			const googleButton = screen.getByRole('button', { name: /continue with google/i });
			await user.click(googleButton);

			await waitFor(() => {
				expect(screen.getByText(/oauth failed/i)).toBeInTheDocument();
			});
		});
	});

	describe('Email Confirmation', () => {
		it('should show email confirmation message for unconfirmed account', async () => {
			const unconfirmedResponse = {
				data: { user: null, session: null },
				error: new Error('Email not confirmed') as any
			};
			
			mockSignInWithPassword.mockResolvedValue(unconfirmedResponse);

			render(LoginPage);

			const emailInput = screen.getByLabelText(/email/i);
			const passwordInput = screen.getByLabelText(/password/i);
			const submitButton = screen.getByRole('button', { name: /log in/i });

			await user.type(emailInput, 'unconfirmed@example.com');
			await user.type(passwordInput, 'password123');
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/please check your email/i)).toBeInTheDocument();
			});
		});
	});

	describe('Form Reset', () => {
		it('should clear error messages when form is edited', async () => {
			render(LoginPage);

			const emailInput = screen.getByLabelText(/email/i);
			const submitButton = screen.getByRole('button', { name: /log in/i });

			// Trigger validation error
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
			});

			// Start typing to clear error
			await user.type(emailInput, 'test@example.com');

			await waitFor(() => {
				expect(screen.queryByText(/please enter a valid email/i)).not.toBeInTheDocument();
			});
		});
	});

	describe('Navigation Links', () => {
		it('should render forgot password link', () => {
			render(LoginPage);
			
			const forgotPasswordLink = screen.getByRole('link', { name: /forgot your password/i });
			expect(forgotPasswordLink).toBeInTheDocument();
			expect(forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password');
		});

		it('should render register link', () => {
			render(LoginPage);
			
			const registerLink = screen.getByRole('link', { name: /create an account/i });
			expect(registerLink).toBeInTheDocument();
			expect(registerLink).toHaveAttribute('href', '/auth/register');
		});
	});
});
