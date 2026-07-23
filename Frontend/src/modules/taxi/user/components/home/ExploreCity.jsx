import { getPlacesForCity } from "../../utils/mock/places";

export default function ExploreCity({ city = "", onSelectPlace }) {
  const places = getPlacesForCity(city);
  const cityLabel = city?.split(",")[0]?.trim() || "your city";

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-2 px-0.5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Explore
          </p>
          <h3 className="text-sm font-extrabold text-gray-900">
            Popular in {cityLabel}
          </h3>
        </div>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {places.map((place) => (
          <button
            key={place.id}
            type="button"
            onClick={() => onSelectPlace?.(place)}
            className="w-[120px] shrink-0 rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm active:scale-[0.98]"
          >
            <span className="text-2xl leading-none">{place.emoji}</span>
            <p className="mt-2 truncate text-xs font-bold text-gray-900">
              {place.name}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-gray-500">
              {place.type}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
