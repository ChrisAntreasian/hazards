<!--
 * @fileoverview Optimized image component with lazy loading, responsive sizing, and srcset
 * Improves performance by deferring image loading until needed and serving appropriate sizes
 *
 * @component OptimizedImage
 * @author HazardTracker Development Team
 * @version 2.0.0
-->

<script lang="ts">
  interface Props {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    loading?: "lazy" | "eager";
    class?: string;
    placeholder?: string;
    /** Enable responsive srcset generation for Supabase storage images */
    responsive?: boolean;
    /** Available widths for srcset (pixels) */
    sizes?: number[];
    /** CSS sizes attribute for responsive images */
    sizesAttr?: string;
  }

  let {
    src,
    alt,
    width,
    height,
    loading = "lazy",
    class: className = "",
    placeholder = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5Mb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg==",
    responsive = true,
    sizes = [320, 640, 960, 1200],
    sizesAttr = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  }: Props = $props();

  let imageElement = $state<HTMLImageElement>();
  let loaded = $state(false);
  let error = $state(false);
  let observer = $state<IntersectionObserver | null>(null);

  /**
   * Generate srcset for Supabase storage images
   * Supabase supports image transforms via query params
   */
  function generateSrcset(originalSrc: string, widths: number[]): string {
    // Check if this is a Supabase storage URL
    if (!originalSrc.includes('supabase.co/storage')) {
      return '';
    }

    return widths
      .map(w => {
        // Add width transform parameter
        const separator = originalSrc.includes('?') ? '&' : '?';
        const transformedUrl = `${originalSrc}${separator}width=${w}`;
        return `${transformedUrl} ${w}w`;
      })
      .join(', ');
  }

  // Generate srcset if responsive is enabled
  const srcset = $derived(responsive ? generateSrcset(src, sizes) : '');

  $effect(() => {
    if (
      loading === "lazy" &&
      "IntersectionObserver" in window &&
      imageElement
    ) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && imageElement) {
              imageElement.src = src;
              if (srcset) {
                imageElement.srcset = srcset;
              }
              observer?.unobserve(imageElement);
            }
          });
        },
        { rootMargin: "100px" } // Increased to 100px for earlier loading
      );

      observer.observe(imageElement);

      return () => {
        observer?.disconnect();
      };
    }
  });

  function handleLoad() {
    loaded = true;
  }

  function handleError() {
    error = true;
  }
</script><div
  class="image-container {className}"
  style="width: {width ? `${width}px` : '100%'}; height: {height ? `${height}px` : 'auto'};"
>
  <img
    bind:this={imageElement}
    src={loading === "eager" ? src : placeholder}
    srcset={loading === "eager" && srcset ? srcset : undefined}
    sizes={loading === "eager" && srcset ? sizesAttr : undefined}
    {alt}
    {width}
    {height}
    class:loaded
    class:error
    onload={handleLoad}
    onerror={handleError}
    {loading}
    decoding="async"
    fetchpriority={loading === "eager" ? "high" : "low"}
  />

  {#if !loaded && !error}
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
  {/if}

  {#if error}
    <div class="error-overlay">
      <p>Failed to load image</p>
    </div>
  {/if}
</div>

<style>
  .image-container {
    position: relative;
    display: inline-block;
    overflow: hidden;
    background: var(--color-bg-muted, #f3f4f6);
    border-radius: 6px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 0.3s ease, filter 0.3s ease;
    opacity: 0;
    filter: blur(10px);
  }

  img.loaded {
    opacity: 1;
    filter: blur(0);
  }

  img.error {
    opacity: 0.5;
    filter: grayscale(100%);
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-muted, #f3f4f6);
    transition: opacity 0.3s ease;
  }

  .image-container:has(img.loaded) .loading-overlay {
    opacity: 0;
    pointer-events: none;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--color-border, #e5e7eb);
    border-top: 2px solid var(--color-primary, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--error-50, #fef2f2);
    color: var(--color-error, #dc2626);
    font-size: 0.875rem;
    text-align: center;
  }

  /* Aspect ratio support for lazy loaded images */
  .image-container[data-aspect] {
    aspect-ratio: attr(data-aspect);
  }
</style>
