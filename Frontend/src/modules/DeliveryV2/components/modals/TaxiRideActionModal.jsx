import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  MapPin,
  Navigation,
  Shield,
} from "lucide-react";
import ActionSlider from "@/modules/DeliveryV2/components/ui/ActionSlider";

const OTP_LEN = 6;

/**
 * Partner-side taxi ride actions:
 * - Going to pickup → Arrived
 * - At pickup → enter rider OTP → Start trip
 * - Going to drop → Complete ride
 */
export default function TaxiRideActionModal({
  order,
  status,
  isWithinRange = true,
  distanceToTarget,
  eta,
  onArrivedPickup,
  onStartTrip,
  onCompleteTrip,
  onMinimize,
  busy = false,
}) {
  const [otpDigits, setOtpDigits] = useState(Array(OTP_LEN).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const pickupAddress =
    order?.pickup?.address ||
    order?.restaurantLocation?.address ||
    "Pickup location";
  const dropAddress =
    order?.drop?.address ||
    order?.customerLocation?.address ||
    "Drop location";
  const fare = Number(
    order?.fareEstimateTotal ?? order?.fare?.total ?? order?.total ?? 0,
  );
  const rideLabel = order?.rideNumber || order?.orderId || "Taxi ride";

  const distanceKm =
    distanceToTarget != null && distanceToTarget !== Infinity
      ? (distanceToTarget / 1000).toFixed(1)
      : null;

  const otpValue = otpDigits.join("");
  const otpReady = otpValue.length === OTP_LEN && /^\d+$/.test(otpValue);

  const setOtpAt = (index, value) => {
    const digit = String(value || "").replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    setError("");
    if (digit && index < OTP_LEN - 1) {
      const el = document.getElementById(`taxi-otp-${index + 1}`);
      el?.focus();
    }
  };

  const onOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      document.getElementById(`taxi-otp-${index - 1}`)?.focus();
    }
  };

  const run = async (fn) => {
    if (!fn || submitting || busy) return;
    setSubmitting(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  const phase =
    status === "PICKING_UP"
      ? "to_pickup"
      : status === "REACHED_PICKUP"
        ? "at_pickup"
        : status === "PICKED_UP" || status === "REACHED_DROP"
          ? "to_drop"
          : "other";

  return (
    <div className="absolute bottom-0 inset-x-0 z-[120]">
      <div className="mx-auto w-full max-w-lg rounded-t-[2rem] border-t border-gray-100 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.25)]">
        <div className="mb-3 flex justify-center">
          <button
            type="button"
            onClick={onMinimize}
            className="rounded-full p-1 hover:bg-gray-100"
            aria-label="Minimize"
          >
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#FF6A00]">
              Taxi · {rideLabel}
            </p>
            <h3 className="mt-0.5 text-xl font-extrabold text-gray-950">
              {phase === "to_pickup"
                ? "Go to pickup"
                : phase === "at_pickup"
                  ? "Verify & start"
                  : "Go to drop"}
            </h3>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold text-emerald-700">Fare</p>
            <p className="text-sm font-extrabold text-emerald-800">
              ₹{Number.isFinite(fare) ? fare.toFixed(0) : "—"}
            </p>
          </div>
        </div>

        <div className="mb-4 space-y-2 rounded-2xl bg-gray-50 px-3 py-3 text-xs text-gray-600">
          <div className="flex items-start gap-2">
            <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span className="min-w-0">
              <span className="font-bold text-gray-900">Pickup · </span>
              {pickupAddress}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF6A00]" />
            <span className="min-w-0">
              <span className="font-bold text-gray-900">Drop · </span>
              {dropAddress}
            </span>
          </div>
          {(distanceKm || eta) && (
            <p className="pt-1 text-[11px] font-semibold text-gray-500">
              {distanceKm ? `${distanceKm} km` : "—"}
              {eta ? ` · ~${eta} min` : ""}
              {!isWithinRange ? " · Get closer to unlock action" : ""}
            </p>
          )}
        </div>

        {error ? (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            {error}
          </p>
        ) : null}

        {phase === "to_pickup" && (
          <ActionSlider
            disabled={!isWithinRange || submitting || busy}
            label={
              submitting
                ? "Updating…"
                : isWithinRange
                  ? "Swipe when arrived at pickup"
                  : "Get closer to pickup"
            }
            lockedLabel={
              distanceKm
                ? `${distanceKm} km away · move closer`
                : "Get closer to pickup"
            }
            onConfirm={() => run(onArrivedPickup)}
          />
        )}

        {phase === "at_pickup" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-dashed border-[#FF6A00]/35 bg-[#FFF4ED] px-3 py-3 text-center">
              <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#FF6A00]">
                <Shield className="h-3.5 w-3.5" />
                Enter rider OTP to start
              </p>
              <div className="mt-3 flex justify-center gap-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    id={`taxi-otp-${index}`}
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => setOtpAt(index, e.target.value)}
                    onKeyDown={(e) => onOtpKeyDown(index, e)}
                    className="h-11 w-10 rounded-xl border border-gray-200 text-center text-lg font-extrabold text-gray-900 outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20"
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={!otpReady || submitting || busy}
              onClick={() => run(() => onStartTrip(otpValue))}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6A00] text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Start trip
            </button>
          </div>
        )}

        {phase === "to_drop" && (
          <ActionSlider
            disabled={submitting || busy}
            label={
              submitting ? "Completing…" : "Swipe to complete ride"
            }
            lockedLabel="Completing…"
            onConfirm={() => run(onCompleteTrip)}
          />
        )}
      </div>
    </div>
  );
}
