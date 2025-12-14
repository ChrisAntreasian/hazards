/**
 * Svelte context for sharing map instance with child components
 */

import { getContext, setContext } from "svelte";
import type { MapContext } from "./types";

/**
 * Context key for map instance
 */
const MAP_CONTEXT_KEY = Symbol("map-context");

/**
 * Set map context for child components
 */
export function setMapContext(context: MapContext): void {
  setContext(MAP_CONTEXT_KEY, context);
}

/**
 * Get map context from parent BaseMap component
 * Throws error if not inside a BaseMap component
 */
export function getMapContext(): MapContext {
  const context = getContext<MapContext>(MAP_CONTEXT_KEY);

  if (!context) {
    throw new Error(
      "Map context not found. Component must be used inside a <BaseMap> component."
    );
  }

  return context;
}

/**
 * Try to get map context, returns null if not available
 */
export function tryGetMapContext(): MapContext | null {
  try {
    return getContext<MapContext>(MAP_CONTEXT_KEY);
  } catch {
    return null;
  }
}
