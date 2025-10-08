<!-- Admin page redirect -->
<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  onMount(() => {
    goto("/admin/users", { replaceState: true });
  });
</script>

<div>
  <p>Redirecting...</p>
</div>
