<script lang="ts">
  /**
   * Markdown renderer component with syntax highlighting support
   * Renders markdown content with proper HTML escaping and styling
   */
  import { marked } from "marked";
  import DOMPurify from "isomorphic-dompurify";

  interface Props {
    content: string;
    className?: string;
  }

  let { content, className = "" }: Props = $props();

  let renderedHtml = $state("");

  // Configure marked options
  marked.setOptions({
    breaks: true, // Convert \n to <br>
    gfm: true, // GitHub Flavored Markdown
  });

  $effect(() => {
    // Render and sanitize markdown whenever content changes
    if (content) {
      const rawHtml = marked(content) as string;
      renderedHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "p",
          "a",
          "ul",
          "ol",
          "li",
          "strong",
          "em",
          "code",
          "pre",
          "blockquote",
          "img",
          "br",
          "hr",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
        ],
        ALLOWED_ATTR: ["href", "title", "alt", "src", "id", "class"],
      });
    }
  });
</script>

<div class="markdown-content {className}">
  {@html renderedHtml}
</div>

<style>
  :global(.markdown-content) {
    font-size: 1rem;
    line-height: 1.7;
    color: var(--color-text-primary, #1a1a1a);
  }

  :global(.markdown-content h1) {
    font-size: 2rem;
    font-weight: 700;
    margin: 2rem 0 1rem;
    color: var(--color-text-heading, #000);
  }

  :global(.markdown-content h2) {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 1.5rem 0 0.75rem;
    color: var(--color-text-heading, #000);
    border-bottom: 2px solid var(--color-border, #e5e7eb);
    padding-bottom: 0.5rem;
  }

  :global(.markdown-content h3) {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 1.25rem 0 0.5rem;
    color: var(--color-text-heading, #000);
  }

  :global(.markdown-content h4),
  :global(.markdown-content h5),
  :global(.markdown-content h6) {
    font-size: 1rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem;
    color: var(--color-text-heading, #000);
  }

  :global(.markdown-content p) {
    margin: 0.75rem 0;
  }

  :global(.markdown-content a) {
    color: var(--color-link, #2563eb);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s;
  }

  :global(.markdown-content a:hover) {
    border-bottom-color: var(--color-link, #2563eb);
  }

  :global(.markdown-content ul),
  :global(.markdown-content ol) {
    margin: 0.75rem 0;
    padding-left: 2rem;
  }

  :global(.markdown-content li) {
    margin: 0.25rem 0;
  }

  :global(.markdown-content ul li) {
    list-style-type: disc;
  }

  :global(.markdown-content ol li) {
    list-style-type: decimal;
  }

  :global(.markdown-content strong) {
    font-weight: 600;
    color: var(--color-text-emphasis, #000);
  }

  :global(.markdown-content em) {
    font-style: italic;
  }

  :global(.markdown-content code) {
    background-color: var(--color-bg-code, #f3f4f6);
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    font-family: "Courier New", monospace;
    font-size: 0.9em;
    color: var(--color-text-code, #d63384);
  }

  :global(.markdown-content pre) {
    background-color: var(--color-bg-code-block, #1e293b);
    color: var(--color-text-code-block, #e2e8f0);
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1rem 0;
  }

  :global(.markdown-content pre code) {
    background-color: transparent;
    padding: 0;
    color: inherit;
    font-size: 0.875rem;
  }

  :global(.markdown-content blockquote) {
    border-left: 4px solid var(--color-border-emphasis, #3b82f6);
    padding-left: 1rem;
    margin: 1rem 0;
    color: var(--color-text-secondary, #6b7280);
    font-style: italic;
  }

  :global(.markdown-content img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1rem 0;
  }

  :global(.markdown-content hr) {
    border: none;
    border-top: 2px solid var(--color-border, #e5e7eb);
    margin: 2rem 0;
  }

  :global(.markdown-content table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0;
  }

  :global(.markdown-content th),
  :global(.markdown-content td) {
    padding: 0.75rem;
    border: 1px solid var(--color-border, #e5e7eb);
    text-align: left;
  }

  :global(.markdown-content th) {
    background-color: var(--color-bg-table-header, #f9fafb);
    font-weight: 600;
  }

  :global(.markdown-content tbody tr:hover) {
    background-color: var(--color-bg-table-row-hover, #f9fafb);
  }
</style>
