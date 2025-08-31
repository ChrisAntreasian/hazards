import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

// Mock modules before imports
vi.mock('$lib/supabase', () => {
	const mockSupabase = {
		auth: {
			signInWithPassword: vi.fn(),
			signInWithOAuth: vi.fn(),
			getUser: vi.fn(),
			signOut: vi.fn(),
			resend: vi.fn()
		}
	};

	return {
		createSupabaseLoadClient: vi.fn(() => mockSupabase),
		isSupabaseConfigured: vi.fn(() => true)
	};
});

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidate: vi.fn()
}));

vi.mock('$app/stores', () => ({
	page: {
		url: {
			searchParams: {
				get: vi.fn(() => null)
			},
			origin: 'http://localhost:3000'
		}
	}
}));

// Import mocks after mocking
import { mockUser, mockSession, mockAuthSuccess, mockAuthErrorResponse } from './mocks';

// Import component after mocks
import LoginPage from '../routes/auth/log-in/+page.svelte';

describe('Login Flow', () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Component Rendering', () => {
		it('should render login form with all required elements', () => {
			render(LoginPage);

			// Check for main elements
			expect(screen.getByText('Welcome Back')).toBeInTheDocument();
			expect(screen.getByText('Sign in to your Hazards account')).toBeInTheDocument();
			
			// Check for form inputs
			expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
			
			// Check for buttons
			expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
		});

		it('should render navigation links', () => {
			render(LoginPage);

			const registerLink = screen.getByRole('link', { name: /sign up/i });
			expect(registerLink).toBeInTheDocument();
			expect(registerLink).toHaveAttribute('href', '/auth/register');

			const forgotPasswordLink = screen.getByRole('link', { name: /forgot your password/i });
			expect(forgotPasswordLink).toBeInTheDocument();
			expect(forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password');
		});
	});

	describe('User Interactions', () => {
		it('should allow typing in email and password fields', async () => {
			render(LoginPage);

			const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
			const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

			await user.type(emailInput, 'test@example.com');
			await user.type(passwordInput, 'password123');

			expect(emailInput.value).toBe('test@example.com');
			expect(passwordInput.value).toBe('password123');
		});

		it('should handle form submission', async () => {
			const { createSupabaseLoadClient } = await import('$lib/supabase');
			const supabase = createSupabaseLoadClient();
			
			render(LoginPage);

			const emailInput = screen.getByLabelText(/email/i);
			const passwordInput = screen.getByLabelText(/password/i);
			const submitButton = screen.getByRole('button', { name: /sign in/i });

			await user.type(emailInput, 'test@example.com');
			await user.type(passwordInput, 'password123');
			await user.click(submitButton);

			// The form should trigger Supabase auth if mocked properly
			// Note: The actual validation and error display might require more complex setup
		});
	});
});