import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import { loadGoogleMaps } from "@core/services/googleMapsLoader";
import { getGoogleMapsApiKey } from "@food/utils/googleMapsApiKey";

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 280;
const MAX_SUGGESTIONS = 6;

export default function DestinationSearch({
  value = "",
  onChange,
  onSelectPlace,
  onUseCurrentLocation,
  biasLocation = null,
  placeholder = "Where are you going?",
}) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const geocoderRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const mapsReadyRef = useRef(false);
  const latestRequestRef = useRef(0);
  const placesHostRef = useRef(null);
  const selectedAddressRef = useRef("");

  const [isFocused, setIsFocused] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [resolvingId, setResolvingId] = useState(null);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

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

  const initGooglePlaces = useCallback(async () => {
    if (mapsReadyRef.current && autocompleteServiceRef.current) return true;

    try {
      const apiKey = await getGoogleMapsApiKey();
      if (!apiKey) {
        setError("Google Maps API key is missing");
        return false;
      }

      await loadGoogleMaps(apiKey);
      if (!window.google?.maps?.places) {
        setError("Google Places is unavailable");
        return false;
      }

      autocompleteServiceRef.current =
        new window.google.maps.places.AutocompleteService();
      geocoderRef.current = new window.google.maps.Geocoder();

      // PlacesService needs a DOM node (can be hidden)
      if (!placesHostRef.current) {
        placesHostRef.current = document.createElement("div");
      }
      placesServiceRef.current = new window.google.maps.places.PlacesService(
        placesHostRef.current,
      );

      mapsReadyRef.current = true;
      setError("");
      return true;
    } catch (err) {
      setError(err?.message || "Unable to load location search");
      return false;
    }
  }, []);

  // Prefetch Places on first focus for snappier typing
  useEffect(() => {
    if (!isFocused) return undefined;
    initGooglePlaces();
    return undefined;
  }, [isFocused, initGooglePlaces]);

  // Debounced predictions (works while typing even before focus settles)
  useEffect(() => {
    const query = String(value || "").trim();

    if (query.length < MIN_QUERY_LENGTH) {
      latestRequestRef.current += 1;
      setPredictions([]);
      setIsSearching(false);
      if (query.length === 0) setError("");
      return undefined;
    }

    // Don't re-open suggestions for an already selected place address
    if (query === selectedAddressRef.current) {
      setPredictions([]);
      setIsSearching(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      const ready = await initGooglePlaces();
      if (!ready || !autocompleteServiceRef.current) return;

      const requestId = ++latestRequestRef.current;
      setIsSearching(true);
      setError("");

      const request = {
        input: query,
        componentRestrictions: { country: "in" },
        sessionToken: getSessionToken(),
      };

      const lat = Number(biasLocation?.lat ?? biasLocation?.latitude);
      const lng = Number(biasLocation?.lng ?? biasLocation?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng) && window.google?.maps) {
        request.location = new window.google.maps.LatLng(lat, lng);
        request.radius = 35000;
      }

      autocompleteServiceRef.current.getPlacePredictions(
        request,
        (results, status) => {
          if (requestId !== latestRequestRef.current) return;
          setIsSearching(false);

          const ok = status === window.google.maps.places.PlacesServiceStatus.OK;
          const zero =
            status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS;

          if (ok && Array.isArray(results)) {
            setPredictions(results.slice(0, MAX_SUGGESTIONS));
            setIsFocused(true);
          } else {
            setPredictions([]);
            if (!zero) setError("Unable to fetch location suggestions");
          }
        },
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, biasLocation, getSessionToken, initGooglePlaces]);

  // Close dropdown on outside click
  useEffect(() => {
    const onPointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const resolvePlace = useCallback(
    (prediction) => {
      if (!prediction?.place_id) return;
      setResolvingId(prediction.place_id);

      const finish = (payload) => {
        selectedAddressRef.current = payload.address || "";
        onChange?.(payload.address);
        onSelectPlace?.(payload);
        setPredictions([]);
        setIsFocused(false);
        setResolvingId(null);
        setError("");
        resetSession();
      };

      const fail = (message) => {
        setResolvingId(null);
        setError(message || "Could not resolve this location");
      };

      const applyGeometry = (geometry, formattedAddress) => {
        if (!geometry) {
          fail("Coordinates not available for this place");
          return;
        }
        finish({
          address: formattedAddress || prediction.description,
          lat: geometry.lat(),
          lng: geometry.lng(),
          placeId: prediction.place_id,
          mainText:
            prediction.structured_formatting?.main_text || prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text || "",
        });
      };

      // Prefer Places Details (keeps Autocomplete session billing correct)
      if (placesServiceRef.current) {
        placesServiceRef.current.getDetails(
          {
            placeId: prediction.place_id,
            fields: ["geometry", "formatted_address", "name"],
            sessionToken: getSessionToken(),
          },
          (place, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              place?.geometry?.location
            ) {
              applyGeometry(
                place.geometry.location,
                place.formatted_address || place.name || prediction.description,
              );
              return;
            }

            // Fallback: Geocoder
            if (!geocoderRef.current) {
              fail("Could not resolve selected location");
              return;
            }
            geocoderRef.current.geocode(
              { placeId: prediction.place_id },
              (results, geoStatus) => {
                if (geoStatus === "OK" && results?.[0]?.geometry?.location) {
                  applyGeometry(
                    results[0].geometry.location,
                    results[0].formatted_address || prediction.description,
                  );
                } else {
                  fail("Could not resolve selected location");
                }
              },
            );
          },
        );
        return;
      }

      if (!geocoderRef.current) {
        fail("Location services not ready");
        return;
      }

      geocoderRef.current.geocode(
        { placeId: prediction.place_id },
        (results, geoStatus) => {
          if (geoStatus === "OK" && results?.[0]?.geometry?.location) {
            applyGeometry(
              results[0].geometry.location,
              results[0].formatted_address || prediction.description,
            );
          } else {
            fail("Could not resolve selected location");
          }
        },
      );
    },
    [getSessionToken, onChange, onSelectPlace, resetSession],
  );

  const showDropdown =
    isFocused &&
    (isSearching ||
      predictions.length > 0 ||
      error ||
      String(value || "").trim().length >= MIN_QUERY_LENGTH);

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#FF6A00]" />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => {
            selectedAddressRef.current = "";
            onChange?.(e.target.value);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-20 text-sm font-medium text-gray-900 shadow-sm placeholder:text-gray-400 outline-none focus:border-[#FF6A00]/40 focus:ring-2 focus:ring-[#FF6A00]/15"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {value ? (
            <button
              type="button"
              onClick={() => {
                selectedAddressRef.current = "";
                onChange?.("");
                onSelectPlace?.(null);
                setPredictions([]);
                setError("");
                inputRef.current?.focus();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Clear destination"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onUseCurrentLocation}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6A00]/10 text-[#FF6A00] active:scale-95"
            aria-label="Use current location"
            title="Use current location"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-[60] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.12)]">
          {isSearching ? (
            <div className="flex items-center gap-2 px-3.5 py-3 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#FF6A00]" />
              Searching places…
            </div>
          ) : null}

          {!isSearching && predictions.length === 0 ? (
            <div className="px-3.5 py-3 text-sm text-gray-500">
              {error ||
                (String(value || "").trim().length >= MIN_QUERY_LENGTH
                  ? "No matching places found"
                  : "Type at least 2 characters")}
            </div>
          ) : null}

          {!isSearching
            ? predictions.map((prediction) => {
                const main =
                  prediction.structured_formatting?.main_text ||
                  prediction.description;
                const secondary =
                  prediction.structured_formatting?.secondary_text || "";
                const busy = resolvingId === prediction.place_id;

                return (
                  <button
                    key={prediction.place_id}
                    type="button"
                    disabled={Boolean(resolvingId)}
                    onClick={() => resolvePlace(prediction)}
                    className="flex w-full items-start gap-3 border-b border-gray-50 px-3.5 py-3 text-left last:border-b-0 hover:bg-[#FFF7F0] disabled:opacity-60"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FF6A00]/10 text-[#FF6A00]">
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {main}
                      </span>
                      {secondary ? (
                        <span className="mt-0.5 block truncate text-xs text-gray-500">
                          {secondary}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            : null}

          {error && predictions.length > 0 ? (
            <div className="border-t border-gray-50 px-3.5 py-2 text-xs text-red-600">
              {error}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
