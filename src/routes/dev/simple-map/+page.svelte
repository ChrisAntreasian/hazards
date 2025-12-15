<script lang="ts">
  import { onMount } from "svelte";

  let mapElement: HTMLDivElement;

  onMount(async () => {
    console.log("Simple map test starting");

    // Load Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Wait for CSS
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Load Leaflet JS
    const L = await import("leaflet");

    console.log("Creating simple map");
    const map = L.map(mapElement).setView([51.505, -0.09], 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    console.log("Simple map created");
  });
</script>

<svelte:head>
  <title>Simple Map Test</title>
</svelte:head>

<h1>Simple Map Test</h1>

<div
  bind:this={mapElement}
  style="height: 400px; width: 100%; background: #ccc;"
></div>

<style>
  div {
    margin: 1rem;
  }
</style>
