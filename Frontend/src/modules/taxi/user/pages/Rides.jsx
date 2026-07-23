import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Car, Clock3, MapPin } from "lucide-react";
import TaxiBottomNav from "../components/layout/BottomNav";
import { getTaxiHomePath } from "../utils/routes";

const TABS = [
  { id: "active", label: "Active" },
  { id: "scheduled", label: "Scheduled" },
  { id: "history", label: "History" },
];

const EMPTY = {
  active: {
    title: "No active ride",
    subtitle: "When you book a taxi, live trip details will appear here.",
  },
  scheduled: {
    title: "No scheduled rides",
    subtitle: "Plan a ride for later — scheduled bookings will show up here.",
  },
  history: {
    title: "No ride history yet",
    subtitle: "Completed trips, invoices, and receipts will be listed here.",
  },
};

export default function TaxiRides() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("active");
  const empty = useMemo(() => EMPTY[tab], [tab]);

  return (
    <div className="min-h-screen bg-[#F7F7F8] pb-28">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(getTaxiHomePath())}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-gray-900">Rides</h1>
            <p className="text-[11px] text-gray-500">Active, scheduled & history</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg py-2 text-[11px] font-bold uppercase tracking-wide transition ${
                tab === item.id
                  ? "bg-white text-[#FF6A00] shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6A00]/10 text-[#FF6A00]">
            {tab === "active" ? (
              <Car className="h-6 w-6" />
            ) : tab === "scheduled" ? (
              <Clock3 className="h-6 w-6" />
            ) : (
              <MapPin className="h-6 w-6" />
            )}
          </div>
          <h2 className="mt-4 text-base font-extrabold text-gray-900">
            {empty.title}
          </h2>
          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-gray-500">
            {empty.subtitle}
          </p>
          <button
            type="button"
            onClick={() => navigate(getTaxiHomePath())}
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-[#FF6A00] px-4 text-xs font-bold text-white"
          >
            Book a ride
          </button>
        </div>
      </main>

      <TaxiBottomNav />
    </div>
  );
}
