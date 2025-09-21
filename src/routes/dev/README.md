# Development Tools

This directory contains development and debugging tools for the Hazards App. These tools are automatically disabled in production environments.

## Directory Structure

- `/dev` - Development tools overview page
- `/dev/status` - System status dashboard showing configuration and endpoints
- `/dev/test` - Database connectivity and basic table testing
- `/dev/test/images` - Image upload and gallery functionality testing
- `/dev/api/diagnostic` - Simple health check API endpoint
- `/dev/api/test-reset-url` - Password reset URL testing API endpoint

## Security

- All dev tools are protected by environment checks
- Pages automatically redirect to home in production mode
- Server-side protection via `+layout.server.ts`
- Client-side protection via environment detection

## Purpose

These tools were created during development to:
- Debug authentication flow issues
- Test database connectivity
- Monitor system configuration
- Test image upload functionality
- Provide quick access to various development endpoints

## Access

In development mode, dev tools are accessible via:
- Direct navigation to `/dev`
- "🔧 Dev" link in the main navigation bar (appears only in development)

## Usage

Only use these tools during development. They may include verbose logging, test data, and debugging code that could impact performance or expose sensitive information.
