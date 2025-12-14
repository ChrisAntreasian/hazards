<script lang="ts">
  import ComingSoon from "./ComingSoon.svelte";
  import { marked } from "marked";
  import DOMPurify from "dompurify";
  import { browser } from "$app/environment";

  interface SectionData {
    sectionId: string;
    sectionTitle: string;
    content: string | null;
    isUniversal: boolean;
    isRequired: boolean;
    isPlaceholder: boolean;
  }

  interface Props {
    section: SectionData;
  }

  let { section }: Props = $props();

  // Render markdown safely
  function renderMarkdown(content: string): string {
    if (!browser) return content;
    const html = marked(content) as string;
    return DOMPurify.sanitize(html);
  }

  // Determine if we should show content or placeholder
  const shouldShowContent = $derived(
    section.content &&
      !section.isPlaceholder &&
      section.content.trim().length > 0
  );

  // Show all sections - universal ones always, and required ones with Coming Soon
  // This helps users understand what content will be available
  const shouldShowSection = $derived(
    section.isUniversal || section.isRequired || shouldShowContent
  );
</script>

{#if shouldShowSection}
  <section class="content-section" id={section.sectionId}>
    <h2>{section.sectionTitle}</h2>

    {#if shouldShowContent && section.content}
      <div class="markdown-content">
        {@html renderMarkdown(section.content)}
      </div>
    {:else}
      <ComingSoon
        message="This section is being developed. Check back soon for detailed information."
      />
    {/if}
  </section>
{/if}

<style>
  .content-section {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .content-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 1rem 0;
  }

  .markdown-content {
    color: #374151;
    line-height: 1.7;
  }

  .markdown-content :global(h1),
  .markdown-content :global(h2),
  .markdown-content :global(h3) {
    color: #1e293b;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .markdown-content :global(h1) {
    font-size: 1.75rem;
  }

  .markdown-content :global(h2) {
    font-size: 1.25rem;
  }

  .markdown-content :global(h3) {
    font-size: 1.125rem;
  }

  .markdown-content :global(p) {
    margin-bottom: 1rem;
  }

  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }

  .markdown-content :global(li) {
    margin-bottom: 0.5rem;
  }

  .markdown-content :global(strong) {
    font-weight: 600;
    color: #1e293b;
  }

  .markdown-content :global(a) {
    color: #2563eb;
    text-decoration: underline;
  }

  .markdown-content :global(a:hover) {
    color: #1d4ed8;
  }

  .markdown-content :global(blockquote) {
    border-left: 4px solid #3b82f6;
    padding-left: 1rem;
    margin: 1rem 0;
    color: #64748b;
    font-style: italic;
  }

  .markdown-content :global(code) {
    background: #f1f5f9;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-size: 0.875em;
  }

  .markdown-content :global(pre) {
    background: #1e293b;
    color: #e2e8f0;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1rem 0;
  }

  .markdown-content :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .markdown-content :global(hr) {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 1.5rem 0;
  }

  .markdown-content :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1rem 0;
  }

  .markdown-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }

  .markdown-content :global(th),
  .markdown-content :global(td) {
    border: 1px solid #e2e8f0;
    padding: 0.75rem;
    text-align: left;
  }

  .markdown-content :global(th) {
    background: #f8fafc;
    font-weight: 600;
  }
</style>
