import { json, type RequestHandler } from '@sveltejs/kit';
import { createSupabaseServerClient } from '$lib/supabase';

export const GET: RequestHandler = async (event) => {
	const query = event.url.searchParams.get('q')?.trim() || '';
	
	if (!query || query.length < 2) {
		return json({ success: true, templates: [], categories: [] });
	}

	const supabase = createSupabaseServerClient(event);
	
	if (!supabase) {
		return json({ success: false, error: 'Database not configured' }, { status: 500 });
	}

	try {
		// Search ALL categories (top-level and subcategories) by name and description
		const { data: categories, error: categoryError } = await supabase
			.from('hazard_categories')
			.select(`
				id,
				name,
				path,
				icon,
				level,
				description,
				short_description,
				parent_id
			`)
			.or(`name.ilike.%${query}%,description.ilike.%${query}%,short_description.ilike.%${query}%`)
			.eq('status', 'active')
			.order('level', { ascending: true })
			.limit(30);

		if (categoryError) {
			console.error('Category search error:', categoryError);
		}

		// Search templates by name and short_description
		const { data: templates, error: templateError } = await supabase
			.from('hazard_templates')
			.select(`
				id,
				name,
				slug,
				short_description,
				danger_level,
				category_id,
				hazard_categories!inner (
					path,
					name
				)
			`)
			.or(`name.ilike.%${query}%,short_description.ilike.%${query}%`)
			.eq('status', 'published')
			.limit(30);

		if (templateError) {
			console.error('Template search error:', templateError);
			return json({ success: false, error: 'Failed to search templates' }, { status: 500 });
		}

		// Format categories
		const formattedCategories = (categories || []).map(c => ({
			id: c.id,
			name: c.name,
			path: c.path,
			icon: c.icon,
			level: c.level,
			description: c.description,
			short_description: c.short_description,
			is_subcategory: c.level > 0
		}));

		// Format templates with category path
		const formattedTemplates = (templates || []).map(t => ({
			name: t.name,
			slug: t.slug,
			short_description: t.short_description,
			danger_level: t.danger_level,
			category_path: (t.hazard_categories as { path: string; name: string })?.path || '',
			category_name: (t.hazard_categories as { path: string; name: string })?.name || ''
		}));

		return json({
			success: true,
			categories: formattedCategories,
			templates: formattedTemplates,
			query
		});
	} catch (error) {
		console.error('Search error:', error);
		return json({ success: false, error: 'Search failed' }, { status: 500 });
	}
};
