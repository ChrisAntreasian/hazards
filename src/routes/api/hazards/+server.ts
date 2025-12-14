/**
 * GET /api/hazards - List hazards with filtering, pagination, and field selection
 * 
 * Query parameters:
 * - fields: Comma-separated list of fields to return (default: all)
 * - limit: Max results per page (default: 50, max: 200)
 * - cursor: Created_at cursor for pagination
 * - status: Filter by status (default: approved)
 * - bounds: Filter by viewport bounds (north,south,east,west)
 * - category: Filter by category ID
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { setCacheHeaders } from '$lib/utils/cache';
import { filterExpiredHazards } from '$lib/utils/expiration';
import { logger } from '$lib/utils/logger';

// Allowed fields for selection
const ALLOWED_FIELDS = new Set([
	'id',
	'title',
	'description',
	'latitude',
	'longitude',
	'severity_level',
	'status',
	'created_at',
	'updated_at',
	'category_id',
	'expiration_type',
	'expires_at',
	'resolved_at',
	'user_id',
	'area_geojson',
	'zoom_level'
]);

// Default fields for list view (minimal for performance)
const DEFAULT_FIELDS = [
	'id',
	'title',
	'latitude',
	'longitude',
	'severity_level',
	'status',
	'created_at',
	'category_id',
	'expiration_type',
	'expires_at',
	'resolved_at'
];

// Pagination limits
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const GET: RequestHandler = async ({ url, locals: { supabase }, setHeaders }) => {
	try {
		// Parse query parameters
		const fieldsParam = url.searchParams.get('fields');
		const limit = Math.min(
			parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT)),
			MAX_LIMIT
		);
		const cursor = url.searchParams.get('cursor');
		const status = url.searchParams.get('status') || 'approved';
		const boundsParam = url.searchParams.get('bounds');
		const categoryId = url.searchParams.get('category');

		// Parse and validate fields
		let fields = DEFAULT_FIELDS;
		if (fieldsParam) {
			const requestedFields = fieldsParam.split(',').map((f: string) => f.trim());
			fields = requestedFields.filter((f: string) => ALLOWED_FIELDS.has(f));
			
			// Always include id for consistency
			if (!fields.includes('id')) {
				fields.unshift('id');
			}
		}

		// Build select string
		const selectString = fields.join(',');

		// Build query
		let query = supabase
			.from('hazards')
			.select(selectString)
			.eq('status', status)
			.not('latitude', 'is', null)
			.not('longitude', 'is', null)
			.order('created_at', { ascending: false })
			.limit(limit);

		// Apply cursor for pagination
		if (cursor) {
			query = query.lt('created_at', cursor);
		}

		// Apply bounds filter if provided
		if (boundsParam) {
			const [north, south, east, west] = boundsParam.split(',').map(parseFloat);
			if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
				query = query
					.gte('latitude', south)
					.lte('latitude', north)
					.gte('longitude', west)
					.lte('longitude', east);
			}
		}

		// Apply category filter
		if (categoryId) {
			query = query.eq('category_id', categoryId);
		}

		const { data: hazards, error: hazardsError } = await query;

		if (hazardsError) {
			logger.dbError('list hazards', new Error(hazardsError.message), {
				component: 'HazardsAPI',
				metadata: { code: hazardsError.code }
			});
			throw error(500, 'Failed to load hazards');
		}

		// Filter expired hazards if expiration fields are included
		const hasExpirationFields = fields.includes('expiration_type') || 
			fields.includes('expires_at') || 
			fields.includes('resolved_at');
		
		const activeHazards = hasExpirationFields 
			? filterExpiredHazards(hazards || [])
			: hazards || [];

		// Calculate next cursor
		const nextCursor = activeHazards.length === limit 
			? activeHazards[activeHazards.length - 1]?.created_at 
			: null;

		// Set cache headers (short cache for list)
		setCacheHeaders(setHeaders, 'mapHazards');

		return json({
			data: activeHazards,
			meta: {
				count: activeHazards.length,
				limit,
				nextCursor,
				hasMore: nextCursor !== null
			}
		});

	} catch (err) {
		logger.error('Hazards API failed', err as Error, { component: 'HazardsAPI' });
		throw error(500, 'Failed to load hazards');
	}
};
