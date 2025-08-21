<script lang="ts">
	// Placeholder map page - will be implemented in Week 5
</script>

<svelte:head>
	<title>Map - Hazards App</title>
</svelte:head>

<div class="placeholder-container">
	<div class="placeholder-card">
		<h1>🗺️ Interactive Map</h1>
		<p>The interactive hazard map will be implemented in Week 5.</p>
		<p>This will include:</p>
		<ul>
			<li>LibreMaps integration with Leaflet</li>
			<li>Hazard pins with severity indicators</li>
			<li>Boston area focus initially</li>
			<li>Clustering for performance</li>
			<li>Mobile-responsive controls</li>
		</ul>
		<a href="/" class="btn btn-primary">Back to Home</a>
	</div>
</div>

<style>
	.placeholder-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		padding: 2rem;
	}

	.placeholder-card {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		max-width: 600px;
		width: 100%;
	}

	h1 {
		margin-bottom: 1rem;
		color: #1e293b;
		text-align: center;
	}

	p {
		color: #64748b;
		margin-bottom: 1rem;
		line-height: 1.6;
	}

	ul {
		color: #64748b;
		margin-bottom: 2rem;
		padding-left: 1.5rem;
	}

	li {
		margin-bottom: 0.5rem;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		text-decoration: none;
		font-weight: 500;
		display: inline-block;
		margin: 0 auto;
		display: block;
		text-align: center;
		width: fit-content;
	}

	.btn-primary {
		background: #2563eb;
		color: white;
	}

	.btn-primary:hover {
		background: #1d4ed8;
	}
</style>
