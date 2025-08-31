<script lang="ts">
  // Simple test page to verify routing is working
  console.log('Test login page loaded successfully');
</script>

<svelte:head>
  <title>Test Login - Hazards App</title>
</svelte:head>

<div style="padding: 2rem; text-align: center; background: #f0f9ff; min-height: 80vh;">
  <h1 style="color: #1e293b; margin-bottom: 1rem;">🔍 Login Test Page</h1>
  <p style="color: #64748b; font-size: 1.1rem; margin-bottom: 2rem;">
    This is a test to verify the login route is working correctly.
  </p>
  
  <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto;">
    <h2 style="color: #059669; margin-bottom: 1rem;">✅ Route Working!</h2>
    <p>If you can see this page, the login route is functioning properly.</p>
    <p><strong>Current Time:</strong> {new Date().toLocaleString()}</p>
    <p><strong>Page URL:</strong> /auth/login</p>
    
    <div style="margin-top: 2rem;">
      <a href="/auth/login" style="background: #2563eb; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; margin-right: 1rem;">
        Reload This Page
      </a>
      <a href="/" style="background: #f3f4f6; color: #374151; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none;">
        Go Home
      </a>
    </div>
  </div>
  
  <div style="margin-top: 2rem; padding: 1rem; background: #fff3cd; border-radius: 6px; max-width: 500px; margin: 2rem auto 0;">
    <h3 style="color: #856404; margin-bottom: 0.5rem;">Troubleshooting Steps:</h3>
    <ol style="text-align: left; color: #856404;">
      <li>Try hard refresh (Ctrl+Shift+R)</li>
      <li>Clear browser cache</li>
      <li>Open in incognito/private mode</li>
      <li>Check browser console for errors</li>
    </ol>
  </div>
</div>
