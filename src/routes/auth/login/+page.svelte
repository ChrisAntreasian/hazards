<script lang="ts">
	// Placeholder login page - will be implemented in Week 2
</script>

<svelte:head>
	<title>Login - Hazards App</title>
</svelte:head>

<div class="auth-container">
	<div class="auth-card">
		<h1>Login</h1>
		<p>Authentication will be implemented in Week 2 with Supabase.</p>
		<p>For now, you can explore the public features.</p>
		<a href="/" class="btn btn-primary">Back to Home</a>
	</div>
</div>

<style>
	.auth-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.auth-card {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		text-align: center;
		max-width: 400px;
		width: 100%;
	}

	h1 {
		margin-bottom: 1rem;
		color: #1e293b;
	}

	p {
		color: #64748b;
		margin-bottom: 1rem;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		text-decoration: none;
		font-weight: 500;
		display: inline-block;
		margin-top: 1rem;
	}

	.btn-primary {
		background: #2563eb;
		color: white;
	}

	.btn-primary:hover {
		background: #1d4ed8;
	}
</style>
