import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ActionSlider } from "@/modules/DeliveryV2/components/ui/ActionSlider";
import { useDeliveryStore } from "@/modules/DeliveryV2/store/useDeliveryStore";
import { getHaversineDistance } from "@/modules/DeliveryV2/utils/geo";
import {
  normalizePickupPoints,
  formatDeliveryAddressText,
} from "@/modules/DeliveryV2/utils/orderRouting";
import { buildFeedRequestViewModel } from "@/modules/DeliveryV2/utils/feedRequestFormatters";
import { RequestCard } from "@/modules/DeliveryV2/components/feed";
import { locationAPI } from "@food/api";

/**
 * Compact incoming-offer sheet. Uses shared RequestCard for the summary;
 * keeps existing accept/reject timers and road-distance enrichment.
 */
export const NewOrderModal = ({ order, onAccept, onReject, onMinimize }) => {
  const { riderLocation } = useDeliveryStore();
  const [timeLeft, setTimeLeft] = useState(30);
  const [showDetails, setShowDetails] = useState(false);
  const pickupPoints = normalizePickupPoints(order);
  const primaryPickup = pickupPoints[0] || null;

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      onReject();
    }
  }, [timeLeft, onReject]);

  const { distanceKm, etaMins } = useMemo(() => {
    if (!order) return { distanceKm: null, etaMins: null };

    const rawDist = order.pickupDistanceKm || order.distanceKm;
    const rawEta = order.estimatedTime || order.duration || order.eta;

    if (rawDist != null) {
      return {
        distanceKm: Number(rawDist).toFixed(1),
        etaMins:
          rawEta && rawEta > 0
            ? Math.ceil(rawEta)
            : Math.ceil((rawDist * 1000) / 416) + 5,
      };
    }

    const rest =
      primaryPickup?.location ||
      order.restaurantLocation ||
      order.restaurantId?.location ||
      {};
    const resLat = parseFloat(
      order.restaurant_lat || order.restaurantLat || rest.latitude || rest.lat,
    );
    const resLng = parseFloat(
      order.restaurant_lng || order.restaurantLng || rest.longitude || rest.lng,
    );

    if (riderLocation && !isNaN(resLat) && !isNaN(resLng)) {
      const distM = getHaversineDistance(
        riderLocation.lat,
        riderLocation.lng,
        resLat,
        resLng,
      );
      const km = distM / 1000;
      const mins = Math.ceil(distM / 416) + (order.prepTime || 5);
      return { distanceKm: km.toFixed(1), etaMins: mins };
    }

    return { distanceKm: null, etaMins: order.prepTime || 15 };
  }, [order, primaryPickup, riderLocation]);

  const routeCoords = useMemo(() => {
    if (!order) return { pickup: null, drop: null };
    const rest =
      primaryPickup?.location ||
      order.restaurantLocation ||
      order.restaurantId?.location ||
      {};
    const pLat = parseFloat(
      order.restaurant_lat || order.restaurantLat || rest.latitude || rest.lat,
    );
    const pLng = parseFloat(
      order.restaurant_lng || order.restaurantLng || rest.longitude || rest.lng,
    );
    const geo = order?.deliveryAddress?.location?.coordinates;
    const dropRaw =
      order.customerLocation ||
      order.deliveryLocation ||
      (Array.isArray(geo) && geo.length >= 2
        ? { lat: geo[1], lng: geo[0] }
        : null);
    const dLat = parseFloat(dropRaw?.lat ?? dropRaw?.latitude);
    const dLng = parseFloat(dropRaw?.lng ?? dropRaw?.longitude);
    return {
      pickup:
        Number.isFinite(pLat) && Number.isFinite(pLng)
          ? { lat: pLat, lng: pLng }
          : null,
      drop:
        Number.isFinite(dLat) && Number.isFinite(dLng)
          ? { lat: dLat, lng: dLng }
          : null,
    };
  }, [order, primaryPickup]);

  const [roadLegs, setRoadLegs] = useState({ pickup: null, drop: null });
  useEffect(() => {
    setRoadLegs({ pickup: null, drop: null });
    if (!order) return undefined;
    let cancelled = false;

    const fetchLeg = (from, to, key) => {
      if (!from || !to) return;
      locationAPI
        .roadDistance(from.lat, from.lng, to.lat, to.lng)
        .then((res) => {
          const d = res?.data?.data;
          if (
            !cancelled &&
            d &&
            Number.isFinite(Number(d.distanceKm)) &&
            d.source !== "haversine"
          ) {
            setRoadLegs((prev) => ({ ...prev, [key]: d }));
          }
        })
        .catch(() => {});
    };

    fetchLeg(
      riderLocation
        ? { lat: riderLocation.lat, lng: riderLocation.lng }
        : null,
      routeCoords.pickup,
      "pickup",
    );
    fetchLeg(routeCoords.pickup, routeCoords.drop, "drop");

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    order?.orderId,
    order?._id,
    routeCoords.pickup?.lat,
    routeCoords.pickup?.lng,
    routeCoords.drop?.lat,
    routeCoords.drop?.lng,
  ]);

  const enrichedOrder = useMemo(() => {
    if (!order) return null;
    const pickupKm =
      roadLegs.pickup?.distanceKm != null
        ? Number(roadLegs.pickup.distanceKm)
        : distanceKm != null
          ? Number(distanceKm)
          : order.pickupDistanceKm;
    const tripKm =
      roadLegs.drop?.distanceKm != null
        ? Number(roadLegs.drop.distanceKm)
        : order.tripDistanceKm ?? order.deliveryDistanceKm;
    const eta =
      roadLegs.pickup?.durationMinutes ??
      roadLegs.drop?.durationMinutes ??
      etaMins ??
      order.estimatedTime;
    return {
      ...order,
      pickupDistanceKm: pickupKm,
      tripDistanceKm: tripKm,
      estimatedTime: eta,
    };
  }, [order, roadLegs, distanceKm, etaMins]);

  const viewModel = useMemo(
    () =>
      buildFeedRequestViewModel(enrichedOrder, {
        expiresInSec: timeLeft,
        riderLocation,
      }),
    [enrichedOrder, timeLeft, riderLocation],
  );

  if (!order || !viewModel) return null;

  const deliveryAddress = order?.deliveryAddress || {};
  const note = order?.note || order?.deliveryInstructions || "";
  const items = Array.isArray(order?.items) ? order.items : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/55 flex items-end justify-center p-0 sm:p-4"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-lg max-h-[88vh] bg-slate-100 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-[0_-20px_60px_rgba(0,0,0,0.45)] flex flex-col"
      >
        <div className="w-full flex justify-center pt-2 pb-1 shrink-0">
          <button
            type="button"
            onClick={onMinimize}
            className="p-1.5 rounded-full active:bg-white/80 flex flex-col items-center"
            aria-label="Minimize offer"
          >
            <span className="w-10 h-1 rounded-full bg-slate-300 mb-0.5" />
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-2 space-y-2.5 no-scrollbar">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-xs font-bold text-slate-700">New request</p>
            <div className="rounded-full bg-slate-900 text-white text-xs font-bold tabular-nums px-2.5 py-1">
              {timeLeft}s
            </div>
          </div>

          <RequestCard
            viewModel={viewModel}
            order={enrichedOrder}
            highlighted
            expanded={showDetails}
            onViewDetails={() => setShowDetails((v) => !v)}
          />

          {showDetails ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 space-y-2.5">
              {note ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Instructions
                  </p>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {note}
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Drop address
                </p>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {formatDeliveryAddressText(
                    deliveryAddress,
                    order.customerAddress || order.customer_address || "",
                  ) || viewModel.drop.address}
                </p>
              </div>
              {items.length > 0 ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Items ({items.length})
                  </p>
                  <ul className="space-y-1">
                    {items.slice(0, 6).map((item, idx) => (
                      <li
                        key={idx}
                        className="text-xs font-semibold text-slate-800"
                      >
                        {Number(item.quantity || 1)} × {item.name || "Item"}
                      </li>
                    ))}
                    {items.length > 6 ? (
                      <li className="text-[11px] text-slate-400 font-medium">
                        +{items.length - 6} more
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="p-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2.5 border-t border-slate-200 bg-white shrink-0">
          <ActionSlider
            label="Slide to Accept"
            onConfirm={() => onAccept(order)}
            color="bg-primary-orange"
            successLabel="Accepted ✓"
            timeProgress={(timeLeft / 30) * 100}
          />
          <button
            type="button"
            onClick={onReject}
            className="w-full h-10 rounded-xl text-xs font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-100 active:scale-[0.98] transition"
          >
            Decline
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
