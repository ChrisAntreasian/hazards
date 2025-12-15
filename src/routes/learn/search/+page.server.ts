import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
	const query = url.searchParams.get('q')?.trim() || '';
	const from = url.searchParams.get('from') || '/learn';
	
	if (!query || query.length < 2) {
		return {
			query: '',
			from,
			categories: [],
			templates: [],
			totalResults: 0
		};
	}

	try {
		const response = await fetch(`/api/learn/search?q=${encodeURIComponent(query)}`);
		const data = await response.json();
		
		if (data.success) {
			return {
				query,
				from,
				categories: data.categories || [],
				templates: data.templates || [],
				totalResults: (data.categories?.length || 0) + (data.templates?.length || 0)
			};
		}
	} catch (error) {
		console.error('Search load error:', error);
	}

	return {
		query,
		from,
		categories: [],
		templates: [],
		totalResults: 0
	};
};
