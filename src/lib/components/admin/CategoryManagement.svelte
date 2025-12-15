<script lang="ts">
  import { onMount } from "svelte";
  import type {
    CategoryTreeNode,
    AdminCategoryData,
    CategoryFormData,
    CategorySectionConfig,
  } from "$lib/types/admin.js";

  let categories: CategoryTreeNode[] = $state([]);
  let isLoading = $state(false);
  let error: string | null = $state(null);
  let successMessage: string | null = $state(null);
  let selectedCategory: CategoryTreeNode | null = $state(null);
  let isEditing = $state(false);
  let showCreateForm = $state(false);
  let showIconPicker = $state(false);
  let activeTab: "details" | "sections" = $state("details");

  // Section management
  let sections: CategorySectionConfig[] = $state([]);
  let loadingSections = $state(false);

  // Common icons for hazard categories
  const iconOptions = [
    "🚧",
    "⚠️",
    "🔥",
    "🌪️",
    "⛈️",
    "🌊",
    "🏔️",
    "🐻",
    "🐛",
    "🐍",
    "🕷️",
    "🦂",
    "🐨",
    "🦌",
    "🐺",
    "🦅",
    "🦆",
    "🐸",
    "🦎",
    "🐢",
    "🌲",
    "🌿",
    "🍄",
    "🌺",
    "🌵",
    "❄️",
    "🧊",
    "☀️",
    "🌙",
    "⭐",
    "💨",
    "🌫️",
    "☁️",
    "🌈",
    "⚡",
    "🔴",
    "🟠",
    "🟡",
    "🟢",
    "🔵",
    "🟣",
    "⚫",
    "⚪",
    "🔶",
    "🔷",
    "📍",
    "🚨",
    "⛔",
    "🚫",
    "☢️",
    "🐝",
    "☠️",
  ];

  // Form data
  let formData: CategoryFormData = $state({
    name: "",
    slug: "",
    parent_id: "",
    icon: "",
    description: "",
    short_description: "",
  });

  // Auto-generate slug from name
  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);
  }

  // Watch name changes to auto-generate slug when creating
  $effect(() => {
    if (!isEditing && formData.name && !formData.slug) {
      formData.slug = generateSlug(formData.name);
    }
  });

  // Load categories on mount
  onMount(async () => {
    await loadCategories();
  });

  async function loadCategories() {
    isLoading = true;
    error = null;

    try {
      const response = await fetch("/api/admin/categories");
      const result = await response.json();

      if (result.success) {
        categories = result.data || [];
      } else {
        error = result.error || "Failed to load categories";
      }
    } catch (err) {
      error = "Network error loading categories";
      console.error("Error loading categories:", err);
    } finally {
      isLoading = false;
    }
  }

  async function loadSections(categoryId: string) {
    loadingSections = true;
    try {
      const response = await fetch(
        `/api/admin/categories/sections?category_id=${categoryId}`
      );
      const result = await response.json();
      if (result.success) {
        sections = result.data || [];
      }
    } catch (err) {
      console.error("Error loading sections:", err);
    } finally {
      loadingSections = false;
    }
  }

  async function toggleSectionRequired(section: CategorySectionConfig) {
    try {
      const response = await fetch("/api/admin/categories/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: section.id,
          is_required: !section.is_required,
        }),
      });
      const result = await response.json();
      if (result.success && selectedCategory) {
        await loadSections(selectedCategory.id);
        successMessage = `Section "${section.section_title}" ${!section.is_required ? "enabled" : "disabled"}`;
        setTimeout(() => (successMessage = null), 3000);
      } else {
        error = result.error || "Failed to update section";
      }
    } catch (err) {
      error = "Network error updating section";
    }
  }

  async function saveCategory(event: SubmitEvent) {
    event.preventDefault();
    if (!formData.name.trim()) {
      error = "Category name is required";
      return;
    }

    isLoading = true;
    error = null;

    try {
      const url = "/api/admin/categories";
      const method = isEditing ? "PUT" : "POST";

      const payload =
        isEditing && selectedCategory
          ? { id: selectedCategory.id, ...formData }
          : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const result = await response.json();

      if (result.success) {
        successMessage = isEditing
          ? "Category updated successfully"
          : "Category created successfully";
        setTimeout(() => (successMessage = null), 3000);
        await loadCategories();
        resetForm();
      } else {
        error = result.error || "Failed to save category";
      }
    } catch (err) {
      error = "Network error saving category";
      console.error("Error saving category:", err);
    } finally {
      isLoading = false;
    }
  }

  async function deleteCategory(categoryId: string) {
    if (
      !confirm(
        "Are you sure you want to delete this category? This action cannot be undone."
      )
    ) {
      return;
    }

    isLoading = true;
    error = null;

    try {
      const response = await fetch(`/api/admin/categories?id=${categoryId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (result.success) {
        successMessage = "Category deleted successfully";
        setTimeout(() => (successMessage = null), 3000);
        await loadCategories();
        if (selectedCategory?.id === categoryId) {
          selectedCategory = null;
        }
      } else {
        error = result.error || "Failed to delete category";
      }
    } catch (err) {
      error = "Network error deleting category";
      console.error("Error deleting category:", err);
    } finally {
      isLoading = false;
    }
  }

  function editCategory(category: CategoryTreeNode) {
    selectedCategory = category;
    const pathStr =
      typeof category.path === "string"
        ? category.path
        : category.path.join("/");
    const slugFromPath = pathStr.includes("/")
      ? pathStr.split("/").pop() || ""
      : pathStr;

    formData = {
      name: category.name,
      slug: category.slug || slugFromPath,
      parent_id: category.parent_id || "",
      icon: category.icon || "",
      description: category.description || "",
      short_description: category.short_description || "",
    };
    isEditing = true;
    showCreateForm = true;
    activeTab = "details";

    // Load sections for this category
    loadSections(category.id);
  }

  function resetForm() {
    formData = {
      name: "",
      slug: "",
      parent_id: "",
      icon: "",
      description: "",
      short_description: "",
    };
    selectedCategory = null;
    isEditing = false;
    showCreateForm = false;
    showIconPicker = false;
    activeTab = "details";
    sections = [];
  }

  // Get flattened categories for parent selection
  function getFlatCategories(
    nodes: CategoryTreeNode[],
    excluded?: string
  ): CategoryTreeNode[] {
    let result: CategoryTreeNode[] = [];
    for (const node of nodes) {
      if (node.id !== excluded) {
        result.push(node);
        result.push(...getFlatCategories(node.children, excluded));
      }
    }
    return result;
  }

  // Get flattened categories for display
  function getFlattenedForDisplay(
    nodes: CategoryTreeNode[]
  ): CategoryTreeNode[] {
    let result: CategoryTreeNode[] = [];
    for (const node of nodes) {
      result.push(node);
      result.push(...getFlattenedForDisplay(node.children));
    }
    return result;
  }

  let flatCategories = $derived(getFlattenedForDisplay(categories));

  function selectIcon(icon: string) {
    formData.icon = icon;
    showIconPicker = false;
  }

  function clearIcon() {
    formData.icon = "";
    showIconPicker = false;
  }

  function getStatusBadge(status?: string) {
    switch (status) {
      case "active":
        return { class: "badge-active", text: "Active" };
      case "pending":
        return { class: "badge-pending", text: "Pending" };
      case "archived":
        return { class: "badge-archived", text: "Archived" };
      default:
        return { class: "badge-active", text: "Active" };
    }
  }
</script>

<div class="category-management">
  <div class="header">
    <h2>Category Management</h2>
    <button
      class="btn btn-primary"
      onclick={() => {
        resetForm();
        showCreateForm = true;
      }}
      disabled={isLoading}
    >
      + Create Category
    </button>
  </div>

  {#if error}
    <div class="alert alert-error">
      {error}
      <button onclick={() => (error = null)} class="alert-close">×</button>
    </div>
  {/if}

  {#if successMessage}
    <div class="alert alert-success">
      {successMessage}
    </div>
  {/if}

  <div class="content-grid">
    <!-- Category Tree -->
    <div class="category-tree">
      <h3>Category Hierarchy</h3>

      {#if isLoading && flatCategories.length === 0}
        <div class="loading">Loading categories...</div>
      {:else if flatCategories.length === 0}
        <div class="empty-state">
          <p>No categories found. Create your first category to get started.</p>
        </div>
      {:else}
        <div class="tree-container">
          {#each flatCategories as category}
            <div
              class="category-item"
              class:selected={selectedCategory?.id === category.id}
              style="margin-left: {category.level * 1.5}rem"
            >
              <button
                type="button"
                class="category-content"
                onclick={() => editCategory(category)}
              >
                <div class="category-info">
                  {#if category.icon}
                    <span class="category-icon">{category.icon}</span>
                  {/if}
                  <div class="category-text">
                    <span class="category-name">{category.name}</span>
                    <span class="category-path"
                      >{typeof category.path === "string"
                        ? category.path
                        : category.path.join("/")}</span
                    >
                  </div>
                  <span class="badge {getStatusBadge(category.status).class}">
                    {getStatusBadge(category.status).text}
                  </span>
                </div>
              </button>
              <div class="category-actions">
                <button
                  class="btn-icon"
                  title="Edit category"
                  onclick={() => editCategory(category)}
                >
                  ✏️
                </button>
                <button
                  class="btn-icon btn-danger"
                  title="Delete category"
                  onclick={() => deleteCategory(category.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Form Panel -->
    {#if showCreateForm}
      <div class="form-panel">
        <div class="panel-header">
          <h3>{isEditing ? "Edit Category" : "Create New Category"}</h3>
          <button class="btn-close" onclick={resetForm}>×</button>
        </div>

        {#if isEditing}
          <div class="tabs">
            <button
              class="tab"
              class:active={activeTab === "details"}
              onclick={() => (activeTab = "details")}
            >
              Details
            </button>
            <button
              class="tab"
              class:active={activeTab === "sections"}
              onclick={() => (activeTab = "sections")}
            >
              Sections
            </button>
          </div>
        {/if}

        {#if activeTab === "details"}
          <form onsubmit={saveCategory}>
            <div class="form-group">
              <label for="name">Category Name *</label>
              <input
                type="text"
                id="name"
                bind:value={formData.name}
                placeholder="Enter category name"
                required
                disabled={isLoading}
              />
            </div>

            <div class="form-group">
              <label for="slug">URL Slug</label>
              <input
                type="text"
                id="slug"
                bind:value={formData.slug}
                placeholder="auto-generated-from-name"
                disabled={isLoading}
              />
              <small>Used in URLs. Leave blank to auto-generate.</small>
            </div>

            <div class="form-group">
              <label for="parent">Parent Category</label>
              <select
                id="parent"
                bind:value={formData.parent_id}
                disabled={isLoading}
              >
                <option value="">Root Level</option>
                {#each getFlatCategories(categories, selectedCategory?.id) as parentOption}
                  <option value={parentOption.id}>
                    {"  ".repeat(parentOption.level)}{parentOption.name}
                  </option>
                {/each}
              </select>
            </div>

            <div class="form-group">
              <label for="icon">Icon</label>
              <div class="icon-input-group">
                <input
                  type="text"
                  id="icon"
                  bind:value={formData.icon}
                  placeholder="Choose an icon"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  class="icon-picker-toggle"
                  onclick={() => (showIconPicker = !showIconPicker)}
                  disabled={isLoading}
                >
                  {formData.icon || "🎨"}
                </button>
              </div>
              {#if showIconPicker}
                <div class="icon-picker">
                  <div class="icon-picker-header">
                    <span>Choose an icon:</span>
                    <button
                      type="button"
                      class="clear-icon-btn"
                      onclick={clearIcon}>Clear</button
                    >
                  </div>
                  <div class="icon-grid">
                    {#each iconOptions as icon}
                      <button
                        type="button"
                        class="icon-option"
                        class:selected={formData.icon === icon}
                        onclick={() => selectIcon(icon)}
                      >
                        {icon}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>

            <div class="form-group">
              <label for="short_description">Short Description</label>
              <input
                type="text"
                id="short_description"
                bind:value={formData.short_description}
                placeholder="Brief description for cards"
                maxlength="150"
                disabled={isLoading}
              />
              <small>{formData.short_description.length}/150 characters</small>
            </div>

            <div class="form-group">
              <label for="description">Full Description</label>
              <textarea
                id="description"
                bind:value={formData.description}
                placeholder="Detailed description of this category"
                rows="4"
                disabled={isLoading}
              ></textarea>
            </div>

            <div class="form-actions">
              <button type="button" onclick={resetForm} disabled={isLoading}
                >Cancel</button
              >
              <button
                type="submit"
                class="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : isEditing ? "Update" : "Create"}
              </button>
            </div>
          </form>
        {:else if activeTab === "sections"}
          <div class="sections-panel">
            <p class="sections-info">
              Configure which content sections appear for hazards in this
              category. Universal sections (Overview, Description) apply to all
              categories.
            </p>

            {#if loadingSections}
              <div class="loading">Loading sections...</div>
            {:else if sections.length === 0}
              <div class="empty-state">
                <p>No sections configured for this category.</p>
              </div>
            {:else}
              <div class="sections-list">
                {#each sections as section}
                  <div
                    class="section-item"
                    class:universal={section.is_universal}
                  >
                    <div class="section-info">
                      <span class="section-title">{section.section_title}</span>
                      <span class="section-id">({section.section_id})</span>
                      {#if section.is_universal}
                        <span class="badge badge-universal">Universal</span>
                      {/if}
                    </div>
                    <div class="section-controls">
                      <label class="toggle">
                        <input
                          type="checkbox"
                          checked={section.is_required}
                          onchange={() => toggleSectionRequired(section)}
                          disabled={section.is_universal}
                        />
                        <span class="toggle-slider"></span>
                      </label>
                      <span class="toggle-label">
                        {section.is_required ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .category-management {
    padding: 0;
    max-width: none;
    margin: 0;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .header h2 {
    color: #1f2937;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr 450px;
    gap: 2rem;
    min-height: 600px;
  }

  .category-tree {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
  }

  .category-tree h3 {
    margin-top: 0;
    color: #1f2937;
  }

  .tree-container {
    max-height: 600px;
    overflow-y: auto;
  }

  .category-item {
    margin: 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .category-item.selected .category-content {
    background: #eff6ff;
    border-color: #3b82f6;
  }

  .category-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    transition: all 0.2s;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }

  .category-content:hover {
    background: #f3f4f6;
  }

  .category-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .category-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .category-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .category-name {
    font-weight: 500;
    color: #1f2937;
  }

  .category-path {
    font-size: 0.75rem;
    color: #9ca3af;
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .category-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .btn-icon {
    background: none;
    border: none;
    padding: 0.25rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-icon:hover {
    background: #e5e7eb;
  }

  .btn-icon.btn-danger:hover {
    background: #fee2e2;
  }

  .form-panel {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    height: fit-content;
    position: sticky;
    top: 2rem;
    max-height: calc(100vh - 150px);
    overflow-y: auto;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .panel-header h3 {
    margin: 0;
    color: #1f2937;
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    line-height: 1;
  }

  .btn-close:hover {
    color: #1f2937;
  }

  .tabs {
    display: flex;
    gap: 0;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .tab {
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    cursor: pointer;
    color: #6b7280;
    font-weight: 500;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }

  .tab:hover {
    color: #1f2937;
  }

  .tab.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .form-group textarea {
    resize: vertical;
  }

  .form-group small {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .icon-input-group {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .icon-input-group input {
    flex: 1;
  }

  .icon-picker-toggle {
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 1.25rem;
    min-width: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-picker {
    margin-top: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    padding: 1rem;
    max-height: 200px;
    overflow-y: auto;
  }

  .icon-picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .clear-icon-btn {
    background: none;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(2.25rem, 1fr));
    gap: 0.25rem;
  }

  .icon-option {
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 1.125rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-option:hover {
    background: #f3f4f6;
    transform: scale(1.1);
  }

  .icon-option.selected {
    background: #dbeafe;
    border-color: #3b82f6;
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1.5rem;
  }

  .form-actions button {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
  }

  .form-actions button[type="button"] {
    background: white;
    color: #6b7280;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid #d1d5db;
    background: white;
    cursor: pointer;
  }

  .btn-primary {
    background: #3b82f6 !important;
    color: white !important;
    border-color: #3b82f6 !important;
  }

  .btn-primary:hover {
    background: #2563eb !important;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .badge {
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .badge-active {
    background: #d1fae5;
    color: #065f46;
  }

  .badge-pending {
    background: #fef3c7;
    color: #92400e;
  }

  .badge-archived {
    background: #f3f4f6;
    color: #6b7280;
  }

  .badge-universal {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .alert {
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .alert-error {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
  }

  .alert-success {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #16a34a;
  }

  .alert-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.25rem;
    padding: 0;
  }

  .loading,
  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  /* Sections Panel */
  .sections-panel {
    padding-top: 0.5rem;
  }

  .sections-info {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .sections-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }

  .section-item.universal {
    background: #f0f9ff;
    border-color: #bae6fd;
  }

  .section-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .section-title {
    font-weight: 500;
    color: #1f2937;
  }

  .section-id {
    font-size: 0.75rem;
    color: #9ca3af;
    font-family: monospace;
  }

  .section-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #d1d5db;
    border-radius: 22px;
    transition: 0.3s;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: 0.3s;
  }

  .toggle input:checked + .toggle-slider {
    background-color: #3b82f6;
  }

  .toggle input:checked + .toggle-slider:before {
    transform: translateX(18px);
  }

  .toggle input:disabled + .toggle-slider {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-label {
    font-size: 0.75rem;
    color: #6b7280;
    min-width: 50px;
  }

  @media (max-width: 1024px) {
    .content-grid {
      grid-template-columns: 1fr;
    }

    .form-panel {
      position: static;
      max-height: none;
    }
  }
</style>
