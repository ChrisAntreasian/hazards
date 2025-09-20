<script lang="ts">
  import { enhance } from "$app/forms";
  import type { PageData, ActionData } from "./$types";

  interface Props {
    data: PageData;
    form?: ActionData;
  }

  let { data, form }: Props = $props();

  let loading = $state({ testEmail: false, checkConfig: false });
  let testEmail = $state("");
</script>

<svelte:head>
  <title>Email Debug Tool - Hazards App</title>
</svelte:head>

<div class="max-w-2xl mx-auto p-6">
  <h1 class="text-2xl font-bold mb-6">Email Debug Tool</h1>

  {#if data.error}
    <div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <p class="text-red-800">{data.error}</p>
    </div>
  {:else}
    <div class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
      <h2 class="font-semibold text-blue-900 mb-2">Environment Info:</h2>
      <ul class="text-sm text-blue-800">
        <li>Environment: {data.environment}</li>
        <li>Origin: {data.url}</li>
      </ul>
    </div>

    <!-- Configuration Check -->
    <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Configuration Check</h2>

      <form
        method="POST"
        action="?/checkConfig"
        use:enhance={() => {
          loading.checkConfig = true;
          return async ({ update }) => {
            loading.checkConfig = false;
            await update();
          };
        }}
      >
        <button
          type="submit"
          disabled={loading.checkConfig}
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading.checkConfig ? "Checking..." : "Check Supabase Config"}
        </button>
      </form>

      {#if form?.config}
        <div class="mt-4 bg-gray-50 p-4 rounded">
          <h3 class="font-medium mb-2">Configuration Results:</h3>
          <pre class="text-xs overflow-x-auto">{JSON.stringify(
              form.config,
              null,
              2
            )}</pre>
        </div>
      {/if}
    </div>

    <!-- Email Test -->
    <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Test Password Reset Email</h2>

      <form
        method="POST"
        action="?/testEmail"
        use:enhance={() => {
          loading.testEmail = true;
          return async ({ update }) => {
            loading.testEmail = false;
            await update();
          };
        }}
      >
        <div class="mb-4">
          <label
            for="testEmail"
            class="block text-sm font-medium text-gray-700 mb-2"
          >
            Test Email Address:
          </label>
          <input
            id="testEmail"
            name="testEmail"
            type="email"
            required
            bind:value={testEmail}
            placeholder="test@example.com"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading.testEmail}
          class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading.testEmail ? "Sending..." : "Send Test Email"}
        </button>
      </form>

      {#if form?.success === true}
        <div class="mt-4 bg-green-50 border border-green-200 rounded p-4">
          <h3 class="font-medium text-green-900 mb-2">✅ Success!</h3>
          <p class="text-green-800 mb-2">{form.message}</p>
          {#if form.details}
            <details class="text-xs">
              <summary class="cursor-pointer font-medium">View Details</summary>
              <pre class="mt-2 overflow-x-auto">{JSON.stringify(
                  form.details,
                  null,
                  2
                )}</pre>
            </details>
          {/if}
        </div>
      {:else if form?.success === false}
        <div class="mt-4 bg-red-50 border border-red-200 rounded p-4">
          <h3 class="font-medium text-red-900 mb-2">❌ Error</h3>
          <p class="text-red-800 mb-2">{form.error}</p>
          {#if form.details}
            <details class="text-xs">
              <summary class="cursor-pointer font-medium">View Details</summary>
              <pre class="mt-2 overflow-x-auto">{JSON.stringify(
                  form.details,
                  null,
                  2
                )}</pre>
            </details>
          {/if}
        </div>
      {:else if form?.error}
        <div class="mt-4 bg-red-50 border border-red-200 rounded p-4">
          <h3 class="font-medium text-red-900 mb-2">❌ Error</h3>
          <p class="text-red-800">{form.error}</p>
        </div>
      {/if}
    </div>

    <!-- Debugging Tips -->
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h2 class="text-lg font-semibold mb-4">Debugging Tips</h2>
      <ul class="space-y-2 text-sm">
        <li>• Check your Supabase project's Authentication settings</li>
        <li>• Verify that your site URL is configured correctly in Supabase</li>
        <li>• Ensure email templates are enabled in your Supabase project</li>
        <li>• Check that your domain is not on any email blacklists</li>
        <li>• For production, verify your SMTP settings in Supabase</li>
        <li>• Check the browser network tab when testing</li>
      </ul>
    </div>
  {/if}
</div>

<style>
  details pre {
    background: #f8f9fa;
    padding: 0.5rem;
    border-radius: 0.25rem;
  }
</style>
