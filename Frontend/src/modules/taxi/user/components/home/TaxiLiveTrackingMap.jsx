import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Crosshair, Loader2, Minus, Plus, Route } from "lucide-react";
import { loadGoogleMaps } from "@core/services/googleMapsLoader";
import { getGoogleMapsApiKey } from "@food/utils/googleMapsApiKey";
import { getOrderSocket } from "@core/services/orderSocket";
import { isTaxiUserLoggedIn } from "../../utils/authUser";

function toLatLng(point) {
  if (!point) return null;
  const lat = Number(point.lat ?? point.latitude);
  const lng = Number(point.lng ?? point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Live map for rider tracking: pickup, drop, driver marker + route polyline.
 */
export default function TaxiLiveTrackingMap({
  ride = null,
  driverLocation = null,
  className = "",
  onMetrics = null,
}) {
  const mapHostRef = useRef(null);
  const mapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const pickup = useMemo(() => toLatLng(ride?.pickup), [ride?.pickup]);
  const drop = useMemo(() => toLatLng(ride?.drop), [ride?.drop]);
  const driver = useMemo(() => toLatLng(driverLocation), [driverLocation]);

  const routeTarget = useMemo(() => {
    const status = String(ride?.status || "").toLowerCase();
    if (status === "in_progress") return drop;
    return pickup;
  }, [ride?.status, pickup, drop]);

  const trackingIds = useMemo(() => {
    const ids = [ride?.id, ride?._id, ride?.rideNumber]
      .map((x) => String(x || "").trim())
      .filter(Boolean);
    return [...new Set(ids)];
  }, [ride?.id, ride?._id, ride?.rideNumber]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const key = getGoogleMapsApiKey();
        if (!key) throw new Error("Maps key missing");
        await loadGoogleMaps({ apiKey: key, libraries: ["places", "geometry"] });
        if (cancelled || !mapHostRef.current || !window.google?.maps) return;

        const center = driver || pickup || drop || { lat: 20.59, lng: 78.96 };
        const map = new window.google.maps.Map(mapHostRef.current, {
          center,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
          styles: [
            { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
            { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
          ],
        });
        mapRef.current = map;
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#FF6A00",
            strokeOpacity: 0.95,
            strokeWeight: 5,
          },
        });
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Map failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || !mapRef.current || !window.google?.maps) return;
    const map = mapRef.current;

    if (pickup) {
      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = new window.google.maps.Marker({
          map,
          position: pickup,
          label: { text: "P", color: "#111", fontWeight: "700" },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#10B981",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });
      } else {
        pickupMarkerRef.current.setPosition(pickup);
      }
    }

    if (drop) {
      if (!dropMarkerRef.current) {
        dropMarkerRef.current = new window.google.maps.Marker({
          map,
          position: drop,
          label: { text: "D", color: "#111", fontWeight: "700" },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#FF6A00",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });
      } else {
        dropMarkerRef.current.setPosition(drop);
      }
    }

    if (driver) {
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = new window.google.maps.Marker({
          map,
          position: driver,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: "#111827",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
            rotation: Number(driverLocation?.heading || 0),
          },
        });
      } else {
        driverMarkerRef.current.setPosition(driver);
        const icon = driverMarkerRef.current.getIcon();
        if (icon && typeof icon === "object") {
          driverMarkerRef.current.setIcon({
            ...icon,
            rotation: Number(driverLocation?.heading || 0),
          });
        }
      }
    }
  }, [ready, pickup, drop, driver, driverLocation?.heading]);

  useEffect(() => {
    if (!ready || !window.google?.maps || !directionsRendererRef.current) return;
    if (!driver || !routeTarget) {
      directionsRendererRef.current.setDirections({ routes: [] });
      return;
    }

    const service = new window.google.maps.DirectionsService();
    service.route(
      {
        origin: driver,
        destination: routeTarget,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          directionsRendererRef.current.setDirections(result);
          const leg = result.routes?.[0]?.legs?.[0];
          if (leg && onMetrics) {
            onMetrics({
              distanceMeters: leg.distance?.value ?? null,
              durationSec: leg.duration?.value ?? null,
              distanceText: leg.distance?.text || null,
              durationText: leg.duration?.text || null,
            });
          }
        }
      },
    );
  }, [ready, driver?.lat, driver?.lng, routeTarget?.lat, routeTarget?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!trackingIds.length || !isTaxiUserLoggedIn()) return undefined;
    const token =
      localStorage.getItem("user_accessToken") ||
      localStorage.getItem("accessToken") ||
      "";
    const socket = getOrderSocket(() => token);
    if (!socket) return undefined;

    const join = () => {
      trackingIds.forEach((id) => {
        socket.emit("join-tracking", id);
        socket.emit("join_order", id);
      });
    };
    if (socket.connected) join();
    socket.on("connect", join);

    return () => {
      socket.off("connect", join);
      trackingIds.forEach((id) => {
        socket.emit("leave-tracking", id);
        socket.emit("leave_order", id);
      });
    };
  }, [trackingIds.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const recenterOnDriver = useCallback(() => {
    if (!mapRef.current || !driver) return;
    mapRef.current.panTo(driver);
    mapRef.current.setZoom(16);
  }, [driver]);

  const fitRoute = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoint = false;
    [driver, routeTarget, pickup, drop].forEach((p) => {
      if (!p) return;
      bounds.extend(p);
      hasPoint = true;
    });
    if (hasPoint) {
      mapRef.current.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    }
  }, [driver, routeTarget, pickup, drop]);

  const zoomBy = useCallback((delta) => {
    if (!mapRef.current) return;
    const z = mapRef.current.getZoom() || 14;
    mapRef.current.setZoom(Math.max(3, Math.min(20, z + delta)));
  }, []);

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
      <div ref={mapHostRef} className="absolute inset-0" />

      {ready ? (
        <div className="pointer-events-none absolute inset-y-0 right-2 z-20 flex flex-col items-end justify-center gap-2 py-3">
          <div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={() => zoomBy(1)}
              className="flex h-9 w-9 items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="h-px bg-gray-200" />
            <button
              type="button"
              onClick={() => zoomBy(-1)}
              className="flex h-9 w-9 items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100"
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={recenterOnDriver}
            disabled={!driver}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 bg-white/95 text-[#FF6A00] shadow-lg backdrop-blur disabled:opacity-40"
            aria-label="Recenter on driver"
            title="Recenter on driver"
          >
            <Crosshair className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={fitRoute}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200/80 bg-white/95 text-gray-800 shadow-lg backdrop-blur"
            aria-label="Fit full route"
            title="Show full route"
          >
            <Route className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {!ready && !error ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
          <Loader2 className="h-7 w-7 animate-spin text-[#FF6A00]" />
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white px-4 text-center text-sm text-red-600">
          {error}
        </div>
      ) : null}
    </div>
  );
}
