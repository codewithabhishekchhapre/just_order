import { formatInr } from "../../utils/mock/vehicles";

function VehicleIcon({ vehicle }) {
  if (vehicle.iconUrl) {
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
  return <span className="text-xl leading-none">{vehicle.icon || "🚕"}</span>;
}

export default function ServiceCards({
  vehicles = [],
  loading = false,
  selectedId = null,
  quotesByVehicle = {},
  onSelect,
}) {
  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[96px] w-[92px] shrink-0 animate-pulse rounded-2xl bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (!vehicles.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-xs text-gray-500">
        No taxi services available right now.
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {vehicles.map((vehicle) => {
        const quote = quotesByVehicle[vehicle.id];
        const available = quote?.ok;
        const active = selectedId === vehicle.id;
        const fareLabel = available
          ? formatInr(quote.fare)
          : quote
            ? "N/A"
            : "—";

        return (
          <button
            key={vehicle.id}
            type="button"
            onClick={() => onSelect?.(vehicle)}
            className={`w-[92px] shrink-0 rounded-2xl border px-2 py-2.5 text-center transition active:scale-95 ${
              active && available
                ? "border-[#FF6A00] bg-[#FFF4ED] shadow-sm shadow-[#FF6A00]/15"
                : available
                  ? "border-gray-100 bg-white shadow-sm"
                  : "border-gray-100 bg-gray-50 opacity-70"
            }`}
          >
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50">
              <VehicleIcon vehicle={vehicle} />
            </div>
            <p className="mt-1.5 truncate text-[11px] font-bold text-gray-900">
              {vehicle.name}
            </p>
            <p
              className={`mt-0.5 text-[10px] font-semibold ${
                available ? "text-[#FF6A00]" : "text-gray-400"
              }`}
            >
              {fareLabel}
            </p>
          </button>
        );
      })}
    </div>
  );
}
