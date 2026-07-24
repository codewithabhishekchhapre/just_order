import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Crosshair,
  Loader2,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { loadGoogleMaps } from "@core/services/googleMapsLoader";
import { getGoogleMapsApiKey } from "@food/utils/googleMapsApiKey";

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 14;
const MIN_QUERY = 2;
const DEBOUNCE_MS = 280;

function toLatLng(loc) {
  if (!loc) return null;
  const lat = Number(loc.lat ?? loc.latitude);
  const lng = Number(loc.lng ?? loc.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export default function PickupMapCard({
  addressLabel = "Move the pin, then confirm pickup",
  initialLocation = null,
  onConfirm,
  onPickupChange,
  confirming = false,
  locked = false,
}) {
  const mapHostRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const autocompleteRef = useRef(null);
  const placesHostRef = useRef(null);
  const placesServiceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const latestRequestRef = useRef(0);
  const pinRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [pin, setPin] = useState(() => toLatLng(initialLocation));
  const [address, setAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  pinRef.current = pin;

  const displayAddress = address || addressLabel;

  const getSessionToken = useCallback(() => {
    if (
      !sessionTokenRef.current &&
      window.google?.maps?.places?.AutocompleteSessionToken
    ) {
      sessionTokenRef.current =
        new window.google.maps.places.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }, []);

  const reverseGeocode = useCallback(async (pos) => {
    if (!geocoderRef.current || !pos) return "";
    setIsGeocoding(true);
    try {
      const result = await new Promise((resolve) => {
        geocoderRef.current.geocode({ location: pos }, (results, status) => {
          if (status === "OK" && results?.[0]) resolve(results[0]);
          else resolve(null);
        });
      });
      const formatted = result?.formatted_address || "";
      setAddress(formatted);
      return formatted;
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const placeMarker = useCallback(
    (pos, { pan = true, geocode = true } = {}) => {
      if (!mapRef.current || !window.google?.maps || !pos) return;

      if (!markerRef.current) {
        markerRef.current = new window.google.maps.Marker({
          map: mapRef.current,
          position: pos,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });
        markerRef.current.addListener("dragend", () => {
          const next = {
            lat: markerRef.current.getPosition().lat(),
            lng: markerRef.current.getPosition().lng(),
          };
          setPin(next);
          reverseGeocode(next);
        });
      } else {
        markerRef.current.setPosition(pos);
      }

      setPin(pos);
      if (pan) {
        mapRef.current.panTo(pos);
        if (mapRef.current.getZoom() < 14) mapRef.current.setZoom(15);
      }
      if (geocode) reverseGeocode(pos);
    },
    [reverseGeocode],
  );

  // Init real Google Map
  useEffect(() => {
    let cancelled = false;
    let resizeObserver = null;

    (async () => {
      try {
        setMapError("");
        const apiKey = await getGoogleMapsApiKey();
        if (!apiKey) {
          if (!cancelled) setMapError("Google Maps API key is missing");
          return;
        }
        await loadGoogleMaps(apiKey);
        if (cancelled || !mapHostRef.current || !window.google?.maps) return;

        geocoderRef.current = new window.google.maps.Geocoder();
        if (!placesHostRef.current) {
          placesHostRef.current = document.createElement("div");
        }
        if (window.google.maps.places) {
          autocompleteRef.current =
            new window.google.maps.places.AutocompleteService();
          placesServiceRef.current = new window.google.maps.places.PlacesService(
            placesHostRef.current,
          );
        }

        const start = toLatLng(initialLocation) || DEFAULT_CENTER;
        const map = new window.google.maps.Map(mapHostRef.current, {
          center: start,
          zoom: toLatLng(initialLocation) ? 15 : DEFAULT_ZOOM,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
        });
        mapRef.current = map;

        map.addListener("click", (event) => {
          if (!event?.latLng) return;
          placeMarker(
            { lat: event.latLng.lat(), lng: event.latLng.lng() },
            { pan: false, geocode: true },
          );
        });

        if (toLatLng(initialLocation)) {
          placeMarker(start, { pan: true, geocode: !address });
        }

        resizeObserver = new ResizeObserver(() => {
          window.google.maps.event.trigger(map, "resize");
        });
        resizeObserver.observe(mapHostRef.current);

        if (!cancelled) setMapReady(true);
        setTimeout(() => {
          window.google.maps.event.trigger(map, "resize");
          if (pinRef.current) map.panTo(pinRef.current);
        }, 200);
      } catch (err) {
        if (!cancelled) {
          setMapError(err?.message || "Failed to load map");
        }
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when parent location becomes available after mount
  useEffect(() => {
    const next = toLatLng(initialLocation);
    if (!next || !mapReady || !mapRef.current) return;
    const current = pinRef.current;
    if (
      current &&
      Math.abs(current.lat - next.lat) < 0.00001 &&
      Math.abs(current.lng - next.lng) < 0.00001
    ) {
      return;
    }
    placeMarker(next, { pan: true, geocode: true });
  }, [initialLocation, mapReady, placeMarker]);

  // Places search
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < MIN_QUERY || !searchOpen) {
      latestRequestRef.current += 1;
      setPredictions([]);
      setIsSearching(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      if (!autocompleteRef.current) return;
      const requestId = ++latestRequestRef.current;
      setIsSearching(true);

      const request = {
        input: query,
        componentRestrictions: { country: "in" },
        sessionToken: getSessionToken(),
      };
      const bias = pinRef.current || toLatLng(initialLocation);
      if (bias && window.google?.maps) {
        request.location = new window.google.maps.LatLng(bias.lat, bias.lng);
        request.radius = 35000;
      }

      autocompleteRef.current.getPlacePredictions(request, (results, status) => {
        if (requestId !== latestRequestRef.current) return;
        setIsSearching(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          setPredictions((results || []).slice(0, 5));
        } else {
          setPredictions([]);
        }
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen, getSessionToken, initialLocation]);

  const selectPrediction = (prediction) => {
    if (!prediction?.place_id || !placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["geometry", "formatted_address", "name"],
        sessionToken: getSessionToken(),
      },
      (place, status) => {
        sessionTokenRef.current = null;
        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !place?.geometry?.location
        ) {
          toast.error("Could not resolve that place");
          return;
        }
        const pos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        const formatted =
          place.formatted_address || place.name || prediction.description;
        setAddress(formatted);
        // Clear search box so last query / dropdown don't stick after selection
        setSearchQuery("");
        setPredictions([]);
        setSearchOpen(false);
        placeMarker(pos, { pan: true, geocode: false });
      },
    );
  };

  // After pickup is confirmed / during live ride — no leftover search UI
  useEffect(() => {
    if (!locked) return;
    setSearchQuery("");
    setPredictions([]);
    setSearchOpen(false);
    setIsSearching(false);
  }, [locked]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        placeMarker(pos, { pan: true, geocode: true });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        toast.error("Allow location access to use current location");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleConfirm = async () => {
    const pos = pinRef.current;
    if (!pos) {
      toast.message("Set your pickup pin", {
        description: "Tap the map or search a place first.",
      });
      return;
    }

    let formatted = address;
    if (!formatted) {
      formatted = await reverseGeocode(pos);
    }

    const payload = {
      lat: pos.lat,
      lng: pos.lng,
      latitude: pos.lat,
      longitude: pos.lng,
      address: formatted || "Pickup location",
      formattedAddress: formatted || "Pickup location",
    };

    onPickupChange?.(payload);
    onConfirm?.(payload);
    setSearchQuery("");
    setPredictions([]);
    setSearchOpen(false);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Search + locate */}
      <div className="relative z-20 space-y-2 border-b border-gray-50 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#FF6A00]" />
          <input
            type="search"
            value={searchQuery}
            disabled={locked}
            onChange={(e) => {
              if (locked) return;
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              if (locked) return;
              setSearchOpen(true);
            }}
            placeholder={locked ? "Pickup selected" : "Search pickup area…"}
            autoComplete="off"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-10 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#FF6A00]/40 focus:ring-2 focus:ring-[#FF6A00]/15 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
          />
          {searchQuery && !locked ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setPredictions([]);
                setSearchOpen(false);
              }}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}

          {!locked && searchOpen && (isSearching || predictions.length > 0) ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
              {isSearching ? (
                <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF6A00]" />
                  Searching…
                </div>
              ) : null}
              {!isSearching
                ? predictions.map((p) => (
                    <button
                      key={p.place_id}
                      type="button"
                      onClick={() => selectPrediction(p)}
                      className="flex w-full items-start gap-2 border-b border-gray-50 px-3 py-2.5 text-left last:border-b-0 hover:bg-[#FFF7F0]"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF6A00]" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-gray-900">
                          {p.structured_formatting?.main_text || p.description}
                        </span>
                        {p.structured_formatting?.secondary_text ? (
                          <span className="block truncate text-[11px] text-gray-500">
                            {p.structured_formatting.secondary_text}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ))
                : null}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locked || isLocating || !mapReady}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 active:scale-[0.99] disabled:opacity-60"
        >
          {isLocating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF6A00]" />
          ) : (
            <Crosshair className="h-3.5 w-3.5 text-[#FF6A00]" />
          )}
          {isLocating ? "Getting location…" : "Use current location"}
        </button>
      </div>

      {/* Real map */}
      <div className="relative h-[240px] w-full bg-slate-100 sm:h-[280px]">
        <div ref={mapHostRef} className="absolute inset-0 h-full w-full" />

        {!mapReady && !mapError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90">
            <div className="text-center">
              <Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin text-[#FF6A00]" />
              <p className="text-xs font-medium text-slate-600">Loading live map…</p>
            </div>
          </div>
        ) : null}

        {mapError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100 px-6 text-center">
            <div>
              <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Map unavailable</p>
              <p className="mt-1 text-xs text-slate-500">{mapError}</p>
            </div>
          </div>
        ) : null}

        {mapReady ? (
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-gray-700 shadow-sm">
            Tap map or drag pin
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          {isGeocoding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
            Pickup pin
          </p>
          <p className="truncate text-xs font-semibold text-gray-900">
            {displayAddress}
          </p>
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={locked || confirming || !pin}
          className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#FF6A00] px-3 text-[11px] font-bold text-white shadow-sm shadow-[#FF6A00]/25 active:scale-95 disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5" />
          {locked ? "Locked" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
