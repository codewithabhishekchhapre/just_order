import { lazy, Suspense, useState } from "react";
import { Check, MapPin, Move } from "lucide-react";
import TaxiMapPreview from "../MapPreview";

const MapPicker = lazy(() => import("@/shared/components/MapPicker"));

export default function PickupMapCard({
  addressLabel = "Move pin to set pickup",
  initialLocation = null,
  onConfirm,
  onPickupChange,
  confirming = false,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [localLabel, setLocalLabel] = useState(null);

  const displayLabel = localLabel || addressLabel;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="relative block w-full text-left"
          aria-label="Adjust pickup on map"
        >
          <TaxiMapPreview height={168} pin rounded="rounded-none" />
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-gray-700 shadow-sm">
            <Move className="h-3 w-3 text-[#FF6A00]" />
            Tap to move pin
          </span>
        </button>
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <MapPin className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Pickup pin
            </p>
            <p className="truncate text-xs font-semibold text-gray-900">
              {displayLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#FF6A00] px-3 text-[11px] font-bold text-white shadow-sm shadow-[#FF6A00]/25 active:scale-95 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" />
            Confirm
          </button>
        </div>
      </div>

      {pickerOpen ? (
        <Suspense fallback={null}>
          <MapPicker
            isOpen={pickerOpen}
            onClose={() => setPickerOpen(false)}
            initialLocation={initialLocation}
            title="Select Pickup Location"
            onConfirm={(payload) => {
              const nextAddress =
                payload?.address ||
                payload?.formattedAddress ||
                payload?.label ||
                null;
              if (nextAddress) setLocalLabel(nextAddress);
              onPickupChange?.(payload);
              setPickerOpen(false);
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}
