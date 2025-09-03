<script lang="ts">
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
</script>

<div class="container mx-auto max-w-2xl p-4">
  <h1 class="text-2xl font-bold mb-4">Password Reset Link Test</h1>

  <div class="space-y-4">
    <div>
      <h2 class="text-lg font-semibold">Current URL:</h2>
      <code class="text-sm bg-gray-100 p-2 rounded block"
        >{data.originalUrl}</code
      >
    </div>

    <div>
      <h2 class="text-lg font-semibold">Test Callback URL:</h2>
      <code class="text-sm bg-gray-100 p-2 rounded block break-all"
        >{data.testCallbackUrl}</code
      >
    </div>

    <div>
      <h2 class="text-lg font-semibold">Expected Parameters:</h2>
      <ul class="space-y-1">
        {#each Object.entries(data.parameters) as [key, value]}
          <li><strong>{key}:</strong> {value}</li>
        {/each}
      </ul>
    </div>

    <div class="space-y-2">
      <h2 class="text-lg font-semibold">Test Links:</h2>
      <a
        href={data.testCallbackUrl}
        class="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Test Password Reset Callback
      </a>

      <br />

      <a
        href="/auth/forgot-password"
        class="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Go to Forgot Password
      </a>
    </div>
  </div>
</div>
