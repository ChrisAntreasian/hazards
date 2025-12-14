<script lang="ts">
  import { BOSTON_REGION } from "$lib/config";
</script>

<svelte:head>
  <title>Hazards - Stay Safe Outdoors</title>
  <meta
    name="description"
    content="Community-driven outdoor hazard reporting and education platform"
  />
</svelte:head>

<section class="hero">
  <div class="hero-content">
    <h1>Stay Safe Outdoors</h1>
    <p class="hero-subtitle">
      Community-driven hazard reporting and education platform for outdoor
      enthusiasts
    </p>

    <div class="features">
      <div class="feature">
        <div class="feature-icon">🗺️</div>
        <h3>Interactive Map</h3>
        <p>View and report hazards in your area with precise location data</p>
      </div>

      <a href="/learn" class="feature feature-link">
        <div class="feature-icon">📚</div>
        <h3>Educational Content</h3>
        <p>Learn to identify and safely handle various outdoor hazards</p>
      </a>

      <div class="feature">
        <div class="feature-icon">👥</div>
        <h3>Community Verified</h3>
        <p>
          Trust in crowd-sourced information verified by fellow outdoor
          enthusiasts
        </p>
      </div>
    </div>

    <div class="cta-buttons">
      <a href="/hazards/create" class="btn btn-primary">Report a Hazard</a>
      <a href="/map" class="btn btn-secondary">Explore Map</a>
      <a href="/learn" class="btn btn-secondary">📚 Learn About Hazards</a>
    </div>

    <div class="region-info">
      <p>Currently focused on: <strong>{BOSTON_REGION.name}</strong></p>
      <p class="text-sm">More regions coming soon!</p>
    </div>
  </div>
</section>

<style>
  .hero {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    text-align: center;
    padding: 2rem;
  }

  .hero-content {
    max-width: 800px;
  }

  h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #1e293b;
    font-weight: bold;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    color: #64748b;
    margin-bottom: 3rem;
    line-height: 1.6;
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .feature {
    text-align: center;
    padding: 1.5rem;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }

  .feature-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }

  .feature h3 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    color: #1e293b;
  }

  .feature p {
    color: #64748b;
    line-height: 1.5;
  }

  .feature-link {
    text-decoration: none;
    cursor: pointer;
  }

  .feature-link:hover {
    border-color: #3b82f6;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  }

  .cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
    display: inline-block;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: transparent;
    color: #2563eb;
    border: 2px solid #2563eb;
  }

  .btn-secondary:hover {
    background: #2563eb;
    color: white;
    transform: translateY(-1px);
  }

  .region-info {
    color: #64748b;
    font-size: 0.9rem;
  }

  .region-info .text-sm {
    font-size: 0.8rem;
    color: #94a3b8;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }

    .hero-subtitle {
      font-size: 1.1rem;
    }

    .features {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .cta-buttons {
      flex-direction: column;
      align-items: center;
    }

    .btn {
      width: 200px;
    }
  }
</style>
