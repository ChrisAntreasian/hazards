<script lang="ts"></script>
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

<div class="container mx-auto max-w-md p-4">
  <h1 class="text-2xl font-bold mb-4">Supabase Connection Test</h1>
  
  <div class="space-y-4">
    <div>
      <strong>Connected:</strong> 
      <span class={data.connected ? "text-green-600" : "text-red-600"}>
        {data.connected ? "✅ Yes" : "❌ No"}
      </span>
    </div>
    
    {#if data.user}
      <div>
        <strong>Current User:</strong> 
        <span class="text-blue-600">{data.user}</span>
      </div>
    {/if}
    
    {#if data.error}
      <div>
        <strong>Error:</strong> 
        <span class="text-red-600">{data.error}</span>
      </div>
    {/if}
  </div>
  
  <div class="mt-6">
    <a href="/auth/log-in" class="text-blue-600 hover:text-blue-800">← Back to Login</a>
  </div>
</div>
