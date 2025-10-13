/**
 * @fileoverview Core utility functions for common operations across the HazardTracker application.
 * Provides reusable helpers for async operations, data formatting, validation, and UI enhancements.
 * 
 * @author HazardTracker Development Team
 * @version 1.0.0
 */

/**
 * Creates a debounced version of a function that delays execution until after
 * the specified wait time has passed since its last invocation. Essential for
 * performance optimization in search inputs, API calls, and event handlers.
 * 
 * @template T - Function type being debounced
 * @param func - The function to debounce
 * @param wait - Milliseconds to delay execution after last call
 * @returns Debounced function that delays execution
 * 
 * @example
 * ```typescript
 * // Debounce search API calls
 * const debouncedSearch = debounce(async (query: string) => {
 *   const results = await searchHazards(query);
 *   updateResults(results);
 * }, 300);
 * 
 * // Usage in input handler
 * <input on:input={(e) => debouncedSearch(e.target.value)} />
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Executes an async function with automatic retry logic and exponential backoff.
 * Provides resilient error handling for network requests, database operations,
 * and external API calls that may experience transient failures.
 * 
 * @template T - Return type of the async function being retried
 * @param fn - Async function to execute with retry logic
 * @param options - Retry configuration object
 * @param options.retries - Maximum number of retry attempts (default: 3)
 * @param options.delay - Initial delay in milliseconds (default: 1000)
 * @param options.backoff - Delay multiplier for exponential backoff (default: 2)
 * @returns Promise resolving to the successful function result
 * @throws The last error encountered if all retry attempts fail
 * 
 * @example
 * ```typescript
 * // Retry failed API calls with exponential backoff
 * const hazardData = await retry(
 *   () => fetch('/api/hazards').then(r => r.json()),
 *   { retries: 5, delay: 500, backoff: 2 }
 * );
 * 
 * // Retry database operations
 * await retry(() => supabase.from('hazards').insert(newHazard));
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: number;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoff = 2 } = options;
  
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, { retries: retries - 1, delay: delay * backoff, backoff });
    }
    throw error;
  }
}

/**
 * Safely parses JSON strings with automatic fallback for invalid JSON.
 * Prevents application crashes from malformed data in localStorage, API responses,
 * or user inputs while providing predictable fallback behavior.
 * 
 * @template T - Expected type of the parsed JSON object
 * @param json - JSON string to parse safely
 * @param fallback - Default value returned if parsing fails
 * @returns Parsed object of type T, or fallback if parsing fails
 * 
 * @example
 * ```typescript
 * // Parse user preferences with default fallback
 * const userPrefs = safeJsonParse(localStorage.getItem('preferences'), {
 *   theme: 'light',
 *   notifications: true
 * });
 * 
 * // Parse API response with empty array fallback
 * const hazards = safeJsonParse(responseData, []);
 * ```
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Extracts user-friendly error messages from various error object formats.
 * Provides consistent error message formatting across different error sources
 * including Supabase, fetch responses, and custom application errors.
 * 
 * @param error - Error object, string, or any error-like structure
 * @returns Human-readable error message string suitable for user display
 * 
 * @example
 * ```typescript
 * // Handle different error formats consistently
 * try {
 *   await createHazard(hazardData);
 * } catch (error) {
 *   const message = formatErrorMessage(error);
 *   showNotification(message, 'error');
 * }
 * 
 * // Supabase error -> "Email already registered"
 * // Network error -> "Failed to fetch"
 * // Custom error -> "Invalid hazard coordinates"
 * ```
 */
export function formatErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error_description) return error.error_description;
  return 'An unexpected error occurred';
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate a secure password
 */
export function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Throttle function to limit function calls to once per interval
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date in relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - targetDate.getTime();
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (weeks < 4) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/**
 * Calculate distance between two points in kilometers
 */
export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get severity level display info
 */
export function getSeverityInfo(level: number): {
  label: string;
  color: string;
  icon: string;
  description: string;
} {
  const severityMap = {
    1: {
      label: 'Low',
      color: '#28a745',
      icon: '🟢',
      description: 'Minor hazard, low risk of harm'
    },
    2: {
      label: 'Moderate',
      color: '#ffc107',
      icon: '🟡',
      description: 'Moderate hazard, some risk of harm'
    },
    3: {
      label: 'High',
      color: '#fd7e14',
      icon: '🟠',
      description: 'Significant hazard, considerable risk'
    },
    4: {
      label: 'Severe',
      color: '#dc3545',
      icon: '🔴',
      description: 'Severe hazard, high risk of serious harm'
    },
    5: {
      label: 'Extreme',
      color: '#6f42c1',
      icon: '🟣',
      description: 'Extreme hazard, immediate danger'
    }
  };
  
  return severityMap[level as keyof typeof severityMap] || severityMap[1];
}

/**
 * Format trust score with badge styling
 */
export function formatTrustScore(score: number): {
  value: number;
  label: string;
  color: string;
  badge: string;
} {
  if (score >= 1000) {
    return {
      value: score,
      label: 'Elite',
      color: '#6f42c1',
      badge: '🏆'
    };
  } else if (score >= 500) {
    return {
      value: score,
      label: 'Expert',
      color: '#28a745',
      badge: '⭐'
    };
  } else if (score >= 200) {
    return {
      value: score,
      label: 'Trusted',
      color: '#17a2b8',
      badge: '✓'
    };
  } else if (score >= 50) {
    return {
      value: score,
      label: 'Active',
      color: '#ffc107',
      badge: '📈'
    };
  } else {
    return {
      value: score,
      label: 'New',
      color: '#6c757d',
      badge: '🔰'
    };
  }
}
