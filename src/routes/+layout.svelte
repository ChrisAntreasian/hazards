<script lang="ts">
	import '../app.css';
	// import { invalidate } from '$app/navigation';
	// import { onMount } from 'svelte';
	// import { page } from '$app/stores';
	// import { createSupabaseLoadClient } from '$lib/supabase.js';

	let { children, data } = $props();
	
	// Temporarily disable Supabase auth until Week 2
	// let { session } = $state(data);
	// const supabase = createSupabaseLoadClient();
	let session = null;

	// onMount(() => {
	// 	const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
	// 		if (_session?.expires_at !== session?.expires_at) {
	// 			invalidate('supabase:auth');
	// 		}
	// 	});

	// 	return () => subscription.unsubscribe();
	// });

	// $effect(() => {
	// 	session = data.session;
	// });
</script>

<div class="app">
	<header>
		<nav class="navbar">
			<div class="nav-brand">
				<a href="/">🚨 Hazards</a>
			</div>
			<div class="nav-links">
				{#if session}
					<a href="/dashboard">Dashboard</a>
					<a href="/profile">Profile</a>
					<button onclick={() => console.log('Sign out - to be implemented')}>Sign Out</button>
				{:else}
					<a href="/auth/login">Login</a>
					<a href="/auth/register">Register</a>
				{/if}
			</div>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<p>&copy; 2025 Hazards App - Keep safe outdoors</p>
	</footer>
</div>

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.navbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		background: #2563eb;
		color: white;
	}

	.nav-brand a {
		font-size: 1.5rem;
		font-weight: bold;
		text-decoration: none;
		color: white;
	}

	.nav-links {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.nav-links a,
	.nav-links button {
		color: white;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		border: none;
		background: transparent;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.nav-links a:hover,
	.nav-links button:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	main {
		flex: 1;
		padding: 2rem;
		width: 100%;
		max-width: none; /* Full width for map */
		margin: 0;
		box-sizing: border-box;
	}

	footer {
		text-align: center;
		padding: 1rem;
		background: #f8fafc;
		color: #64748b;
	}

	@media (max-width: 768px) {
		.navbar {
			padding: 1rem;
		}
		
		.nav-links {
			gap: 0.5rem;
		}
		
		.nav-links a,
		.nav-links button {
			padding: 0.5rem;
			font-size: 0.9rem;
		}
		
		main {
			padding: 1rem;
		}
	}
</style>
