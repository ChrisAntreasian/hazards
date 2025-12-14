<script lang="ts">
  import type { PageData } from './$types';
  import { 
    Breadcrumbs, 
    ContentHeader, 
    NavigationGrid, 
    DangerBadge,
    SectionRenderer,
    SiblingHazards,
    ComingSoon
  } from '$lib/components/learn';
  import { buildBreadcrumbs, type CategoryInfo } from '$lib/utils/learn-navigation';

  let { data }: { data: PageData } = $props();

  // Category color mapping
  const categoryColors: Record<string, string> = {
    plants: 'from-green-500 to-emerald-600',
    insects: 'from-amber-500 to-orange-600',
    animals: 'from-red-500 to-rose-600',
    terrain: 'from-slate-500 to-gray-600',
    weather: 'from-blue-500 to-cyan-600',
    ice: 'from-cyan-400 to-blue-500',
    other: 'from-purple-500 to-indigo-600'
  };

  // Get root category for color
  const rootCategory = $derived(
    data.pageType === 'category' 
      ? (data.parentChain.length > 0 ? data.parentChain[0].path : data.category.path)
      : (data.parentChain.length > 0 ? data.parentChain[0].path : data.category.path)
  );

  const headerColor = $derived(categoryColors[rootCategory] || 'from-blue-500 to-indigo-600');

  // Build breadcrumbs
  const currentTitle = $derived(
    data.pageType === 'category' ? data.category.name : data.template.name
  );

  const breadcrumbChain = $derived(
    data.pageType === 'category' 
      ? [...data.parentChain, data.category]
      : data.parentChain
  );

  const breadcrumbs = $derived(
    buildBreadcrumbs(
      data.segments,
      breadcrumbChain as CategoryInfo[],
      currentTitle,
      true
    )
  );

  // For template pages, get base path for sibling links
  const siblingBasePath = $derived(
    data.pageType === 'template' 
      ? '/learn/' + data.segments.slice(0, -1).join('/')
      : ''
  );
</script>

<svelte:head>
  {#if data.pageType === 'category'}
    <title>{data.category.name} - Learning Center</title>
    <meta name="description" content={data.category.description || `Learn about ${data.category.name} hazards`} />
  {:else}
    <title>{data.template.name} - Learning Center</title>
    <meta name="description" content={data.template.short_description || `Learn about ${data.template.name}`} />
  {/if}
</svelte:head>

<div class="learn-page">
  <Breadcrumbs items={breadcrumbs} />

  {#if data.pageType === 'category'}
    <!-- Category Page -->
    <ContentHeader 
      icon={data.category.icon}
      title={data.category.name}
      description={data.category.description}
      shortDescription={data.category.short_description}
      color={headerColor}
    />

    {#if data.children.length > 0}
      <section class="section">
        <h2>Subcategories</h2>
        <NavigationGrid 
          items={data.children}
          basePath={`/learn/${data.category.path}`}
          type="category"
          emptyMessage="No subcategories available."
        />
      </section>
    {/if}

    {#if data.templates.length > 0}
      <section class="section">
        <h2>Hazard Guides</h2>
        <NavigationGrid 
          items={data.templates}
          basePath={`/learn/${data.category.path}`}
          type="template"
          emptyMessage="No hazard guides available yet."
        />
      </section>
    {/if}

    {#if data.children.length === 0 && data.templates.length === 0}
      <ComingSoon 
        title="Content Coming Soon"
        message="Educational content for this category is being developed. Check back soon!"
      />
    {/if}

  {:else}
    <!-- Template/Hazard Page -->
    <div class="template-header">
      <ContentHeader 
        icon={data.category.icon}
        title={data.template.name}
        description={data.template.short_description}
        color={headerColor}
      />
      
      {#if data.template.danger_level}
        <div class="danger-info">
          <DangerBadge 
            level={data.template.danger_level} 
            size="large" 
            showLabel={true}
            showDescription={true}
          />
        </div>
      {/if}

      {#if data.template.scientific_name}
        <p class="scientific-name">
          <em>{data.template.scientific_name}</em>
        </p>
      {/if}
    </div>

    <div class="content-sections">
      {#each data.sections as section}
        <SectionRenderer {section} />
      {/each}
    </div>

    <SiblingHazards 
      siblings={data.siblings}
      currentSlug={data.template.slug}
      basePath={siblingBasePath}
      title="Related Hazards in {data.category.name}"
    />
  {/if}
</div>

<style>
  .learn-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 1rem 2rem 3rem;
  }

  .section {
    margin-bottom: 3rem;
  }

  .section h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 1.5rem 0;
  }

  .template-header {
    margin-bottom: 2rem;
  }

  .danger-info {
    margin: 1rem 0;
  }

  .scientific-name {
    color: #64748b;
    font-size: 1.125rem;
    margin: 0.5rem 0 0 0;
  }

  .content-sections {
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  @media (max-width: 768px) {
    .learn-page {
      padding: 1rem;
    }

    .content-sections {
      padding: 1rem;
    }
  }
</style>
