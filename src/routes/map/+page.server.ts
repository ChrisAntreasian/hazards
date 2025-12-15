import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { filterExpiredHazards } from '$lib/utils/expiration';
import { CACHE_DURATIONS } from '$lib/utils/cache';

export const load: PageServerLoad = async ({ locals: { supabase }, setHeaders }) => {
// Cache map hazards for 2 minutes (balancing freshness with performance)
setHeaders({ 'Cache-Control': CACHE_DURATIONS.mapHazards });

try {
// Check if Supabase client is available
if (!supabase) {
logger.warn('Supabase client not available in map page load', {
component: 'MapPageServer'
});
return { hazards: [] };
}

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
.eq('status', 'approved')
.not('latitude', 'is', null)
.not('longitude', 'is', null)
.order('created_at', { ascending: false });

if (hazardsError) {
logger.dbError('load hazards for map', new Error(hazardsError.message), {
component: 'MapPageServer',
metadata: { code: hazardsError.code, details: hazardsError.details }
});
throw error(500, 'Failed to load hazard data');
}

const { data: categories, error: categoriesError } = await supabase
.from('hazard_categories')
.select('id, name, level');

if (categoriesError) {
logger.dbError('load categories for map', new Error(categoriesError.message), {
component: 'MapPageServer',
metadata: { code: categoriesError.code }
});
}

const categoryMap = new Map();
categories?.forEach(category => {
categoryMap.set(category.id, category.name);
});

const activeHazards = filterExpiredHazards(hazards || []);
const hazardsWithDetails = activeHazards.map(hazard => ({
...hazard,
category_name: categoryMap.get(hazard.category_id) || 'Unknown'
}));

return { hazards: hazardsWithDetails };

} catch (err) {
logger.error('Map page load failed', err as Error, { component: 'MapPageServer' });
throw error(500, 'Failed to load map data');
}
};