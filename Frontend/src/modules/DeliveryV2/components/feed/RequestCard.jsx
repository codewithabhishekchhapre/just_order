import {
  Banknote,
  Clock3,
  CreditCard,
  MapPin,
  Navigation,
  Route,
} from "lucide-react";
import { cn } from "@food/utils/utils";
import { buildFeedRequestViewModel } from "@/modules/DeliveryV2/utils/feedRequestFormatters";
import { ServiceBadge, StatusBadge } from "./StatusBadge";
import { FeedActionButton } from "./FeedActionButton";

function RouteStop({ tone, label, title, address }) {
  const toneClass =
    tone === "drop"
      ? "bg-sky-500 ring-sky-100"
      : "bg-primary-orange ring-orange-100";

  return (
    <div className="flex gap-2.5 min-w-0">
      <div className="flex flex-col items-center pt-1">
        <span
          className={cn("w-2.5 h-2.5 rounded-full ring-4 shrink-0", toneClass)}
        />
        {tone === "pickup" ? (
          <span className="w-px flex-1 min-h-4 bg-slate-200 my-1" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="text-sm font-bold text-slate-900 truncate leading-snug">
          {title}
        </p>
        <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug mt-0.5">
          {address}
        </p>
      </div>
    </div>
  );
}

function StatChip({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5 min-w-0">
      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 leading-none">
          {label}
        </p>
        <p className="text-[11px] font-bold text-slate-800 truncate mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

/**
 * Compact, mobile-first request card for Driver Feed / offer queue.
 * Presentational only — callers own accept/decline/details handlers.
 */
export function RequestCard({
  order,
  viewModel: viewModelProp,
  expiresInSec,
  riderLocation,
  highlighted = false,
  expanded = false,
  accepting = false,
  declining = false,
  onAccept,
  onDecline,
  onViewDetails,
  className,
}) {
  const vm =
    viewModelProp ||
    buildFeedRequestViewModel(order, { expiresInSec, riderLocation });
  if (!vm) return null;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-white shadow-sm overflow-hidden",
        highlighted
          ? "border-primary-orange/40 shadow-orange-500/10 ring-1 ring-primary-orange/20"
          : "border-slate-200",
        className,
      )}
    >
      <div className="px-3.5 pt-3 pb-2.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <ServiceBadge label={vm.serviceLabel} />
            <StatusBadge statusKey={vm.statusKey} />
            {vm.expiresInSec != null && vm.expiresInSec <= 30 ? (
              <StatusBadge
                statusKey="expiring"
                label={`${Math.max(0, vm.expiresInSec)}s`}
              />
            ) : null}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Earn
            </p>
            <p className="text-lg font-black text-emerald-600 tabular-nums leading-none">
              {vm.earningsLabel || "—"}
            </p>
          </div>
        </div>

        <div className="space-y-0">
          <RouteStop
            tone="pickup"
            label="Pickup"
            title={vm.pickup.title}
            address={vm.pickup.address}
          />
          <RouteStop
            tone="drop"
            label="Drop"
            title={vm.drop.title}
            address={vm.drop.address}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <StatChip
            icon={Navigation}
            label="To pickup"
            value={vm.pickupDistanceLabel}
          />
          <StatChip
            icon={Route}
            label="Trip"
            value={vm.tripDistanceLabel}
          />
          <StatChip icon={Clock3} label="ETA" value={vm.etaLabel} />
          <StatChip
            icon={CreditCard}
            label="Pay"
            value={vm.paymentLabel}
          />
        </div>

        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-medium">
          <span className="truncate">
            ID {vm.requestId ? String(vm.requestId).slice(-8).toUpperCase() : "—"}
          </span>
          <span className="shrink-0 flex items-center gap-1">
            <Clock3 className="w-3 h-3" />
            {vm.receivedLabel || vm.receivedClock || "Just received"}
          </span>
        </div>

        {expanded ? (
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Details
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Pickup:</span>{" "}
              {vm.pickup.address}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Drop:</span>{" "}
              {vm.drop.address}
            </p>
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-slate-400" />
              Estimated earnings {vm.earningsLabel || "—"} · {vm.paymentLabel}
            </p>
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Service {vm.serviceLabel}
              {vm.requestId ? ` · #${vm.requestId}` : ""}
            </p>
          </div>
        ) : null}
      </div>

      {(onAccept || onDecline || onViewDetails) && (
        <div className="px-3.5 pb-3.5 pt-0">
          {onAccept || onDecline ? (
            <div className="grid grid-cols-3 gap-2">
              {onDecline ? (
                <FeedActionButton
                  variant="danger"
                  onClick={onDecline}
                  loading={declining}
                  disabled={accepting}
                >
                  Decline
                </FeedActionButton>
              ) : (
                <span />
              )}
              {onViewDetails ? (
                <FeedActionButton
                  variant="secondary"
                  onClick={onViewDetails}
                  disabled={accepting || declining}
                >
                  {expanded ? "Hide" : "Details"}
                </FeedActionButton>
              ) : (
                <span />
              )}
              {onAccept ? (
                <FeedActionButton
                  variant="primary"
                  onClick={onAccept}
                  loading={accepting}
                  disabled={declining}
                >
                  Accept
                </FeedActionButton>
              ) : (
                <span />
              )}
            </div>
          ) : (
            <FeedActionButton
              variant="secondary"
              className="w-full"
              onClick={onViewDetails}
            >
              {expanded ? "Hide details" : "View details"}
            </FeedActionButton>
          )}
        </div>
      )}
    </article>
  );
}
