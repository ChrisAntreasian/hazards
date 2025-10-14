<script lang="ts">
  import LazyLoad from "$lib/components/LazyLoad.svelte";
  
  const loadUserManagement = () => import("$lib/components/admin/UserManagement.svelte");
</script>

<svelte:head>
  <title>User Management - Admin Panel</title>
</svelte:head>

<LazyLoad 
  loader={loadUserManagement} 
  loadingText="Loading user management panel..."
/>
