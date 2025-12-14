/**
 * Utility functions for map components
 */

import type { Location, GeocodingResult } from "./types";

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Calculate distance between two points (Haversine formula)
 * Returns distance in meters
 */
export function calculateDistance(
  point1: Location,
  point2: Location
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get user's current location using Geolocation API
 */
export async function getCurrentLocation(): Promise<Location> {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

/**
 * Geocode an address using Nominatim (OpenStreetMap)
 */
export async function geocodeAddress(
  address: string,
  countryCode: string = "us"
): Promise<GeocodingResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?` +
    `q=${encodeURIComponent(address)}&` +
    `format=json&` +
    `limit=5&` +
    `countrycodes=${countryCode}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Geocoding service unavailable");
  }

  const data = await response.json();

  return data.map((result: any) => ({
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    displayName: result.display_name,
    boundingBox: result.boundingbox
      ? [
          parseFloat(result.boundingbox[0]),
          parseFloat(result.boundingbox[1]),
          parseFloat(result.boundingbox[2]),
          parseFloat(result.boundingbox[3]),
        ]
      : undefined,
  }));
}

/**
 * Validate GeoJSON Polygon structure
 */
export function isValidPolygon(geojson: any): geojson is GeoJSON.Polygon {
  return (
    geojson &&
    geojson.type === "Polygon" &&
    Array.isArray(geojson.coordinates) &&
    geojson.coordinates.length > 0 &&
    Array.isArray(geojson.coordinates[0]) &&
    geojson.coordinates[0].length >= 4
  );
}

/**
 * Create a Leaflet DivIcon with custom HTML
 */
export function createDivIcon(
  leaflet: typeof import("leaflet"),
  html: string,
  className: string = "",
  iconSize: [number, number] = [24, 24]
): any {
  return leaflet.divIcon({
    className: className,
    html: html,
    iconSize: iconSize,
    iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
  });
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkCondition = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error("Timeout waiting for condition"));
      } else {
        setTimeout(checkCondition, interval);
      }
    };

    checkCondition();
  });
}
