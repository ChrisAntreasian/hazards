<script lang="ts">
	import { page } from '$app/state';
</script>

<header>
	<div class="logo">
		<a href="/">
			<span class="logo-icon">⚠️</span>
			<span class="logo-text">HazardTracker</span>
		</a>
	</div>

	<nav>
		<ul>
			<li aria-current={page.url.pathname === '/' ? 'page' : undefined}>
				<a href="/">Home</a>
			</li>
			<li aria-current={page.url.pathname === '/map' ? 'page' : undefined}>
				<a href="/map">🗺️ Map</a>
			</li>
			<li aria-current={page.url.pathname === '/hazards/create' ? 'page' : undefined}>
				<a href="/hazards/create">➕ Report</a>
			</li>
			<li aria-current={page.url.pathname === '/my-reports' ? 'page' : undefined}>
				<a href="/my-reports">📋 My Reports</a>
			</li>
			<li aria-current={page.url.pathname === '/dashboard' ? 'page' : undefined}>
				<a href="/dashboard">📊 Dashboard</a>
			</li>
		</ul>
	</nav>

	<div class="user-menu">
		<a href="/auth/log-in" class="btn btn-outline">Log In</a>
	</div>
</header>

<style>
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		background: white;
		border-bottom: 1px solid #e2e8f0;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.logo a {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: #1976d2;
		font-weight: bold;
		font-size: 1.5rem;
	}

	.logo-icon {
		font-size: 1.8rem;
	}

	.logo-text {
		color: #333;
	}

	nav ul {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
		gap: 0.5rem;
	}

	nav li {
		position: relative;
	}

	nav a {
		display: block;
		padding: 0.5rem 1rem;
		text-decoration: none;
		color: #64748b;
		font-weight: 500;
		border-radius: 6px;
		transition: all 0.2s;
	}

	nav a:hover {
		background: #f1f5f9;
		color: #1976d2;
	}

	li[aria-current='page'] a {
		background: #e3f2fd;
		color: #1976d2;
	}

	.user-menu {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn {
		padding: 0.5rem 1rem;
		border-radius: 6px;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s;
	}

	.btn-outline {
		background: transparent;
		color: #1976d2;
		border: 1px solid #1976d2;
	}

	.btn-outline:hover {
		background: #1976d2;
		color: white;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		header {
			padding: 0.75rem 1rem;
		}

		.logo a {
			font-size: 1.25rem;
		}

		nav ul {
			gap: 0.25rem;
		}

		nav a {
			padding: 0.375rem 0.75rem;
			font-size: 0.9rem;
		}

		.btn {
			padding: 0.375rem 0.75rem;
			font-size: 0.9rem;
		}
	}
</style>
