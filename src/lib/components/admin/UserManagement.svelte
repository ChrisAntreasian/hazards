<script lang="ts">
  import { onMount } from "svelte";
  import { invalidate } from "$app/navigation";
  import { formatRelativeTime, formatTrustScore } from "$lib/utils/helpers.js";
  import type {
    AdminUserData,
    UserRole,
    PaginatedResponse,
  } from "$lib/types/admin.js";

  let users: AdminUserData[] = [];
  let isLoading = false;
  let error: string | null = null;
  let selectedUser: AdminUserData | null = null;
  let showEditModal = false;
  let showBanModal = false;

  // Pagination and filtering
  let currentPage = 1;
  let totalPages = 1;
  let totalUsers = 0;
  let pageSize = 25;
  let searchQuery = "";
  let roleFilter: UserRole | "all" = "all";
  let sortBy = "created_at";
  let sortOrder: "asc" | "desc" = "desc";

  // Form data
  let editForm = {
    role: "user" as UserRole,
    trust_score: 0,
    is_active: true,
    reason: "",
  };

  let banReason = "";

  const roleOptions: {
    value: UserRole | "all";
    label: string;
    color: string;
  }[] = [
    { value: "all", label: "All Roles", color: "#6b7280" },
    { value: "admin", label: "Administrator", color: "#dc2626" },
    { value: "moderator", label: "Moderator", color: "#059669" },
    { value: "content_editor", label: "Content Editor", color: "#8b5cf6" },
    { value: "trusted_user", label: "Trusted User", color: "#3b82f6" },
    { value: "contributor", label: "Contributor", color: "#10b981" },
    { value: "new_user", label: "New User", color: "#6b7280" },
    { value: "banned", label: "Banned", color: "#ef4444" },
  ];

  onMount(async () => {
    await loadUsers();
  });

  async function loadUsers() {
    isLoading = true;
    error = null;

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
      });

      if (searchQuery) params.set("search", searchQuery);
      if (roleFilter !== "all") params.set("role", roleFilter);

      const response = await fetch(`/api/admin/users?${params}`);
      const result: PaginatedResponse<AdminUserData> = await response.json();

      if (result.success && result.data) {
        users = result.data;
        totalPages = result.pagination.pages;
        totalUsers = result.pagination.total;
      } else {
        error = result.error || "Failed to load users";
      }
    } catch (err) {
      error = "Network error loading users";
      console.error("Error loading users:", err);
    } finally {
      isLoading = false;
    }
  }

  function handleSearch() {
    currentPage = 1;
    loadUsers();
  }

  function handleRoleFilter() {
    currentPage = 1;
    loadUsers();
  }

  function handleSort(column: string) {
    if (sortBy === column) {
      sortOrder = sortOrder === "asc" ? "desc" : "asc";
    } else {
      sortBy = column;
      sortOrder = "asc";
    }
    loadUsers();
  }

  function openEditModal(user: AdminUserData) {
    selectedUser = user;
    editForm = {
      role: user.role,
      trust_score: user.trust_score,
      is_active: user.is_active,
      reason: "",
    };
    showEditModal = true;
  }

  function openBanModal(user: AdminUserData) {
    selectedUser = user;
    banReason = "";
    showBanModal = true;
  }

  async function saveUserChanges(event: SubmitEvent) {
    event.preventDefault();
    if (!selectedUser) return;

    isLoading = true;
    error = null;

    try {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          ...editForm,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadUsers();
        closeModals();
        // Invalidate dashboard and other pages that show trust score
        await invalidate("trust-score-data");
      } else {
        error = result.error || "Failed to update user";
      }
    } catch (err) {
      error = "Network error updating user";
      console.error("Error updating user:", err);
    } finally {
      isLoading = false;
    }
  }

  async function banUser(event: SubmitEvent) {
    event.preventDefault();
    if (!selectedUser) return;

    isLoading = true;
    error = null;

    try {
      const response = await fetch(
        `/api/admin/users?userId=${selectedUser.id}&reason=${encodeURIComponent(banReason)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        await loadUsers();
        closeModals();
      } else {
        error = result.error || "Failed to ban user";
      }
    } catch (err) {
      error = "Network error banning user";
      console.error("Error banning user:", err);
    } finally {
      isLoading = false;
    }
  }

  function closeModals() {
    showEditModal = false;
    showBanModal = false;
    selectedUser = null;
    editForm = {
      role: "new_user",
      trust_score: 0,
      is_active: true,
      reason: "",
    };
    banReason = "";
  }

  function getRoleColor(role: UserRole): string {
    return roleOptions.find((r) => r.value === role)?.color || "#6b7280";
  }

  function getRoleLabel(role: UserRole): string {
    return roleOptions.find((r) => r.value === role)?.label || role;
  }
</script>

<div class="user-management">
  <div class="header">
    <h2>User Management</h2>
    <div class="header-stats">
      <span class="stat">Total Users: <strong>{totalUsers}</strong></span>
    </div>
  </div>

  {#if error}
    <div class="alert alert-error">
      {error}
      <button onclick={() => (error = null)} class="alert-close">×</button>
    </div>
  {/if}

  <!-- Filters and Search -->
  <div class="filters">
    <div class="search-group">
      <input
        type="text"
        placeholder="Search by name or email..."
        bind:value={searchQuery}
        onkeydown={(e) => e.key === "Enter" && handleSearch()}
      />
      <button onclick={handleSearch} disabled={isLoading}> 🔍 </button>
    </div>

    <div class="filter-group">
      <select
        bind:value={roleFilter}
        onchange={handleRoleFilter}
        disabled={isLoading}
      >
        {#each roleOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>

      <select
        bind:value={pageSize}
        onchange={() => {
          currentPage = 1;
          loadUsers();
        }}
        disabled={isLoading}
      >
        <option value="25">25 per page</option>
        <option value="50">50 per page</option>
        <option value="100">100 per page</option>
      </select>
    </div>
  </div>

  <!-- Users Table -->
  <div class="table-container">
    {#if isLoading && users.length === 0}
      <div class="loading">Loading users...</div>
    {:else if users.length === 0}
      <div class="empty-state">
        <p>No users found matching your criteria.</p>
      </div>
    {:else}
      <table class="users-table">
        <thead>
          <tr>
            <th>
              <button
                class="sort-btn"
                onclick={() => handleSort("display_name")}
              >
                User
                {#if sortBy === "display_name"}
                  <span class="sort-indicator"
                    >{sortOrder === "asc" ? "↑" : "↓"}</span
                  >
                {/if}
              </button>
            </th>
            <th>
              <button class="sort-btn" onclick={() => handleSort("role")}>
                Role
                {#if sortBy === "role"}
                  <span class="sort-indicator"
                    >{sortOrder === "asc" ? "↑" : "↓"}</span
                  >
                {/if}
              </button>
            </th>
            <th>
              <button
                class="sort-btn"
                onclick={() => handleSort("trust_score")}
              >
                Trust Score
                {#if sortBy === "trust_score"}
                  <span class="sort-indicator"
                    >{sortOrder === "asc" ? "↑" : "↓"}</span
                  >
                {/if}
              </button>
            </th>
            <th>Status</th>
            <th>
              <button class="sort-btn" onclick={() => handleSort("created_at")}>
                Joined
                {#if sortBy === "created_at"}
                  <span class="sort-indicator"
                    >{sortOrder === "asc" ? "↑" : "↓"}</span
                  >
                {/if}
              </button>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user}
            <tr
              class:inactive={!user.is_active}
              class:banned={user.role === "banned"}
            >
              <td>
                <div class="user-info">
                  <div class="user-avatar">
                    {#if user.profile?.avatar_url}
                      <img src={user.profile.avatar_url} alt="Avatar" />
                    {:else}
                      <div class="avatar-placeholder">
                        {(user.profile?.display_name || user.email)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    {/if}
                  </div>
                  <div class="user-details">
                    <div class="user-name">
                      {user.profile?.display_name || "Unnamed User"}
                    </div>
                    <div class="user-email">{user.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <span
                  class="role-badge"
                  style="background-color: {getRoleColor(
                    user.role
                  )}20; color: {getRoleColor(user.role)}"
                >
                  {getRoleLabel(user.role)}
                </span>
              </td>
              <td>
                <div class="trust-score">
                  <span class="score-value">{user.trust_score}</span>
                  <span
                    class="score-badge"
                    style="background-color: {formatTrustScore(user.trust_score)
                      .color}20; color: {formatTrustScore(user.trust_score)
                      .color}"
                  >
                    {formatTrustScore(user.trust_score).badge}
                    {formatTrustScore(user.trust_score).label}
                  </span>
                </div>
              </td>
              <td>
                <span
                  class="status-indicator"
                  class:active={user.is_active}
                  class:inactive={!user.is_active}
                >
                  {user.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td>
                <span class="date-text"
                  >{formatRelativeTime(user.created_at)}</span
                >
              </td>
              <td>
                <div class="actions">
                  <button
                    class="btn-icon"
                    title="Edit user"
                    onclick={() => openEditModal(user)}
                    disabled={isLoading}
                  >
                    ✏️
                  </button>
                  {#if user.role !== "banned" && user.is_active}
                    <button
                      class="btn-icon btn-danger"
                      title="Ban user"
                      onclick={() => openBanModal(user)}
                      disabled={isLoading}
                    >
                      🚫
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="pagination">
      <button
        onclick={() => {
          currentPage = Math.max(1, currentPage - 1);
          loadUsers();
        }}
        disabled={currentPage === 1 || isLoading}
      >
        Previous
      </button>

      <span class="page-info">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onclick={() => {
          currentPage = Math.min(totalPages, currentPage + 1);
          loadUsers();
        }}
        disabled={currentPage === totalPages || isLoading}
      >
        Next
      </button>
    </div>
  {/if}
</div>

<!-- Edit User Modal -->
{#if showEditModal && selectedUser}
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={closeModals}
    onkeydown={(e) => e.key === "Escape" && closeModals()}
  >
    <div
      class="modal"
      role="dialog"
      aria-labelledby="edit-user-title"
      tabindex="0"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-header">
        <h3 id="edit-user-title">
          Edit User: {selectedUser.profile?.display_name || selectedUser.email}
        </h3>
        <button onclick={closeModals}>×</button>
      </div>

      <form onsubmit={saveUserChanges} class="modal-form">
        <div class="form-group">
          <label for="user-role">Role</label>
          <select
            id="user-role"
            bind:value={editForm.role}
            disabled={isLoading}
          >
            <option value="user">User</option>
            <option value="trusted_user">Trusted User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        <div class="form-group">
          <label for="trust-score">Trust Score</label>
          <input
            id="trust-score"
            type="number"
            bind:value={editForm.trust_score}
            min="0"
            max="2000"
            disabled={isLoading}
          />
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              bind:checked={editForm.is_active}
              disabled={isLoading}
            />
            Active User
          </label>
        </div>

        <div class="form-group">
          <label for="change-reason">Reason for Changes</label>
          <textarea
            id="change-reason"
            bind:value={editForm.reason}
            placeholder="Optional reason for audit log"
            rows="3"
            disabled={isLoading}
          ></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" onclick={closeModals} disabled={isLoading}>
            Cancel
          </button>
          <button type="submit" class="btn-primary" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Ban User Modal -->
{#if showBanModal && selectedUser}
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={closeModals}
    onkeydown={(e) => e.key === "Escape" && closeModals()}
  >
    <div
      class="modal"
      role="dialog"
      aria-labelledby="ban-user-title"
      tabindex="0"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-header">
        <h3 id="ban-user-title">
          Ban User: {selectedUser.profile?.display_name || selectedUser.email}
        </h3>
        <button onclick={closeModals}>×</button>
      </div>

      <form onsubmit={banUser} class="modal-form">
        <div class="warning">
          <strong>⚠️ Warning:</strong> This action will permanently ban the user
          and deactivate their account.
        </div>

        <div class="form-group">
          <label for="ban-reason">Reason for Ban *</label>
          <textarea
            id="ban-reason"
            bind:value={banReason}
            placeholder="Please provide a reason for banning this user"
            rows="4"
            required
            disabled={isLoading}
          ></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" onclick={closeModals} disabled={isLoading}>
            Cancel
          </button>
          <button
            type="submit"
            class="btn-danger"
            disabled={isLoading || !banReason.trim()}
          >
            {isLoading ? "Banning..." : "Ban User"}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .user-management {
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .header h2 {
    margin: 0;
    color: #1f2937;
    font-size: 1.875rem;
    font-weight: 600;
  }

  .header-stats {
    display: flex;
    gap: 2rem;
  }

  .stat {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .filters {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    gap: 1rem;
  }

  .search-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .search-group input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    min-width: 300px;
  }

  .search-group button {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    cursor: pointer;
  }

  .filter-group {
    display: flex;
    gap: 1rem;
  }

  .filter-group select {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    background: white;
  }

  .table-container {
    background: white;
    border-radius: 0.5rem;
    border: 1px solid #d1d5db;
    overflow: hidden;
  }

  .loading,
  .empty-state {
    padding: 3rem 2rem;
    text-align: center;
    color: #6b7280;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
  }

  .users-table th {
    background: #f9fafb;
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
  }

  .users-table td {
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
  }

  .users-table tr:hover {
    background: #f9fafb;
  }

  .users-table tr.inactive {
    opacity: 0.6;
  }

  .users-table tr.banned {
    background: #fef2f2;
  }

  .sort-btn {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #374151;
  }

  .sort-indicator {
    font-size: 0.75rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
  }

  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    background: #3b82f6;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
  }

  .user-details {
    min-width: 0;
  }

  .user-name {
    font-weight: 500;
    color: #1f2937;
  }

  .user-email {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .role-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .trust-score {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .score-value {
    font-weight: 600;
    color: #1f2937;
  }

  .score-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-indicator {
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .status-indicator.active {
    background: #d1fae5;
    color: #065f46;
  }

  .status-indicator.inactive {
    background: #fef3c7;
    color: #92400e;
  }

  .date-text {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-icon {
    padding: 0.5rem;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: background-color 0.15s ease-in-out;
  }

  .btn-icon:hover {
    background-color: #f3f4f6;
  }

  .btn-icon.btn-danger:hover {
    background-color: #fee2e2;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
  }

  .pagination button {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    cursor: pointer;
  }

  .pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-info {
    color: #6b7280;
    font-size: 0.875rem;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    min-width: 400px;
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h3 {
    margin: 0;
    color: #1f2937;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .modal-header button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
  }

  .modal-form {
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
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
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
    margin: 0;
  }

  .warning {
    background: #fef3c7;
    color: #92400e;
    padding: 1rem;
    border-radius: 0.375rem;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .modal-actions button {
    padding: 0.75rem 1.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .btn-primary {
    background: #3b82f6 !important;
    color: white !important;
    border-color: #3b82f6 !important;
  }

  .btn-danger {
    background: #dc2626 !important;
    color: white !important;
    border-color: #dc2626 !important;
  }

  .alert {
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .alert-error {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .alert-close {
    background: none;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
  }

  @media (max-width: 768px) {
    .filters {
      flex-direction: column;
      align-items: stretch;
    }

    .search-group input {
      min-width: auto;
    }

    .users-table {
      font-size: 0.75rem;
    }

    .modal {
      min-width: auto;
      margin: 1rem;
    }
  }
</style>
