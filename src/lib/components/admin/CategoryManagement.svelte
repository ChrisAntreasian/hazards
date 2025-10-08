<script lang="ts">
  import { onMount } from "svelte";
  import type {
    CategoryTreeNode,
    AdminCategoryData,
    CategoryFormData,
  } from "$lib/types/admin.js";

  let categories: CategoryTreeNode[] = [];
  let isLoading = false;
  let error: string | null = null;
  let selectedCategory: CategoryTreeNode | null = null;
  let isEditing = false;
  let showCreateForm = false;
  let showIconPicker = false;

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
  ];

  // Form data
  let formData: CategoryFormData = {
    name: "",
    parent_id: "",
    icon: "",
  };

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

      console.log("Saving category:", method, payload);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      console.log("Save response status:", response.status);
      const result = await response.json();
      console.log("Save response data:", result);

      if (result.success) {
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
      console.log("Deleting category with ID:", categoryId);
      const response = await fetch(`/api/admin/categories?id=${categoryId}`, {
        method: "DELETE",
        credentials: "include",
      });

      console.log("Delete response status:", response.status);
      const result = await response.json();
      console.log("Delete response data:", result);

      if (result.success) {
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
    formData = {
      name: category.name,
      parent_id: category.parent_id || "",
      icon: category.icon || "",
    };
    isEditing = true;
    showCreateForm = true;
  }

  function resetForm() {
    formData = {
      name: "",
      parent_id: "",
      icon: "",
    };
    selectedCategory = null;
    isEditing = false;
    showCreateForm = false;
    showIconPicker = false;
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

  // Get flattened categories for display (reactive)
  $: flatCategories = getFlattenedForDisplay(categories);

  function selectIcon(icon: string) {
    formData.icon = icon;
    showIconPicker = false;
  }

  function clearIcon() {
    formData.icon = "";
    showIconPicker = false;
  }
</script>

<div class="category-management">
  <div class="header">
    <h2>Category Management</h2>
    <button
      class="btn btn-primary"
      onclick={() => {
        formData = {
          name: "",
          parent_id: "",
          icon: "",
        };
        selectedCategory = null;
        isEditing = false;
        showCreateForm = true;
        showIconPicker = false;
      }}
      disabled={isLoading}
    >
      Create Category
    </button>
  </div>

  {#if error}
    <div class="alert alert-error">
      {error}
      <button onclick={() => (error = null)} class="alert-close">×</button>
    </div>
  {/if}

  <!-- Implementation Status Alert -->
  <div class="alert alert-info">
    <div class="alert-content">
      <strong>⚠️ Implementation Status:</strong>
      <ul class="implementation-list">
        <li>✅ Category CRUD operations implemented</li>
        <li>✅ Hierarchical category structure</li>
        <li>⚠️ Drag & drop reordering needs frontend implementation</li>
        <li>⚠️ Category usage statistics display needed</li>
        <li>⚠️ Bulk category operations need implementation</li>
      </ul>
    </div>
  </div>

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
              style="margin-left: {category.level * 1.5}rem"
            >
              <div class="category-content">
                <div class="category-info">
                  {#if category.icon}
                    <span class="category-icon">{category.icon}</span>
                  {/if}
                  <span class="category-name">{category.name}</span>
                </div>
                <div class="category-actions">
                  <button
                    class="btn-icon"
                    title="Edit category"
                    onclick={() => editCategory(category)}
                  >
                    ✏️
                  </button>
                  <button
                    class="btn-icon"
                    title="Delete category"
                    onclick={() => deleteCategory(category.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Form Panel -->
    {#if showCreateForm}
      <div class="form-panel">
        <h3>{isEditing ? "Edit Category" : "Create New Category"}</h3>

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
                placeholder="Choose an icon below or type emoji"
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
                    onclick={clearIcon}
                  >
                    Clear
                  </button>
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
            <small>Use emoji or icon class name</small>
          </div>

          <div class="form-actions">
            <button type="button" onclick={resetForm} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
          </div>
        </form>
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
    grid-template-columns: 1fr 400px;
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

  .form-panel {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    height: fit-content;
    position: sticky;
    top: 2rem;
  }

  .form-panel h3 {
    margin: 0 0 1.5rem 0;
    color: #1f2937;
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
  .form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
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
    transition: all 0.2s;
  }

  .icon-picker-toggle:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .icon-picker {
    margin-top: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    padding: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    max-height: 250px;
    overflow-y: auto;
  }

  .icon-picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .icon-picker-header span {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .clear-icon-btn {
    background: none;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-icon-btn:hover {
    background: #f9fafb;
    color: #374151;
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(2.5rem, 1fr));
    gap: 0.25rem;
  }

  .icon-option {
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .icon-option:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
    transform: scale(1.1);
  }

  .icon-option.selected {
    background: #dbeafe;
    border-color: #3b82f6;
    color: #1d4ed8;
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
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .form-actions button[type="button"] {
    background: white;
    color: #6b7280;
  }

  .form-actions button[type="button"]:hover {
    background: #f9fafb;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid #d1d5db;
    background: white;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-block;
  }

  .btn:hover {
    background: #f9fafb;
  }

  .btn-primary {
    background: #3b82f6 !important;
    color: white !important;
    border-color: #3b82f6 !important;
  }

  .btn-primary:hover {
    background: #2563eb !important;
    border-color: #2563eb !important;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #6b7280;
  }

  .tree-container {
    max-height: 500px;
    overflow-y: auto;
  }

  .category-item {
    margin: 0.5rem 0;
  }

  .category-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .category-content:hover {
    background: #f3f4f6;
  }

  .category-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .category-icon {
    font-size: 1.25rem;
  }

  .category-name {
    font-weight: 500;
    color: #1f2937;
  }

  .category-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
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

  .alert {
    padding: 1rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border: 1px solid;
  }

  .alert-error {
    background: #fef2f2;
    border-color: #fecaca;
    color: #dc2626;
  }

  .alert-info {
    background: #fefbf3;
    border-color: #fed7aa;
    color: #d97706;
  }

  .alert-content {
    flex: 1;
  }

  .implementation-list {
    margin: 0.5rem 0 0 0;
    padding-left: 1.25rem;
  }

  .implementation-list li {
    margin-bottom: 0.25rem;
    font-size: 0.875rem;
  }

  .alert-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.25rem;
    opacity: 0.7;
    padding: 0;
    margin-left: 1rem;
  }

  .alert-close:hover {
    opacity: 1;
  }

  @media (max-width: 768px) {
    .content-grid {
      grid-template-columns: 1fr;
    }

    .form-panel {
      position: static;
    }

    .header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
  }
</style>
