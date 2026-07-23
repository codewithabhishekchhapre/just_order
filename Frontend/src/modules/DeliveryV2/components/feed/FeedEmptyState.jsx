import { WifiOff, Inbox, RefreshCw, AlertCircle } from "lucide-react";
import { FeedActionButton } from "./FeedActionButton";

export function FeedEmptyState({ isOnline, onGoOnline }) {
  if (!isOnline) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
          <WifiOff className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">You're offline</h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-[16rem] mx-auto">
          Go online to start receiving nearby delivery and ride requests.
        </p>
        {onGoOnline ? (
          <FeedActionButton
            className="mt-4 w-full max-w-xs mx-auto"
            onClick={onGoOnline}
          >
            Go Online
          </FeedActionButton>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/90 px-4 py-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
        <Inbox className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-bold text-slate-900">No requests yet</h3>
      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-[16rem] mx-auto">
        Stay nearby. New orders and rides will appear here as they come in.
      </p>
    </div>
  );
}

export function FeedErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-7 text-center">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-red-500 mb-3 border border-red-100">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-bold text-slate-900">Couldn't load requests</h3>
      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed max-w-[16rem] mx-auto">
        {message || "Check your connection and try again."}
      </p>
      {onRetry ? (
        <FeedActionButton
          variant="secondary"
          className="mt-4 w-full max-w-xs mx-auto"
          onClick={onRetry}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </FeedActionButton>
      ) : null}
    </div>
  );
}
