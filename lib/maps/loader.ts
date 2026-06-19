import { GOOGLE_MAPS_API_KEY } from "@/lib/config";

/**
 * Singleton loader for the Google Maps JavaScript API using the modern
 * `importLibrary` bootstrap (loading=async). Call {@link loadGoogleMaps} once
 * (it dedupes), then pull the libraries you need:
 *
 *   await loadGoogleMaps();
 *   const { Map } = await google.maps.importLibrary("maps");
 *   const places = await google.maps.importLibrary("places");
 *
 * Loads nothing on the server and rejects clearly when the key is missing, so
 * callers can degrade to manual address entry.
 */

declare global {
  interface Window {
    __onGoogleMapsReady?: () => void;
  }
}

let promise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if (promise) return promise;

  promise = new Promise<void>((resolve, reject) => {
    // Already bootstrapped (e.g. another picker mounted earlier).
    if (
      typeof google !== "undefined" &&
      typeof google.maps?.importLibrary === "function"
    ) {
      resolve();
      return;
    }
    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));
      return;
    }

    window.__onGoogleMapsReady = () => resolve();

    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      v: "weekly",
      loading: "async",
      callback: "__onGoogleMapsReady",
      language: "en",
      region: "BD",
    });

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      promise = null; // allow a later retry
      reject(new Error("Failed to load the Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return promise;
}
