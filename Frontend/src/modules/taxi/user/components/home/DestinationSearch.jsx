import { Crosshair, Search } from "lucide-react";

export default function DestinationSearch({
  value = "",
  onChange,
  onFocus,
  onUseCurrentLocation,
  placeholder = "Where are you going?",
}) {
  return (
    <div className="relative flex items-center">
      <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#FF6A00]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-12 text-sm font-medium text-gray-900 shadow-sm placeholder:text-gray-400 outline-none focus:border-[#FF6A00]/40 focus:ring-2 focus:ring-[#FF6A00]/15"
      />
      <button
        type="button"
        onClick={onUseCurrentLocation}
        className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6A00]/10 text-[#FF6A00] active:scale-95"
        aria-label="Use current location"
        title="Use current location"
      >
        <Crosshair className="h-4 w-4" />
      </button>
    </div>
  );
}
