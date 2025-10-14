<svelte:head>
	<title>About</title>
	<meta name="description" content="About this app" />
</svelte:head>

<div class="text-column">
	<h1>About Hazard Tracker</h1>

	<p>
		Hazard Tracker is a community-driven platform for reporting and managing environmental and safety hazards.
		Built with <a href="https://svelte.dev/docs/kit">SvelteKit</a> and <a href="https://supabase.com">Supabase</a>,
		it provides real-time hazard reporting, moderation workflows, and interactive mapping.
	</p>

	<h2>Key Features</h2>
	<ul>
		<li><strong>Interactive Mapping:</strong> View hazards on an interactive map with clustering</li>
		<li><strong>User Reports:</strong> Submit hazard reports with images and location data</li>
		<li><strong>Moderation System:</strong> Community content review and approval workflows</li>
		<li><strong>Real-time Updates:</strong> Live notifications and status updates</li>
		<li><strong>Mobile Responsive:</strong> Works seamlessly on desktop and mobile devices</li>
	</ul>

	<h2>Technology Stack</h2>
	<p>
		This application leverages modern web technologies for optimal performance and user experience:
		SvelteKit for the frontend, Supabase for backend services, TypeScript for type safety, 
		and Leaflet for interactive maps.
	</p>

	<p>
		Explore the <a href="/map">interactive map</a> to see reported hazards or 
		<a href="/hazards/create">submit a new report</a> to help keep our community safe.
	</p>
</div>
