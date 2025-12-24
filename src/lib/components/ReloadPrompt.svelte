<script lang="ts">
  import { onMount } from "svelte";

  let needRefresh = $state(false);
  let offlineReady = $state(false);
  let registration: ServiceWorkerRegistration | undefined;

  onMount(async () => {
    if (typeof window === "undefined") return;

    try {
      // @ts-ignore - virtual:pwa-register is a Vite virtual module only available at runtime
      const { registerSW } = await import("virtual:pwa-register");

      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          needRefresh = true;
        },
        onOfflineReady() {
          offlineReady = true;
          // Auto-hide offline ready message after 3 seconds
          setTimeout(() => {
            offlineReady = false;
          }, 3000);
        },
        onRegisteredSW(
          swUrl: string,
          r: ServiceWorkerRegistration | undefined
        ) {
          registration = r;
          // Check for updates periodically (every hour)
          if (r) {
            setInterval(
              () => {
                r.update();
              },
              60 * 60 * 1000
            );
          }
        },
      });

      // Store updateSW function for later use
      (window as any).__pwa_updateSW = updateSW;
    } catch (e) {
      console.log("PWA registration failed:", e);
    }
  });

  function updateApp() {
    const updateSW = (window as any).__pwa_updateSW;
    if (updateSW) {
      updateSW(true);
    }
  }

  function dismissOfflineReady() {
    offlineReady = false;
  }
</script>

{#if needRefresh}
  <div class="pwa-toast update-toast" role="alert">
    <div class="pwa-message">
      <span class="pwa-icon"></span>
      <span>New version available!</span>
    </div>
    <button onclick={updateApp} class="pwa-button primary"> Update Now </button>
  </div>
{/if}

{#if offlineReady}
  <div class="pwa-toast offline-toast" role="status">
    <div class="pwa-message">
      <span class="pwa-icon"></span>
      <span>App ready for offline use</span>
    </div>
    <button
      onclick={dismissOfflineReady}
      class="pwa-button dismiss"
      aria-label="Dismiss offline ready notification"
    >
      ✕
    </button>
  </div>
{/if}

<style>
  .pwa-toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .pwa-message {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #1f2937;
  }

  .pwa-icon {
    font-size: 18px;
  }

  .pwa-button {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  }

  .pwa-button.primary {
    background: #3b82f6;
    color: white;
  }

  .pwa-button.primary:hover {
    background: #2563eb;
  }

  .pwa-button.dismiss {
    background: transparent;
    color: #6b7280;
    font-size: 20px;
    padding: 4px 8px;
  }

  .pwa-button.dismiss:hover {
    color: #1f2937;
  }

  .update-toast {
    border-left: 4px solid #3b82f6;
  }

  .offline-toast {
    border-left: 4px solid #10b981;
  }

  @media (max-width: 480px) {
    .pwa-toast {
      left: 20px;
      right: 20px;
      bottom: 80px; /* Above mobile nav if present */
    }
  }
</style>
