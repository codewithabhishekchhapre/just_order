import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { userAPI } from "@food/api";
import { useLocation as useAppLocation } from "@food/hooks/useLocation";
import { useLocationSelector } from "@food/components/user/UserLayout";
import { formatSavedAddress } from "@food/utils/imageUtils";
import { getOrderSocket } from "@core/services/orderSocket";
import TaxiBottomNav from "../components/layout/BottomNav";
import TaxiTopBar from "../components/home/TaxiTopBar";
import DestinationSearch from "../components/home/DestinationSearch";
import PickupMapCard from "../components/home/PickupMapCard";
import TaxiBookingSheet from "../components/home/TaxiBookingSheet";
import TaxiLiveTrackingMap from "../components/home/TaxiLiveTrackingMap";
import SavingsSection from "../components/home/SavingsSection";
import ExploreCity from "../components/home/ExploreCity";
import BrandBanner from "../components/home/BrandBanner";
import useTaxiVehicles from "../hooks/useTaxiVehicles";
import { getTaxiWalletPath, getTaxiRidesPath } from "../utils/routes";
import {
  isTaxiUserLoggedIn,
  redirectToTaxiLogin,
} from "../utils/authUser";
import { taxiUserApi } from "../../services/api";
import { saveBookingDraft } from "@/shared/utils/bookingDraft";
import {
  ACTIVE_RIDE_STATUSES,
  clearPersistedActiveRideId,
  etaMinutesFromMeters,
  haversineMeters,
  persistActiveRideId,
  phaseFromRideStatus,
  readPersistedActiveRideId,
} from "../utils/activeRide";

const SectionTitle = ({ children }) => (
  <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
    <h2 className="text-sm font-extrabold text-gray-900">{children}</h2>
  </div>
);

function driverLocFromRide(ride) {
  const fromRide = ride?.lastDriverLocation;
  const lat = Number(fromRide?.lat ?? ride?.driver?.lastLat);
  const lng = Number(fromRide?.lng ?? ride?.driver?.lastLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, heading: 0 };
}

export default function TaxiHome({ embedded = false }) {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { location } = useAppLocation();
  const { openLocationSelector } = useLocationSelector();
  const { vehicles, loading: vehiclesLoading } = useTaxiVehicles();

  const [destination, setDestination] = useState("");
  const [destinationPlace, setDestinationPlace] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);
  const [pickupOverride, setPickupOverride] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMinimized, setSheetMinimized] = useState(false);
  const [sheetPhase, setSheetPhase] = useState("vehicles"); // vehicles | confirm | finding | driver | trip
  const [quotesByVehicle, setQuotesByVehicle] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState({ distanceMeters: null, etaMinutes: null });
  const [hydrating, setHydrating] = useState(true);
  const lastRoadMetricsAtRef = useRef(0);

  const locationTitle = useMemo(() => {
    if (pickupOverride?.address) {
      const first = String(pickupOverride.address).split(",")[0]?.trim();
      return first || "Pickup location";
    }
    const area = location?.area || location?.city;
    return area || "Current location";
  }, [location, pickupOverride]);

  const locationSubtitle = useMemo(() => {
    if (pickupOverride?.address || pickupOverride?.formattedAddress) {
      return pickupOverride.formattedAddress || pickupOverride.address;
    }
    const formatted = formatSavedAddress?.(location);
    if (formatted && String(formatted).trim()) return String(formatted);
    return location?.address || location?.formattedAddress || "Tap to change pickup location";
  }, [location, pickupOverride]);

  const cityName = location?.city || locationTitle || "";

  const pickupCoords = useMemo(() => {
    if (pickupOverride) {
      const lat = Number(pickupOverride.lat ?? pickupOverride.latitude);
      const lng = Number(pickupOverride.lng ?? pickupOverride.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    const lat = Number(location?.latitude ?? location?.lat);
    const lng = Number(location?.longitude ?? location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [location, pickupOverride]);

  const dropReady = useMemo(() => {
    const lat = Number(destinationPlace?.lat);
    const lng = Number(destinationPlace?.lng);
    return Boolean(destinationPlace?.address) && Number.isFinite(lat) && Number.isFinite(lng);
  }, [destinationPlace]);

  const routeReady = Boolean(pickupCoords) && dropReady;

  const pickupPayload = useMemo(() => {
    if (!pickupCoords) return null;
    return {
      address: locationSubtitle || locationTitle || "Pickup",
      lat: pickupCoords.lat,
      lng: pickupCoords.lng,
    };
  }, [pickupCoords, locationSubtitle, locationTitle]);

  const dropPayload = useMemo(() => {
    if (!dropReady) return null;
    return {
      address: destinationPlace.address || destination.trim(),
      lat: Number(destinationPlace.lat),
      lng: Number(destinationPlace.lng),
    };
  }, [dropReady, destinationPlace, destination]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId],
  );

  const selectedQuote = selectedVehicleId
    ? quotesByVehicle[selectedVehicleId]
    : null;

  const isLiveRide =
    Boolean(activeRide?.id) &&
    ["finding", "driver", "trip"].includes(sheetPhase);

  const rideStatus = String(activeRide?.status || "").toLowerCase();

  // Live map only while driver is coming to pickup (before arrived)
  const showTrackingMap =
    isLiveRide &&
    !sheetMinimized &&
    (rideStatus === "assigned" || rideStatus === "arriving");

  // After arrive / during trip / finding: use bottom sheet (no map). En-route: inline panel under map.
  const showSheetOverlay =
    sheetOpen &&
    (sheetMinimized ||
      !showTrackingMap);

  const applyRide = useCallback((ride) => {
    if (!ride?.id) return;
    setActiveRide(ride);
    persistActiveRideId(ride.id);

    const nextPhase = phaseFromRideStatus(ride.status);
    if (nextPhase) {
      setSheetPhase(nextPhase);
      setSheetOpen(true);
    }

    const loc = driverLocFromRide(ride);
    if (loc) setDriverLocation((prev) => prev || loc);

    // Seed pickup/drop so UI labels stay correct after refresh
    if (ride.pickup?.address) {
      setPickupOverride({
        lat: Number(ride.pickup.lat),
        lng: Number(ride.pickup.lng),
        latitude: Number(ride.pickup.lat),
        longitude: Number(ride.pickup.lng),
        address: ride.pickup.address,
        formattedAddress: ride.pickup.address,
      });
      setPickupConfirmed(true);
    }
    if (ride.drop?.address) {
      setDestination(ride.drop.address);
      setDestinationPlace({
        address: ride.drop.address,
        lat: Number(ride.drop.lat),
        lng: Number(ride.drop.lng),
      });
    }
  }, []);

  const clearRideUi = useCallback(() => {
    setActiveRide(null);
    setDriverLocation(null);
    setLiveMetrics({ distanceMeters: null, etaMinutes: null });
    setSheetMinimized(false);
    clearPersistedActiveRideId();
  }, []);

  // Wallet
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isTaxiUserLoggedIn()) {
        setWalletBalance(null);
        setWalletLoading(false);
        return;
      }
      setWalletLoading(true);
      try {
        const res = await userAPI.getWallet();
        const data = res?.data?.data || res?.data || {};
        const balance =
          data?.wallet?.balance ??
          data?.balance ??
          data?.walletBalance ??
          data?.totalBalance ??
          null;
        if (!cancelled) setWalletBalance(balance == null ? null : Number(balance));
      } catch {
        if (!cancelled) setWalletBalance(null);
      } finally {
        if (!cancelled) setWalletLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate active ride after refresh
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isTaxiUserLoggedIn()) {
        setHydrating(false);
        return;
      }
      try {
        let ride = null;
        try {
          ride = await taxiUserApi.getActiveRide();
        } catch {
          ride = null;
        }
        if (!ride?.id) {
          const cachedId = readPersistedActiveRideId();
          if (cachedId) {
            try {
              ride = await taxiUserApi.getRide(cachedId);
              if (!ACTIVE_RIDE_STATUSES.has(ride?.status)) ride = null;
            } catch {
              ride = null;
            }
          }
        }
        if (!cancelled && ride?.id) {
          applyRide(ride);
        } else if (!cancelled) {
          clearPersistedActiveRideId();
        }
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyRide]);

  useEffect(() => {
    if (destination || selectedVehicleId || destinationPlace || pickupCoords) {
      saveBookingDraft("taxi", {
        destination,
        destinationPlace,
        selectedVehicleId,
        pickupCoords,
        pickupConfirmed,
      });
    }
  }, [destination, destinationPlace, selectedVehicleId, pickupCoords, pickupConfirmed]);

  const loadQuotes = useCallback(async () => {
    if (!routeReady || !pickupPayload || !dropPayload || !vehicles.length) {
      setQuotesByVehicle({});
      return;
    }
    setQuotesLoading(true);
    try {
      const entries = await Promise.all(
        vehicles.map(async (vehicle) => {
          try {
            const quote = await taxiUserApi.quote({
              pickup: pickupPayload,
              drop: dropPayload,
              vehicleTypeId: vehicle.id,
            });
            return [
              vehicle.id,
              {
                ok: true,
                fare: Number(quote?.fareEstimateTotal ?? quote?.fare?.total ?? 0),
                distanceKm: Number(quote?.distanceKm || 0),
                durationMin: Number(quote?.durationMin || 0),
                quote,
              },
            ];
          } catch (err) {
            return [
              vehicle.id,
              {
                ok: false,
                message:
                  err?.response?.data?.message ||
                  err?.message ||
                  "Unavailable",
              },
            ];
          }
        }),
      );
      setQuotesByVehicle(Object.fromEntries(entries));
    } finally {
      setQuotesLoading(false);
    }
  }, [routeReady, pickupPayload, dropPayload, vehicles]);

  // Open vehicle sheet when both pickup + drop ready (booking funnel only)
  useEffect(() => {
    if (hydrating || isLiveRide) return;
    if (!routeReady) {
      if (sheetPhase === "vehicles" || sheetPhase === "confirm") {
        setSheetOpen(false);
        setSelectedVehicleId(null);
      }
      return;
    }
    if (sheetPhase === "finding" || sheetPhase === "driver" || sheetPhase === "trip") return;

    setSheetPhase("vehicles");
    setSheetOpen(true);
    setSelectedVehicleId(null);
    loadQuotes();
  }, [routeReady, hydrating, isLiveRide]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll active ride
  useEffect(() => {
    if (!activeRide?.id) return undefined;
    if (!["finding", "driver", "trip"].includes(sheetPhase)) return undefined;

    let cancelled = false;
    const poll = async () => {
      try {
        const ride = await taxiUserApi.getRide(activeRide.id);
        if (cancelled || !ride) return;
        setActiveRide(ride);
        persistActiveRideId(ride.id);

        const loc = driverLocFromRide(ride);
        if (loc) {
          setDriverLocation((prev) => ({
            ...loc,
            heading: prev?.heading || 0,
          }));
        }

        const nextPhase = phaseFromRideStatus(ride.status);
        if (nextPhase) {
          if (nextPhase !== sheetPhase) {
            lastRoadMetricsAtRef.current = 0;
            setLiveMetrics({ distanceMeters: null, etaMinutes: null });
          }
          setSheetPhase(nextPhase);
          setSheetOpen(true);
        } else if (
          ["cancelled_by_rider", "cancelled_by_driver", "cancelled_by_system", "no_show", "completed"].includes(
            ride.status,
          )
        ) {
          setSheetOpen(false);
          setSheetPhase("vehicles");
          clearRideUi();
          if (ride.status === "completed") {
            toast.success("Trip completed");
            navigate(getTaxiRidesPath());
          } else {
            toast.message("Ride cancelled");
          }
        }
      } catch {
        /* ignore transient poll errors */
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeRide?.id, sheetPhase, navigate, clearRideUi]);

  // Live socket location for rider
  useEffect(() => {
    if (!activeRide?.id || !isTaxiUserLoggedIn()) return undefined;
    const token =
      localStorage.getItem("user_accessToken") ||
      localStorage.getItem("accessToken") ||
      "";
    const socket = getOrderSocket(() => token);
    if (!socket) return undefined;

    const ids = [activeRide.id, activeRide.rideNumber].filter(Boolean).map(String);

    const join = () => {
      ids.forEach((id) => {
        socket.emit("join-tracking", id);
        socket.emit("join_order", id);
      });
    };
    if (socket.connected) join();
    socket.on("connect", join);

    const onLoc = (data) => {
      if (!data) return;
      const match =
        ids.includes(String(data.orderId || "")) ||
        ids.includes(String(data.rideId || "")) ||
        String(data.rideNumber || "") === String(activeRide.rideNumber || "");
      if (!match) return;
      const lat = Number(data.lat ?? data.boy_lat);
      const lng = Number(data.lng ?? data.boy_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setDriverLocation({
        lat,
        lng,
        heading: Number(data.heading || 0),
      });
      if (data.etaMinutes != null || data.eta != null) {
        setLiveMetrics((m) => ({
          ...m,
          etaMinutes: Math.max(1, Math.round(Number(data.etaMinutes ?? data.eta))),
        }));
      }
      if (data.roadDistanceKm != null) {
        setLiveMetrics((m) => ({
          ...m,
          distanceMeters: Number(data.roadDistanceKm) * 1000,
        }));
      }
    };

    socket.on("location-update", onLoc);
    socket.on("ride_location_update", onLoc);
    socket.on("ride_status_update", (payload) => {
      if (String(payload?.rideId || "") !== String(activeRide.id)) return;
      taxiUserApi.getRide(activeRide.id).then((ride) => {
        if (!ride) return;
        applyRide(ride);
      }).catch(() => {});
    });

    return () => {
      socket.off("connect", join);
      socket.off("location-update", onLoc);
      socket.off("ride_location_update", onLoc);
      ids.forEach((id) => {
        socket.emit("leave-tracking", id);
        socket.emit("leave_order", id);
      });
    };
  }, [activeRide?.id, activeRide?.rideNumber, applyRide]);

  // Fallback haversine when Google Directions hasn't reported recently
  useEffect(() => {
    if (!driverLocation || !activeRide) return;
    if (Date.now() - lastRoadMetricsAtRef.current < 12000) return;
    const target =
      String(activeRide.status).toLowerCase() === "in_progress"
        ? activeRide.drop
        : activeRide.pickup;
    const meters = haversineMeters(driverLocation, target);
    if (meters == null) return;
    setLiveMetrics({
      distanceMeters: meters,
      etaMinutes: etaMinutesFromMeters(meters),
    });
  }, [driverLocation, activeRide?.status, activeRide?.pickup, activeRide?.drop]);

  const ensureLoggedInForBooking = () => {
    if (isTaxiUserLoggedIn()) return true;
    toast.message("Login required", {
      description: "Please sign in to book a taxi ride.",
    });
    redirectToTaxiLogin(navigate, routerLocation);
    return false;
  };

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicleId(vehicle.id);
    setSheetPhase("confirm");
  };

  const handleConfirmBook = async () => {
    if (!ensureLoggedInForBooking()) return;
    if (!selectedVehicleId || !selectedQuote?.ok) {
      toast.message("Choose a vehicle with pricing");
      return;
    }

    try {
      setBooking(true);
      const ride = await taxiUserApi.createRide({
        pickup: pickupPayload,
        drop: dropPayload,
        vehicleTypeId: selectedVehicleId,
        paymentMethod: "cash",
      });
      applyRide(ride);
      setSheetPhase("finding");
      setSheetOpen(true);
      setSheetMinimized(false);
      toast.success(`Ride ${ride?.rideNumber || ""} requested`);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  };

  const handleCancelRide = async () => {
    if (!activeRide?.id) {
      setSheetOpen(false);
      setSheetPhase("vehicles");
      return;
    }
    try {
      await taxiUserApi.cancelRide(activeRide.id, { reason: "Cancelled by rider" });
      toast.success("Ride cancelled");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not cancel ride");
    } finally {
      clearRideUi();
      setSheetPhase("vehicles");
      setSheetOpen(Boolean(routeReady));
      if (routeReady) loadQuotes();
    }
  };

  const handleMapMetrics = useCallback((metrics) => {
    if (!metrics) return;
    lastRoadMetricsAtRef.current = Date.now();
    setLiveMetrics({
      distanceMeters: metrics.distanceMeters ?? null,
      etaMinutes:
        metrics.durationSec != null
          ? Math.max(1, Math.ceil(Number(metrics.durationSec) / 60))
          : null,
    });
  }, []);

  return (
    <div
      className={`min-h-screen bg-[#F7F7F8] text-gray-900 ${
        embedded ? "pb-24" : "pb-28"
      }`}
    >
      {!showTrackingMap ? (
        <TaxiTopBar
          title={locationTitle}
          subtitle={locationSubtitle}
          onLocationClick={() => openLocationSelector?.()}
          walletBalance={walletBalance}
          walletLoading={walletLoading}
        />
      ) : null}

      {showTrackingMap ? (
        <div className="mx-auto h-[100dvh] max-w-lg overflow-y-auto pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
          {/* Sticky header + map */}
          <div className="sticky top-0 z-20 bg-[#F7F7F8] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
            <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#FF6A00]">
                  Driver en route
                </p>
                <p className="truncate text-sm font-extrabold text-gray-900">
                  Live tracking
                  {activeRide?.rideNumber ? ` · ${activeRide.rideNumber}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheetMinimized(true)}
                className="shrink-0 rounded-xl bg-gray-100 px-3 py-2 text-[11px] font-bold text-gray-700"
              >
                Minimize
              </button>
            </div>

            <div className="h-[42vh] max-h-[50vh] overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
              <TaxiLiveTrackingMap
                ride={activeRide}
                driverLocation={driverLocation}
                className="h-full"
                onMetrics={handleMapMetrics}
              />
            </div>
          </div>

          {/* Unified ride card — metrics + driver details (tight, no big gap) */}
          <div className="px-3 pt-2 pb-2">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                <div className="px-2 py-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    Fare
                  </p>
                  <p className="mt-1 text-base font-extrabold text-gray-900">
                    {formatInrSafe(activeRide?.fareEstimateTotal || activeRide?.fare?.total)}
                  </p>
                </div>
                <div className="px-2 py-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    Distance
                  </p>
                  <p className="mt-1 text-base font-extrabold text-gray-900">
                    {formatDistanceLabel(liveMetrics.distanceMeters)}
                  </p>
                </div>
                <div className="px-2 py-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    ETA
                  </p>
                  <p className="mt-1 text-base font-extrabold text-[#FF6A00]">
                    {liveMetrics.etaMinutes != null
                      ? `${liveMetrics.etaMinutes} min`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="p-3">
                <TaxiBookingSheet
                  open
                  inline
                  phase="driver"
                  minimized={false}
                  onMinimize={() => setSheetMinimized(true)}
                  onExpand={() => setSheetMinimized(false)}
                  onClose={() => {}}
                  onCancelRide={handleCancelRide}
                  pickupLabel={activeRide?.pickup?.address || pickupPayload?.address}
                  dropLabel={activeRide?.drop?.address || dropPayload?.address}
                  activeRide={activeRide}
                  liveDistanceMeters={liveMetrics.distanceMeters}
                  liveEtaMinutes={liveMetrics.etaMinutes}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <main className="mx-auto max-w-lg space-y-5 px-4 py-4">
          {isLiveRide ? (
            <div className="rounded-2xl border border-[#FF6A00]/30 bg-[#FFF4ED] px-4 py-3">
              <p className="text-sm font-extrabold text-gray-900">
                You have an active ride
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Finish or cancel the current ride before booking another.
              </p>
              <button
                type="button"
                onClick={() => setSheetMinimized(false)}
                className="mt-3 h-10 w-full rounded-xl bg-[#FF6A00] text-xs font-bold text-white"
              >
                {rideStatus === "assigned" || rideStatus === "arriving"
                  ? "Back to live tracking"
                  : "Open ride details"}
              </button>
            </div>
          ) : null}

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <DestinationSearch
              value={destination}
              onChange={(next) => {
                if (isLiveRide) return;
                setDestination(next);
                if (destinationPlace && next !== destinationPlace.address) {
                  setDestinationPlace(null);
                }
              }}
              onSelectPlace={(place) => {
                if (isLiveRide) {
                  toast.message("Finish your current ride first");
                  return;
                }
                if (!place) {
                  setDestinationPlace(null);
                  return;
                }
                setDestinationPlace(place);
                if (place?.address) {
                  setDestination(place.address);
                  toast.success("Drop location selected");
                }
              }}
              biasLocation={pickupCoords}
              onUseCurrentLocation={() => {
                if (isLiveRide) {
                  toast.message("Finish your current ride first");
                  return;
                }
                openLocationSelector?.();
                toast.success("Using your current location");
              }}
              placeholder="Where are you going?"
            />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04, duration: 0.25 }}
          >
            <SectionTitle>Set pickup on map</SectionTitle>
            <PickupMapCard
              addressLabel={
                pickupConfirmed || pickupOverride
                  ? locationSubtitle
                  : "Move the pin, then confirm pickup"
              }
              initialLocation={pickupCoords}
              onPickupChange={(payload) => {
                if (isLiveRide) {
                  toast.message("Finish your current ride first");
                  return;
                }
                if (!payload) return;
                const lat = Number(payload.lat ?? payload.latitude);
                const lng = Number(payload.lng ?? payload.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                setPickupOverride({
                  lat,
                  lng,
                  latitude: lat,
                  longitude: lng,
                  address: payload.address || payload.formattedAddress || "",
                  formattedAddress:
                    payload.formattedAddress || payload.address || "",
                });
                setPickupConfirmed(true);
                toast.success("Pickup confirmed");
              }}
              onConfirm={(payload) => {
                if (isLiveRide) {
                  toast.message("Finish your current ride first");
                  return;
                }
                if (payload) return;
                if (!pickupCoords) {
                  toast.message("Set pickup on the map first");
                  return;
                }
                setPickupConfirmed(true);
                toast.success("Pickup location confirmed");
              }}
            />
          </motion.section>

          {!routeReady ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-5 text-center">
              <p className="text-sm font-bold text-gray-800">Select pickup & drop</p>
              <p className="mt-1 text-xs text-gray-500">
                Once both are set, available bikes and cabs open with live fares.
              </p>
            </div>
          ) : isLiveRide ? (
            <button
              type="button"
              disabled
              className="h-12 w-full cursor-not-allowed rounded-2xl bg-gray-200 text-sm font-bold text-gray-500"
            >
              Booking locked — ride in progress
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSheetPhase("vehicles");
                setSheetOpen(true);
                loadQuotes();
              }}
              className="h-12 w-full rounded-2xl bg-[#FF6A00] text-sm font-bold text-white shadow-md shadow-[#FF6A00]/30"
            >
              View available rides
            </button>
          )}

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.25 }}
          >
            <SectionTitle>Savings</SectionTitle>
            <SavingsSection onOpenWallet={() => navigate(getTaxiWalletPath())} />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.25 }}
          >
            <ExploreCity
              city={cityName}
              onSelectPlace={(place) => {
                if (isLiveRide) {
                  toast.message("Finish your current ride first");
                  return;
                }
                setDestination(place.name);
                setDestinationPlace(null);
                toast.message(`Searching near ${place.name}`, {
                  description: "Pick a matching suggestion for exact drop.",
                });
              }}
            />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.25 }}
            className="pb-2"
          >
            <BrandBanner />
          </motion.section>
        </main>
      )}

      <TaxiBookingSheet
        open={showSheetOverlay}
        phase={sheetPhase}
        minimized={sheetMinimized}
        onMinimize={() => setSheetMinimized(true)}
        onExpand={() => setSheetMinimized(false)}
        onClose={() => {
          if (sheetPhase === "vehicles" || sheetPhase === "confirm") {
            setSheetOpen(false);
            setSheetPhase("vehicles");
            setSelectedVehicleId(null);
          }
        }}
        onSelectVehicle={handleSelectVehicle}
        onConfirmBook={handleConfirmBook}
        onCancelRide={handleCancelRide}
        pickupLabel={activeRide?.pickup?.address || pickupPayload?.address}
        dropLabel={activeRide?.drop?.address || dropPayload?.address}
        vehicles={vehicles}
        quotesByVehicle={quotesByVehicle}
        quotesLoading={quotesLoading || vehiclesLoading}
        selectedVehicle={selectedVehicle}
        selectedQuote={selectedQuote}
        booking={booking}
        activeRide={activeRide}
        liveDistanceMeters={liveMetrics.distanceMeters}
        liveEtaMinutes={liveMetrics.etaMinutes}
      />

      <TaxiBottomNav />
    </div>
  );
}

function formatInrSafe(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `₹${Math.round(n)}`;
}

function formatDistanceLabel(meters) {
  if (meters == null || !Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
