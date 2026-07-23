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
  onSelect,
}) {
  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[88px] w-[84px] shrink-0 animate-pulse rounded-2xl bg-gray-100"
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
        const active = selectedId === vehicle.id;
        return (
          <button
            key={vehicle.id}
            type="button"
            onClick={() => onSelect?.(vehicle)}
            className={`w-[84px] shrink-0 rounded-2xl border px-2 py-2.5 text-center transition active:scale-95 ${
              active
                ? "border-[#FF6A00] bg-[#FFF4ED] shadow-sm shadow-[#FF6A00]/15"
                : "border-gray-100 bg-white shadow-sm"
            }`}
          >
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50">
              <VehicleIcon vehicle={vehicle} />
            </div>
            <p className="mt-1.5 truncate text-[11px] font-bold text-gray-900">
              {vehicle.name}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#FF6A00]">
              {formatInr(vehicle.baseFare)}+
            </p>
          </button>
        );
      })}
    </div>
  );
}
