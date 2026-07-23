import { useMemo, useState } from "react";
import { ChevronUp, Radio } from "lucide-react";
import { useDeliveryStore } from "@/modules/DeliveryV2/store/useDeliveryStore";
import { buildFeedRequestViewModel } from "@/modules/DeliveryV2/utils/feedRequestFormatters";
import { RequestCard } from "./RequestCard";
import { FeedRequestSkeleton } from "./FeedRequestSkeleton";
import { FeedEmptyState, FeedErrorState } from "./FeedEmptyState";

/**
 * Bottom feed panel shown over the map when the driver has no active trip.
 * Lists queued offers with compact cards; does not own accept/reject logic.
 */
export function DriverFeedPanel({
  isOnline,
  offers = [],
  loading = false,
  error = null,
  onRetry,
  onGoOnline,
  onAccept,
  onDecline,
  onOpenOffer,
  busyOrderId = null,
  className = "",
}) {
  const riderLocation = useDeliveryStore((s) => s.riderLocation);
  const [expandedId, setExpandedId] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const viewModels = useMemo(
    () =>
      (offers || [])
        .map((order) => buildFeedRequestViewModel(order, { riderLocation }))
        .filter(Boolean),
    [offers, riderLocation],
  );

  const countLabel =
    viewModels.length === 0
      ? "Waiting"
      : `${viewModels.length} request${viewModels.length === 1 ? "" : "s"}`;

  return (
    <section
      className={`pointer-events-auto w-full max-w-lg mx-auto ${className}`}
      aria-label="Driver request feed"
    >
      <div className="rounded-t-3xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-[0_-12px_40px_rgba(15,23,42,0.12)] overflow-hidden">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="w-full px-4 pt-2.5 pb-2 flex flex-col items-center active:bg-slate-50"
          aria-expanded={!collapsed}
        >
          <span className="w-10 h-1 rounded-full bg-slate-300 mb-2" />
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <div className="min-w-0 text-left">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {isOnline ? "Nearby requests" : "Feed paused"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{countLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
              <Radio className="w-3.5 h-3.5" />
              <ChevronUp
                className={`w-4 h-4 transition-transform ${
                  collapsed ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
        </button>

        {!collapsed ? (
          <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[42vh] overflow-y-auto overscroll-contain no-scrollbar space-y-2.5">
            {loading ? <FeedRequestSkeleton count={2} /> : null}

            {!loading && error ? (
              <FeedErrorState message={error} onRetry={onRetry} />
            ) : null}

            {!loading && !error && viewModels.length === 0 ? (
              <FeedEmptyState isOnline={isOnline} onGoOnline={onGoOnline} />
            ) : null}

            {!loading &&
              !error &&
              viewModels.map((vm, index) => {
                const orderKey = vm.id;
                const busy =
                  busyOrderId != null &&
                  String(busyOrderId) === String(vm.requestId || vm.id);
                return (
                  <RequestCard
                    key={orderKey}
                    viewModel={vm}
                    order={vm.raw}
                    highlighted={index === 0 && isOnline}
                    expanded={expandedId === orderKey}
                    accepting={busy}
                    onAccept={
                      onAccept
                        ? () => onAccept(vm.raw)
                        : undefined
                    }
                    onDecline={
                      onDecline
                        ? () => onDecline(vm.raw)
                        : undefined
                    }
                    onViewDetails={() => {
                      setExpandedId((prev) =>
                        prev === orderKey ? null : orderKey,
                      );
                      onOpenOffer?.(vm.raw);
                    }}
                  />
                );
              })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
