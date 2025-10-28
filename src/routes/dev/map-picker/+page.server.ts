import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// For development testing, provide sample location data
	return {
		initialLocation: {
			lat: 42.3601,
			lng: -71.0589
		},
		testData: {
			title: 'Map Location Picker Development',
			description: 'Testing interactive map location and area drawing functionality'
		}
	};
};