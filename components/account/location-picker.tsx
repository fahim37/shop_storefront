"use client";

import * as React from "react";
import { Crosshair, Loader2, MapPin, Search, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import {
  GOOGLE_MAPS_MAP_ID,
  MAP_DEFAULT_CENTER,
  MAP_REGION_CODE,
} from "@/lib/config";
import { loadGoogleMaps } from "@/lib/maps/loader";
import {
  buildAddress,
  normalizeClassicComponents,
  normalizeNewComponents,
  type ParsedAddress,
} from "@/lib/maps/address";

export interface LocationPickerProps {
  /** Existing pin (e.g. when editing a saved address). */
  value?: { lat: number; lng: number } | null;
  /** Fired whenever the location resolves (search, drag, map tap, geolocate). */
  onPick: (address: ParsedAddress) => void;
  className?: string;
}

interface Suggestion {
  placeId: string;
  primary: string;
  secondary: string;
  prediction: google.maps.places.PlacePrediction;
}

type Status = "loading" | "ready" | "error";

function latLngOf(
  pos:
    | google.maps.LatLng
    | google.maps.LatLngLiteral
    | google.maps.LatLngAltitude
    | null
    | undefined,
): { lat: number; lng: number } | null {
  if (!pos) return null;
  if (pos instanceof google.maps.LatLng) return { lat: pos.lat(), lng: pos.lng() };
  return { lat: pos.lat, lng: pos.lng };
}

/**
 * Map-backed location picker: type-ahead place search (Places API New) + a
 * draggable pin on an interactive map + "use my location", all reverse-geocoded
 * into editable address fields. Degrades to nothing if Maps fails to load, so
 * the surrounding manual form keeps working.
 */
export function LocationPicker({ value, onPick, className }: LocationPickerProps) {
  const mapBoxRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const markerRef = React.useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  const placesRef = React.useRef<google.maps.PlacesLibrary | null>(null);
  const geocoderRef = React.useRef<google.maps.Geocoder | null>(null);
  const sessionRef =
    React.useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = React.useRef(0);

  const [status, setStatus] = React.useState<Status>("loading");
  const [query, setQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [locating, setLocating] = React.useState(false);

  // Keep the latest onPick reachable from async callbacks without re-binding
  // them; synced in an effect (writing a ref during render is unsafe).
  const onPickRef = React.useRef(onPick);
  React.useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  const newSession = React.useCallback(() => {
    const places = placesRef.current;
    if (places) sessionRef.current = new places.AutocompleteSessionToken();
  }, []);

  const reverseGeocode = React.useCallback(async (lat: number, lng: number) => {
    const geocoder = geocoderRef.current;
    if (!geocoder) {
      onPickRef.current(buildAddress([], { formatted: "", lat, lng }));
      return;
    }
    try {
      const { results } = await geocoder.geocode({ location: { lat, lng } });
      const r = results[0];
      onPickRef.current(
        buildAddress(normalizeClassicComponents(r?.address_components), {
          formatted: r?.formatted_address ?? "",
          lat,
          lng,
        }),
      );
      if (r?.formatted_address) setQuery(r.formatted_address);
    } catch {
      onPickRef.current(buildAddress([], { formatted: "", lat, lng }));
    }
  }, []);

  const placePin = React.useCallback(
    (lat: number, lng: number, reverse: boolean) => {
      const map = mapRef.current;
      const marker = markerRef.current;
      if (!map || !marker) return;
      marker.position = { lat, lng };
      marker.map = map;
      map.panTo({ lat, lng });
      if ((map.getZoom() ?? 0) < 15) map.setZoom(16);
      if (reverse) void reverseGeocode(lat, lng);
    },
    [reverseGeocode],
  );

  // Boot the map once.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps();
        const [maps, places, marker, geocoding] = (await Promise.all([
          google.maps.importLibrary("maps"),
          google.maps.importLibrary("places"),
          google.maps.importLibrary("marker"),
          google.maps.importLibrary("geocoding"),
        ])) as [
          google.maps.MapsLibrary,
          google.maps.PlacesLibrary,
          google.maps.MarkerLibrary,
          google.maps.GeocodingLibrary,
        ];
        if (cancelled || !mapBoxRef.current) return;

        placesRef.current = places;
        geocoderRef.current = new geocoding.Geocoder();

        const hasValue =
          !!value && Number.isFinite(value.lat) && Number.isFinite(value.lng);
        const center = hasValue
          ? { lat: value!.lat, lng: value!.lng }
          : MAP_DEFAULT_CENTER;

        const map = new maps.Map(mapBoxRef.current, {
          center,
          zoom: hasValue ? 16 : 12,
          mapId: GOOGLE_MAPS_MAP_ID,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
        });
        mapRef.current = map;

        const pin = new marker.AdvancedMarkerElement({
          map: hasValue ? map : null,
          position: center,
          gmpDraggable: true,
          title: "Delivery location",
        });
        markerRef.current = pin;

        pin.addListener("dragend", () => {
          const ll = latLngOf(pin.position);
          if (ll) void reverseGeocode(ll.lat, ll.lng);
        });
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          placePin(e.latLng.lat(), e.latLng.lng(), true);
        });

        newSession();
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // Boot once; `value` is only the initial center.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = React.useCallback(async (input: string) => {
    const places = placesRef.current;
    if (!places) return;
    const reqId = ++reqIdRef.current;
    try {
      const { suggestions: raw } =
        await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionRef.current ?? undefined,
          includedRegionCodes: [MAP_REGION_CODE],
          locationBias: mapRef.current?.getBounds() ?? undefined,
        });
      if (reqId !== reqIdRef.current) return; // a newer query won
      const items: Suggestion[] = raw
        .map((s) => s.placePrediction)
        .filter((p): p is google.maps.places.PlacePrediction => !!p)
        .map((p) => ({
          placeId: p.placeId,
          primary: p.mainText?.text ?? p.text.text,
          secondary: p.secondaryText?.text ?? "",
          prediction: p,
        }));
      setSuggestions(items);
      setOpen(items.length > 0);
    } catch {
      /* transient — keep the last suggestions */
    }
  }, []);

  function onInput(v: string) {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => void runSearch(v.trim()), 280);
  }

  async function choose(item: Suggestion) {
    setOpen(false);
    setQuery(item.primary);
    try {
      const place = item.prediction.toPlace();
      await place.fetchFields({
        fields: ["location", "addressComponents", "formattedAddress", "displayName"],
      });
      const ll = latLngOf(place.location);
      if (!ll) return;
      placePin(ll.lat, ll.lng, false);
      onPickRef.current(
        buildAddress(normalizeNewComponents(place.addressComponents), {
          formatted: place.formattedAddress ?? "",
          lat: ll.lat,
          lng: ll.lng,
          displayName: place.displayName ?? undefined,
        }),
      );
      if (place.formattedAddress) setQuery(place.formattedAddress);
    } catch {
      toast.error("Couldn't load that place — try another or drop a pin.");
    } finally {
      newSession(); // a selection ends the billing session
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        placePin(pos.coords.latitude, pos.coords.longitude, true);
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Allow access or search instead.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Search + current location */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={query}
            disabled={status !== "ready"}
            onChange={(e) => onInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={
              status === "ready"
                ? "Search your area, road, or landmark…"
                : status === "loading"
                  ? "Loading map…"
                  : "Map unavailable — enter address below"
            }
            className="h-11 w-full rounded-[var(--radius)] border border-input bg-muted pl-9 pr-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />

          {open && suggestions.length > 0 && (
            <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-[var(--radius)] border border-border bg-popover py-1 shadow-[var(--shadow-pop)]">
              {suggestions.map((s) => (
                <li key={s.placeId}>
                  <button
                    type="button"
                    // onMouseDown (not onClick) so it fires before input blur
                    onMouseDown={(e) => {
                      e.preventDefault();
                      void choose(s);
                    }}
                    className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-bold text-ink">
                        {s.primary}
                      </span>
                      {s.secondary && (
                        <span className="block truncate text-[12px] text-faint">
                          {s.secondary}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={useMyLocation}
          disabled={status !== "ready" || locating}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-border bg-card px-3 text-[13px] font-bold text-sub transition-colors hover:bg-muted disabled:opacity-60"
          title="Use my current location"
        >
          {locating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Crosshair className="size-4" />
          )}
          <span className="hidden sm:inline">My location</span>
        </button>
      </div>

      {/* Map */}
      <div className="relative h-56 overflow-hidden rounded-lg border border-border bg-muted">
        <div ref={mapBoxRef} className="size-full" />
        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center bg-muted/80 text-faint">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 grid place-items-center gap-1 bg-muted px-6 text-center">
            <TriangleAlert className="mx-auto size-5 text-amber" />
            <p className="text-[12.5px] font-semibold text-sub">
              Map couldn&apos;t load. You can still enter your address below.
            </p>
          </div>
        )}
      </div>

      {status === "ready" && (
        <p className="text-[11.5px] font-medium text-faint">
          Search, tap the map, or drag the pin to set your exact location — then
          confirm the details below.
        </p>
      )}
    </div>
  );
}
