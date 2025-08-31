import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock browser environment
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock window.location
Object.defineProperty(window, 'location', {
	value: {
		href: 'http://localhost:3000',
		origin: 'http://localhost:3000',
		protocol: 'http:',
		host: 'localhost:3000',
		hostname: 'localhost',
		port: '3000',
		pathname: '/',
		search: '',
		hash: ''
	},
	writable: true
});

// Ensure browser globals are available
global.window = window;
global.document = document;
global.navigator = navigator;
