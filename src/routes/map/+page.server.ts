import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	try {
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
				category_id
			`)
			.eq('status', 'approved')  // Only show approved hazards on the map
			.not('latitude', 'is', null)  // Only hazards with location data
			.not('longitude', 'is', null)
			.order('created_at', { ascending: false });

		if (hazardsError) {
			console.error('Error loading hazards for map:', hazardsError);
			throw error(500, 'Failed to load hazard data');
		}

		// Load categories separately
		const { data: categories, error: categoriesError } = await supabase
			.from('hazard_categories')
			.select('id, name, level');

		if (categoriesError) {
			console.error('Error loading categories for map:', categoriesError);
		}

		// Create category lookup map
		const categoryMap = new Map();
		categories?.forEach(category => {
			categoryMap.set(category.id, category.name);
		});

		// Transform the data to include category name at the top level
		const hazardsWithDetails = hazards?.map(hazard => ({
			...hazard,
			category_name: categoryMap.get(hazard.category_id) || 'Unknown'
		})) || [];

		return {
			hazards: hazardsWithDetails
		};

	} catch (err) {
		console.error('Error in map page load function:', err);
		throw error(500, 'Failed to load map data');
	}
};