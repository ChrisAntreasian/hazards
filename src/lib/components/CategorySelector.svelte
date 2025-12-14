<script lang="ts" module>
  export interface CategorySuggestion {
    name: string;
    path: string;
    parentId: string | null;
    description: string;
    icon: string;
    suggestionId?: string;
    provisionalCategoryId?: string;
  }
</script>

<script lang="ts">
  import type { HazardCategory } from "$lib/types/database";

  interface Props {
    /** Current categories */
    categories: HazardCategory[];
    /** Selected category ID */
    selectedCategoryId: string | null;
    /** Callback when category is changed */
    onCategoryChange: (categoryId: string | null) => void;
    /** Callback when user suggests a new category */
    onCategorySuggested?: (suggestion: CategorySuggestion) => void;
    /** User's trust score for showing provisional creation option */
    userTrustScore?: number;
    /** Whether the component is disabled */
    disabled?: boolean;
  }

  let {
    categories,
    selectedCategoryId = null,
    onCategoryChange,
    onCategorySuggested,
    userTrustScore = 0,
    disabled = false,
  }: Props = $props();

  // Track if user wants to suggest a new category
  let showSuggestionForm = $state(false);
  let submittingSuggestion = $state(false);
  let suggestionError = $state("");

  // Suggestion form data
  let suggestionData = $state({
    name: "",
    parentId: null as string | null,
    description: "",
    icon: "📌",
  });

  // Common emoji icons for categories
  const commonIcons = [
    "📌",
    "⚠️",
    "🔴",
    "🌿",
    "🐛",
    "🐻",
    "🏔️",
    "⛈️",
    "💀",
    "🦠",
    "🔥",
    "💧",
    "⚡",
    "🌊",
    "❄️",
    "🌪️",
  ];

  // Get root categories for parent selection
  const rootCategories = $derived(categories.filter((c) => c.level === 0));

  // Check if user can create provisional categories
  const canCreateProvisional = $derived(userTrustScore >= 500);

  // Handle category selection
  function handleSelect(e: Event) {
    const target = e.target as HTMLSelectElement;
    const value = target.value;

    if (value === "__suggest__") {
      showSuggestionForm = true;
      // Reset to "Other" category temporarily
      const otherCategory = categories.find(
        (c) => c.path === "other" || c.path === "other/uncategorized"
      );
      if (otherCategory) {
        onCategoryChange(otherCategory.id);
      }
    } else {
      showSuggestionForm = false;
      onCategoryChange(value || null);
    }
  }

  // Generate path from name
  function generatePath(name: string, parentId: string | null): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (parentId) {
      const parent = categories.find((c) => c.id === parentId);
      return parent ? `${parent.path}/${slug}` : slug;
    }
    return slug;
  }

  // Handle suggestion submission
  async function handleSubmitSuggestion() {
    if (!suggestionData.name.trim()) {
      suggestionError = "Please enter a category name";
      return;
    }

    suggestionError = "";
    submittingSuggestion = true;

    try {
      const response = await fetch("/api/categories/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suggestionData.name.trim(),
          path: generatePath(suggestionData.name, suggestionData.parentId),
          parent_id: suggestionData.parentId,
          icon: suggestionData.icon,
          description: suggestionData.description.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit suggestion");
      }

      // Build suggestion result
      const suggestion: CategorySuggestion = {
        name: suggestionData.name.trim(),
        path: generatePath(suggestionData.name, suggestionData.parentId),
        parentId: suggestionData.parentId,
        description: suggestionData.description.trim(),
        icon: suggestionData.icon,
        suggestionId: result.suggestion?.id,
        provisionalCategoryId: result.category?.id,
      };

      // Call the callback
      onCategorySuggested?.(suggestion);

      // Reset form but keep it visible to show success
      showSuggestionForm = false;
      suggestionData = {
        name: "",
        parentId: null,
        description: "",
        icon: "📌",
      };
    } catch (err) {
      suggestionError =
        err instanceof Error ? err.message : "Failed to submit suggestion";
    } finally {
      submittingSuggestion = false;
    }
  }

  // Cancel suggestion
  function handleCancel() {
    showSuggestionForm = false;
    suggestionError = "";
    suggestionData = {
      name: "",
      parentId: null,
      description: "",
      icon: "📌",
    };
  }
</script>

<div class="category-selector">
  <select
    id="category"
    name="category_id"
    value={selectedCategoryId}
    onchange={handleSelect}
    required
    {disabled}
  >
    <option value=""
      >Select a category... ({categories.length} available)</option
    >

    <!-- Level 0 categories (main categories) -->
    {#each categories.filter((cat) => cat.level === 0) as mainCategory (mainCategory.id)}
      <option value={mainCategory.id}>
        {mainCategory.icon}
        {mainCategory.name}
      </option>

      <!-- Level 1 subcategories -->
      {#each categories.filter((cat) => cat.level === 1 && cat.path.startsWith(mainCategory.path + "/")) as subCategory (subCategory.id)}
        <option value={subCategory.id}>
          &nbsp;&nbsp;↳ {subCategory.icon}
          {subCategory.name}
        </option>

        <!-- Level 2 sub-subcategories -->
        {#each categories.filter((cat) => cat.level === 2 && cat.path.startsWith(subCategory.path + "/")) as subSubCategory (subSubCategory.id)}
          <option value={subSubCategory.id}>
            &nbsp;&nbsp;&nbsp;&nbsp;↳ {subSubCategory.icon}
            {subSubCategory.name}
          </option>
        {/each}
      {/each}
    {/each}

    <!-- Suggest new category option -->
    <option disabled>──────────────</option>
    <option value="__suggest__">➕ Suggest a New Category...</option>
  </select>

  <!-- Category suggestion form -->
  {#if showSuggestionForm}
    <div class="suggestion-form">
      <div class="suggestion-header">
        <h4>Suggest a New Category</h4>
        <p class="suggestion-note">
          Can't find the right category? Suggest a new one and we'll review it.
          {#if canCreateProvisional}
            <strong
              >As a trusted user, your category will be available immediately
              for provisional use.</strong
            >
          {/if}
        </p>
      </div>

      <div class="suggestion-fields">
        <div class="field-row">
          <div class="field icon-field">
            <label for="suggestion-icon">Icon</label>
            <div class="icon-picker">
              {#each commonIcons as icon (icon)}
                <button
                  type="button"
                  class="icon-option"
                  class:selected={suggestionData.icon === icon}
                  onclick={() => (suggestionData.icon = icon)}
                >
                  {icon}
                </button>
              {/each}
            </div>
          </div>

          <div class="field name-field">
            <label for="suggestion-name">Category Name *</label>
            <input
              id="suggestion-name"
              type="text"
              bind:value={suggestionData.name}
              placeholder="e.g., Venomous Snakes"
              maxlength="100"
            />
          </div>
        </div>

        <div class="field">
          <label for="suggestion-parent">Parent Category</label>
          <select id="suggestion-parent" bind:value={suggestionData.parentId}>
            <option value={null}>Root level (new main category)</option>
            {#each rootCategories as category (category.id)}
              <option value={category.id}>
                {category.icon} Under {category.name}
              </option>
            {/each}
          </select>
        </div>

        <div class="field">
          <label for="suggestion-description">Description (optional)</label>
          <textarea
            id="suggestion-description"
            bind:value={suggestionData.description}
            placeholder="Brief description of what this category includes and why it's needed..."
            rows="3"
          ></textarea>
        </div>
      </div>

      {#if suggestionError}
        <div class="suggestion-error">
          ⚠️ {suggestionError}
        </div>
      {/if}

      <div class="suggestion-actions">
        <button
          type="button"
          class="btn btn-secondary"
          onclick={handleCancel}
          disabled={submittingSuggestion}
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary"
          onclick={handleSubmitSuggestion}
          disabled={submittingSuggestion}
        >
          {#if submittingSuggestion}
            Submitting...
          {:else if canCreateProvisional}
            Create Provisional Category
          {:else}
            Submit Suggestion
          {/if}
        </button>
      </div>

      <p class="info-text">
        {#if canCreateProvisional}
          ✅ Your trust score ({userTrustScore}) allows you to create
          provisional categories. The category will be available immediately but
          will be reviewed by moderators.
        {:else}
          ℹ️ Your suggestion will be reviewed by moderators. Your hazard will be
          filed under "Other" until the category is approved. Build trust to
          unlock provisional category creation!
        {/if}
      </p>
    </div>
  {/if}
</div>

<style>
  .category-selector {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-weight: 600;
    color: #374151;
  }

  select {
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    background: white;
    cursor: pointer;
  }

  select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .suggestion-form {
    margin-top: 1rem;
    padding: 1.5rem;
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
  }

  .suggestion-header {
    margin-bottom: 1.5rem;
  }

  .suggestion-header h4 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    color: #1f2937;
  }

  .suggestion-note {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .suggestion-note strong {
    color: #059669;
  }

  .suggestion-fields {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .field label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .field input,
  .field select,
  .field textarea {
    padding: 0.625rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9375rem;
  }

  .field input:focus,
  .field select:focus,
  .field textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .icon-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .icon-option {
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .icon-option:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .icon-option.selected {
    border-color: #3b82f6;
    background: #dbeafe;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .suggestion-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn {
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-secondary {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover {
    background: #f3f4f6;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .info-text {
    margin: 1rem 0 0;
    padding: 0.75rem;
    background: #eff6ff;
    border-radius: 6px;
    font-size: 0.8125rem;
    color: #1e40af;
    line-height: 1.5;
  }

  .suggestion-error {
    margin-top: 1rem;
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #dc2626;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .field-row {
      grid-template-columns: 1fr;
    }

    .suggestion-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
