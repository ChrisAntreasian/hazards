/**
 * Utility functions for common operations
 */

/**
 * Debounce function to limit rapid function calls
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
 * Retry function with exponential backoff
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
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Format error messages for display
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
