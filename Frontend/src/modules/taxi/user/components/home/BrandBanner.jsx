import { useCompanyName } from "@food/hooks/useCompanyName";

export default function BrandBanner() {
  const companyName = useCompanyName();

  return (
    <section className="overflow-hidden rounded-2xl border border-[#FF6A00]/15 bg-gradient-to-br from-[#FFF7F0] via-white to-[#FFF1E8] px-4 py-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF6A00]">
        Just Order Taxi
      </p>
      <h3 className="mt-1.5 text-lg font-black leading-snug text-gray-900">
        {companyName || "Just Order"} — Made for India,
        <br />
        Crafted in Indore.
      </h3>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-gray-500">
        Premium city rides with verified partners, transparent fares, and a
        booking experience built for everyday India.
      </p>
      <div className="mt-4 flex gap-2">
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-gray-700 shadow-sm border border-gray-100">
          Safe rides
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-gray-700 shadow-sm border border-gray-100">
          Fair pricing
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-gray-700 shadow-sm border border-gray-100">
          24×7 support
        </span>
      </div>
    </section>
  );
}
