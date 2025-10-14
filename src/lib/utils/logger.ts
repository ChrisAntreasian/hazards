/**
 * @fileoverview Centralized logging utility for consistent log management
 * Provides configurable log levels and production-ready error handling
 * 
 * @module Logger
 * @author HazardTracker Development Team
 * @version 1.0.0
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  userId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = import.meta.env.VITE_LOG_LEVEL || (this.isDevelopment ? 'debug' : 'warn');
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}]` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, context);
      console.warn(formatted);
      if (error && this.isDevelopment) {
        console.warn(error);
      }
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, context);
      console.error(formatted);
      if (error) {
        console.error(error);
      }
    }
  }

  // Convenience methods for common patterns
  apiError(endpoint: string, error: Error, context?: LogContext): void {
    this.error(`API Error: ${endpoint}`, error, { ...context, metadata: { ...context?.metadata, endpoint } });
  }

  dbError(operation: string, error: Error, context?: LogContext): void {
    this.error(`Database Error: ${operation}`, error, { ...context, metadata: { ...context?.metadata, operation } });
  }

  authError(action: string, error: Error, context?: LogContext): void {
    this.error(`Auth Error: ${action}`, error, { ...context, action });
  }

  componentError(component: string, error: Error, context?: LogContext): void {
    this.error(`Component Error: ${component}`, error, { ...context, component });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export type for external use
export type { LogContext };