import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { filterExpiredHazards } from '$lib/utils/expiration';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	try {
		// Check if Supabase client is available
		if (!supabase) {
			logger.warn('Supabase client not available in map page load', { 
				component: 'MapPageServer' 
			});
			// Return empty data instead of throwing error for development
			return { hazards: [] };
		}

		// Load hazards first
		const { data: hazards, error: hazardsError } = await supabase
			.from('hazards')
			.select(`
				id,
				title,
				description,
				latitude,
				longitude,
				severity_level,
				status,
				created_at,
				category_id,
				expiration_type,
				expires_at,
				resolved_at
			`)
			.eq('status', 'approved')  // Only show approved hazards on the map
			.not('latitude', 'is', null)  // Only hazards with location data
			.not('longitude', 'is', null)
			.order('created_at', { ascending: false });

		if (hazardsError) {
			logger.dbError('load hazards for map', new Error(hazardsError.message), {
				component: 'MapPageServer',
				metadata: { code: hazardsError.code, details: hazardsError.details }
			});
			throw error(500, 'Failed to load hazard data');
		}

		// Load categories separately
		const { data: categories, error: categoriesError } = await supabase
			.from('hazard_categories')
			.select('id, name, level');

		if (categoriesError) {
			logger.dbError('load categories for map', new Error(categoriesError.message), {
				component: 'MapPageServer',
				metadata: { code: categoriesError.code }
			});
			// Continue with empty categories instead of failing
		}

		// Create category lookup map
		const categoryMap = new Map();
		categories?.forEach(category => {
			categoryMap.set(category.id, category.name);
		});

		// Filter out expired hazards and add category names
		const activeHazards = filterExpiredHazards(hazards || []);
		const hazardsWithDetails = activeHazards.map(hazard => ({
			...hazard,
			category_name: categoryMap.get(hazard.category_id) || 'Unknown'
		}));

		return {
			hazards: hazardsWithDetails
		};

	} catch (err) {
		logger.error('Map page load failed', err as Error, { 
			component: 'MapPageServer' 
		});
		throw error(500, 'Failed to load map data');
	}
};