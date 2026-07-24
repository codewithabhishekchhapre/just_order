import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bike,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Shield,
  Star,
  X,
} from "lucide-react";
import BottomSheet from "../ui/BottomSheet";
import { formatInr } from "../../utils/mock/vehicles";
import { googleMapsNavUrl } from "../../utils/activeRide";

const SEARCHING = new Set(["requested", "searching"]);
const ASSIGNED = new Set(["assigned", "arriving", "arrived"]);
const LIVE = new Set(["in_progress"]);

function formatWaitClock(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** Live wait timer after driver arrived, before OTP start */
function PassengerWaitTimer({ arrivedAt, freeWaitMinutes = 0, perMinWaitRate = 0 }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startedMs = arrivedAt ? new Date(arrivedAt).getTime() : NaN;
  if (!Number.isFinite(startedMs)) return null;

  const elapsedSec = Math.max(0, Math.floor((now - startedMs) / 1000));
  const freeSec = Math.max(0, Math.round(Number(freeWaitMinutes || 0) * 60));
  const overFree = elapsedSec > freeSec;
  const remainingFreeSec = Math.max(0, freeSec - elapsedSec);
  const billableMin = overFree ? Math.ceil((elapsedSec - freeSec) / 60) : 0;
  const rate = Number(perMinWaitRate || 0);

  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        overFree
          ? "border-amber-200 bg-amber-50"
          : "border-gray-100 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
            <Clock className="h-3.5 w-3.5 text-[#FF6A00]" />
            Waiting for you
          </p>
          <p className="mt-1 font-mono text-2xl font-extrabold tracking-wider text-gray-900">
            {formatWaitClock(elapsedSec)}
          </p>
          {!overFree && freeSec > 0 ? (
            <p className="mt-1 text-[11px] text-gray-500">
              Free wait left · {formatWaitClock(remainingFreeSec)}
              {freeWaitMinutes > 0 ? ` (of ${freeWaitMinutes} min)` : ""}
            </p>
          ) : null}
          {!overFree && freeSec === 0 ? (
            <p className="mt-1 text-[11px] text-gray-500">Driver is waiting at pickup</p>
          ) : null}
        </div>
      </div>

      {overFree ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-white/80 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 text-xs text-amber-900">
            <p className="font-bold">Waiting charges will be applied</p>
            <p className="mt-0.5 text-amber-800/90">
              Free wait of {freeWaitMinutes || 0} min is over.
              {rate > 0
                ? ` Extra wait is charged at ${formatInr(rate)}/min${
                    billableMin > 0 ? ` (~${formatInr(billableMin * rate)} so far)` : ""
                  }.`
                : " Extra waiting time may be added to your fare."}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VehicleGlyph({ vehicle }) {
  if (vehicle?.iconUrl) {
    return (
      <img
        src={vehicle.iconUrl}
        alt=""
        className="h-8 w-8 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }
  const cat = String(vehicle?.category || vehicle?.name || "").toLowerCase();
  if (/\bbike\b/.test(cat)) return <Bike className="h-5 w-5 text-[#FF6A00]" />;
  if (/\bauto\b/.test(cat)) return <span className="text-xl">🛺</span>;
  if (/\bsuv\b/.test(cat)) return <span className="text-xl">🚙</span>;
  return <Car className="h-5 w-5 text-[#FF6A00]" />;
}

function formatKm(meters) {
  if (meters == null || !Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Multi-step booking sheet:
 * vehicles → confirm → finding → driver → trip → payment
 * Supports minimize / maximize for live ride phases.
 */
export default function TaxiBookingSheet({
  open,
  phase, // 'vehicles' | 'confirm' | 'finding' | 'driver' | 'trip' | 'payment'
  minimized = false,
  inline = false,
  onMinimize,
  onExpand,
  onClose,
  onSelectVehicle,
  onConfirmBook,
  onCancelRide,
  onPayWallet,
  onPayRazorpay,
  paymentBusy = false,
  pickupLabel = "",
  dropLabel = "",
  vehicles = [],
  quotesByVehicle = {},
  quotesLoading = false,
  selectedVehicle = null,
  selectedQuote = null,
  booking = false,
  activeRide = null,
  liveDistanceMeters = null,
  liveEtaMinutes = null,
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (phase !== "finding") return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 700);
    return () => clearInterval(t);
  }, [phase]);

  const title = useMemo(() => {
    if (phase === "vehicles") return "Choose a ride";
    if (phase === "confirm") return "Confirm booking";
    if (phase === "finding") return "Finding your ride";
    if (phase === "driver") {
      if (activeRide?.status === "arrived") return "Driver arrived";
      return "Driver on the way";
    }
    if (phase === "trip") return "Trip in progress";
    if (phase === "payment") return "Pay for your ride";
    return "Book ride";
  }, [phase, activeRide?.status]);

  const canDismiss = phase === "vehicles" || phase === "confirm";
  const isLivePhase =
    phase === "finding" ||
    phase === "driver" ||
    phase === "trip" ||
    phase === "payment";

  const fare = Number(
    activeRide?.fare?.total ??
      activeRide?.fareBreakdown?.total ??
      activeRide?.fareEstimateTotal ??
      selectedQuote?.fare ??
      0,
  );

  const mapsTarget = useMemo(() => {
    if (!activeRide) return null;
    if (LIVE.has(activeRide.status)) {
      return {
        lat: activeRide.drop?.lat,
        lng: activeRide.drop?.lng,
        label: activeRide.drop?.address || "Drop",
      };
    }
    return {
      lat: activeRide.pickup?.lat,
      lng: activeRide.pickup?.lng,
      label: activeRide.pickup?.address || "Pickup",
    };
  }, [activeRide]);

  const mapsUrl = mapsTarget
    ? googleMapsNavUrl(mapsTarget.lat, mapsTarget.lng, mapsTarget.label)
    : null;

  const statusBanner = useMemo(() => {
    if (!activeRide) return null;
    if (activeRide.status === "awaiting_payment") {
      return activeRide.payment?.status === "paid"
        ? "Payment received — driver will complete the ride"
        : "Trip finished — please pay to complete";
    }
    if (activeRide.status === "arrived") return "Driver has arrived — share your OTP";
    if (ASSIGNED.has(activeRide.status)) return "Driver is on the way to pickup";
    if (LIVE.has(activeRide.status)) return "You're on the trip — enjoy the ride";
    if (SEARCHING.has(activeRide.status)) return "Looking for nearby drivers";
    return null;
  }, [activeRide]);

  // Minimized floating bar for live phases
  if (open && minimized && isLivePhase && !inline) {
    return (
      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[600] px-3">
        <button
          type="button"
          onClick={onExpand}
          className="mx-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/95 px-4 py-3 text-left text-white shadow-2xl backdrop-blur-md"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">
              {title}
            </p>
            <p className="truncate text-sm font-bold">
              {activeRide?.driver?.name || "Your ride"}
              {Number.isFinite(fare) && fare > 0 ? ` · ${formatInr(fare)}` : ""}
            </p>
            <p className="mt-0.5 text-[11px] text-white/70">
              {activeRide?.status === "arrived"
                ? "Driver waiting · share OTP"
                : `${formatKm(liveDistanceMeters)}${
                    liveEtaMinutes != null ? ` · ~${liveEtaMinutes} min` : ""
                  }`}
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6A00]">
            <ChevronUp className="h-5 w-5" />
          </span>
        </button>
      </div>
    );
  }

  const liveRideBody =
    (phase === "driver" || phase === "trip" || phase === "payment") && activeRide ? (
      <div className="space-y-4 pb-2">
        {statusBanner ? (
          <div
            className={`rounded-2xl px-3 py-2.5 text-center text-xs font-bold ${
              activeRide.status === "arrived" || activeRide.status === "awaiting_payment"
                ? "border border-[#FF6A00]/25 bg-[#FFF4ED] text-[#FF6A00]"
                : "border border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}
          >
            {statusBanner}
          </div>
        ) : null}

        {String(activeRide.status || "").toLowerCase() === "arrived" ? (
          <PassengerWaitTimer
            arrivedAt={activeRide.arrivedAt}
            freeWaitMinutes={activeRide.waitPolicy?.freeWaitMinutes}
            perMinWaitRate={activeRide.waitPolicy?.perMinWaitRate}
          />
        ) : null}

        {phase === "payment" ? (
          <div className="space-y-3">
            <div className="space-y-1 rounded-2xl bg-gray-50 px-3 py-3 text-xs text-gray-600">
              {[
                ["Base", activeRide.fareBreakdown?.base ?? activeRide.fare?.base],
                ["Distance", activeRide.fareBreakdown?.distance ?? activeRide.fare?.distance],
                ["Time", activeRide.fareBreakdown?.time ?? activeRide.fare?.time],
                ["Waiting", activeRide.fareBreakdown?.waiting ?? activeRide.fare?.waiting],
                ["Platform fee", activeRide.fareBreakdown?.platformFee ?? activeRide.fare?.platformFee],
              ]
                .filter(([, v]) => v != null && Number(v) !== 0)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span>{label}</span>
                    <span className="font-semibold text-gray-900">{formatInr(value)}</span>
                  </div>
                ))}
              <div className="flex justify-between gap-2 border-t border-gray-200 pt-2 text-sm font-extrabold text-gray-900">
                <span>Total</span>
                <span>{formatInr(fare)}</span>
              </div>
            </div>

            {activeRide.payment?.status === "paid" ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-xs font-bold text-emerald-700">
                Paid via {String(activeRide.payment?.method || "").replace(/_/g, " ")}
              </div>
            ) : (
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={paymentBusy}
                  onClick={onPayWallet}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#FF6A00] text-sm font-bold text-white disabled:opacity-50"
                >
                  {paymentBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Pay with wallet
                </button>
                <button
                  type="button"
                  disabled={paymentBusy}
                  onClick={onPayRazorpay}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-900 disabled:opacity-50"
                >
                  Pay online (Razorpay)
                </button>
                <p className="text-center text-[11px] text-gray-500">
                  Or pay the driver’s QR / cash — this screen updates automatically.
                </p>
              </div>
            )}
          </div>
        ) : null}

        {phase !== "payment" ? (
        <>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-gray-50 px-2.5 py-2.5 text-center">
            <p className="text-sm font-extrabold leading-tight text-gray-900">
              {formatInr(fare)}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-gray-500">
              fare
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-2.5 py-2.5 text-center">
            <p className="text-sm font-extrabold leading-tight text-gray-900">
              {formatKm(liveDistanceMeters)}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-gray-500">
              remaining
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-2.5 py-2.5 text-center">
            <p className="text-sm font-extrabold leading-tight text-[#FF6A00]">
              {liveEtaMinutes != null ? `${liveEtaMinutes} min` : "—"}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-gray-500">
              to reach
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 text-lg font-bold text-gray-600">
            {activeRide.driver?.photo ? (
              <img
                src={activeRide.driver.photo}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              (activeRide.driver?.name || "D").charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-gray-900">
              {activeRide.driver?.name || "Your driver"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {Number(activeRide.driver?.rating || 0).toFixed(1)}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-gray-700">
              {activeRide.driver?.vehicleType ||
                activeRide.vehicleType?.name ||
                "Vehicle"}
              {activeRide.driver?.vehicleNumber
                ? ` · ${activeRide.driver.vehicleNumber}`
                : ""}
            </p>
          </div>
        </div>

        {(() => {
          const status = String(activeRide.status || "").toLowerCase();
          const hideCall = status === "arrived" || phase === "trip" || LIVE.has(status);
          const showMaps = phase === "trip" && mapsUrl;

          if (hideCall && !showMaps) return null;

          if (hideCall && showMaps) {
            return (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#FF6A00]/30 bg-[#FFF4ED] text-sm font-bold text-[#FF6A00]"
              >
                <Navigation className="h-4 w-4" />
                Open Maps
              </a>
            );
          }

          return (
            <div className={`grid gap-2 ${showMaps ? "grid-cols-2" : "grid-cols-1"}`}>
              {activeRide.driver?.phone ? (
                <a
                  href={`tel:${activeRide.driver.phone}`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#FF6A00] text-sm font-bold text-white"
                >
                  <Phone className="h-4 w-4" />
                  Call driver
                </a>
              ) : (
                <div className="inline-flex h-12 items-center justify-center rounded-2xl bg-gray-100 text-sm font-bold text-gray-400">
                  Call unavailable
                </div>
              )}
              {showMaps ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-800"
                >
                  <Navigation className="h-4 w-4 text-[#FF6A00]" />
                  Open Maps
                </a>
              ) : null}
            </div>
          );
        })()}

        {phase === "driver" && activeRide.rideOtp ? (
          <div className="rounded-2xl border border-dashed border-[#FF6A00]/40 bg-[#FFF4ED] px-4 py-4 text-center">
            <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#FF6A00]">
              <Shield className="h-3.5 w-3.5" />
              Share OTP with driver
            </p>
            <p className="mt-2 font-mono text-3xl font-extrabold tracking-[0.35em] text-gray-900">
              {activeRide.rideOtp}
            </p>
            <p className="mt-2 text-[11px] text-gray-500">
              Driver will enter this OTP to start the trip
            </p>
          </div>
        ) : null}

        {phase === "trip" ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-3 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Trip started · heading to drop
          </div>
        ) : null}

        <div className="rounded-2xl bg-gray-50 px-3 py-3 text-xs text-gray-600">
          <p>
            <span className="font-bold text-gray-900">Ride · </span>
            {activeRide.rideNumber}
          </p>
          <p className="mt-1 line-clamp-2">
            <span className="font-bold text-gray-900">
              {LIVE.has(activeRide.status) ? "Drop · " : "Pickup · "}
            </span>
            {LIVE.has(activeRide.status)
              ? activeRide.drop?.address || dropLabel
              : activeRide.pickup?.address || pickupLabel}
          </p>
        </div>

        {SEARCHING.has(activeRide.status) || ASSIGNED.has(activeRide.status) ? (
          <button
            type="button"
            onClick={onCancelRide}
            className="h-11 w-full rounded-2xl border border-gray-200 text-sm font-bold text-gray-700"
          >
            Cancel ride
          </button>
        ) : null}
        </>
        ) : null}
      </div>
    ) : null;

  // Compact inline panel under tracking map
  if (inline && open && activeRide) {
    return (
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFF4ED] to-gray-100 text-base font-bold text-[#FF6A00] ring-1 ring-gray-100">
            {activeRide.driver?.photo ? (
              <img
                src={activeRide.driver.photo}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              (activeRide.driver?.name || "D").charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold leading-tight text-gray-900">
              {activeRide.driver?.name || "Your driver"}
            </p>
            <p className="mt-0.5 truncate text-[11px] leading-tight text-gray-500">
              <Star className="mr-0.5 inline h-3 w-3 fill-amber-400 text-amber-400" />
              {Number(activeRide.driver?.rating || 0).toFixed(1)}
              {" · "}
              {activeRide.driver?.vehicleNumber ||
                activeRide.driver?.vehicleType ||
                activeRide.vehicleType?.name ||
                "Vehicle"}
            </p>
          </div>
          {activeRide.driver?.phone ? (
            <a
              href={`tel:${activeRide.driver.phone}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6A00] text-white shadow-md shadow-[#FF6A00]/25"
              aria-label="Call driver"
            >
              <Phone className="h-4 w-4" />
            </a>
          ) : null}
        </div>

        {activeRide.rideOtp ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#FFF4ED] px-3 py-2.5">
            <div>
              <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#FF6A00]">
                <Shield className="h-3 w-3" />
                Share OTP
              </p>
              <p className="text-[11px] text-gray-500">Give this to your driver</p>
            </div>
            <p className="font-mono text-2xl font-extrabold tracking-[0.28em] text-gray-900">
              {activeRide.rideOtp}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onCancelRide}
          className="mt-3 h-10 w-full rounded-xl border border-gray-200 text-xs font-bold text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          Cancel ride
        </button>
      </div>
    );
  }

  return (
    <BottomSheet
      open={open && !minimized}
      onClose={canDismiss ? onClose : () => onMinimize?.()}
      title={title}
      className="max-h-[88vh] overflow-y-auto"
      showClose={canDismiss}
      dismissOnBackdrop={canDismiss}
      headerRight={
        isLivePhase ? (
          <button
            type="button"
            onClick={onMinimize}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600"
            aria-label="Minimize"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        ) : null
      }
    >
      {/* Route summary */}
      {(phase === "vehicles" || phase === "confirm") && (
        <div className="mb-4 space-y-2 rounded-2xl bg-gray-50 px-3 py-3 text-xs text-gray-600">
          <div className="flex items-start gap-2">
            <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="min-w-0">
              <span className="font-bold text-gray-900">Pickup · </span>
              {pickupLabel || "—"}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF6A00]" />
            <span className="min-w-0">
              <span className="font-bold text-gray-900">Drop · </span>
              {dropLabel || "—"}
            </span>
          </div>
        </div>
      )}

      {/* Vehicles list */}
      {phase === "vehicles" && (
        <div className="space-y-2 pb-2">
          {quotesLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#FF6A00]" />
              Calculating fares…
            </div>
          ) : null}

          {!quotesLoading && !vehicles.length ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No vehicle types available. Add them in Taxi Admin.
            </p>
          ) : null}

          {!quotesLoading &&
            vehicles.map((vehicle) => {
              const quote = quotesByVehicle[vehicle.id];
              const available = quote?.ok;
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  disabled={!available}
                  onClick={() => available && onSelectVehicle?.(vehicle)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition active:scale-[0.99] ${
                    available
                      ? "border-gray-100 bg-white shadow-sm hover:border-[#FF6A00]/40"
                      : "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60"
                  }`}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF4ED]">
                    <VehicleGlyph vehicle={vehicle} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-gray-900">
                      {vehicle.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-gray-500">
                      {available
                        ? `${Number(quote.distanceKm || 0).toFixed(1)} km · ~${Math.max(
                            1,
                            Math.round(quote.durationMin || 0),
                          )} min`
                        : quote?.message || "Pricing not configured"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {available ? (
                      <>
                        <span className="block text-base font-extrabold text-gray-900">
                          {formatInr(quote.fare)}
                        </span>
                        <span className="text-[10px] font-semibold text-[#FF6A00]">
                          Select
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] font-semibold text-gray-400">N/A</span>
                    )}
                  </span>
                </button>
              );
            })}
        </div>
      )}

      {/* Confirm */}
      {phase === "confirm" && selectedVehicle && (
        <div className="space-y-4 pb-2">
          <div className="flex items-center gap-3 rounded-2xl border border-[#FF6A00]/20 bg-[#FFF4ED] px-3 py-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <VehicleGlyph vehicle={selectedVehicle} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-gray-900">{selectedVehicle.name}</p>
              <p className="text-xs text-gray-500">
                {selectedQuote?.ok
                  ? `${Number(selectedQuote.distanceKm || 0).toFixed(1)} km · ~${Math.max(
                      1,
                      Math.round(selectedQuote.durationMin || 0),
                    )} min`
                  : "—"}
              </p>
            </div>
            <p className="text-xl font-extrabold text-gray-900">
              {selectedQuote?.ok ? formatInr(selectedQuote.fare) : "—"}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-12 flex-1 rounded-2xl border border-gray-200 text-sm font-bold text-gray-700"
            >
              Back
            </button>
            <button
              type="button"
              disabled={booking || !selectedQuote?.ok}
              onClick={onConfirmBook}
              className="inline-flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-[#FF6A00] text-sm font-bold text-white shadow-md shadow-[#FF6A00]/30 disabled:opacity-60"
            >
              {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm & book
            </button>
          </div>
        </div>
      )}

      {/* Finding */}
      {phase === "finding" && (
        <div className="space-y-5 py-4 text-center">
          <div className="relative mx-auto h-24 w-24">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#FF6A00]/20" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-[#FFF4ED]">
              <Loader2
                className={`h-10 w-10 text-[#FF6A00] ${tick % 2 === 0 ? "animate-spin" : ""}`}
              />
            </div>
          </div>
          <div>
            <p className="text-lg font-extrabold text-gray-900">Finding a ride for you</p>
            <p className="mt-1 text-sm text-gray-500">
              We’re notifying nearby drivers. This usually takes a few seconds.
            </p>
            {activeRide?.rideNumber ? (
              <p className="mt-2 text-xs font-semibold text-gray-400">
                Ride {activeRide.rideNumber}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCancelRide}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-gray-200 px-5 text-sm font-bold text-gray-700"
          >
            <X className="h-4 w-4" />
            Cancel request
          </button>
        </div>
      )}

      {liveRideBody}
    </BottomSheet>
  );
}
