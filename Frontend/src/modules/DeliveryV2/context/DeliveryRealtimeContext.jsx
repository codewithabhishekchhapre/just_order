import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { deliveryAPI } from "@food/api";
import { isModuleAuthenticated } from "@food/utils/auth";
import { useDeliveryNotifications } from "@food/hooks/useDeliveryNotifications";
import { NewOrderModal } from "@/modules/DeliveryV2/components/modals/NewOrderModal";
import { useOrderManager } from "@/modules/DeliveryV2/hooks/useOrderManager";
import { useDeliveryStore } from "@/modules/DeliveryV2/store/useDeliveryStore";
import {
  enrichReturnDeliveryOrder,
  formatDeliveryAddressText,
  getDeliveryDocumentId,
  normalizePickupPoints,
} from "@/modules/DeliveryV2/utils/orderRouting";

const DeliveryRealtimeContext = createContext(null);

function getOfferKeys(orderLike = {}) {
  return [
    orderLike?.orderMongoId,
    orderLike?._id,
    orderLike?.id,
    orderLike?.orderId,
    orderLike?.returnId,
    orderLike?.dispatchLeg?.legId,
  ]
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter(Boolean);
}

function normalizeIncomingOffer(order) {
  if (!order) return null;
  return enrichReturnDeliveryOrder({
    ...order,
    pickupPoints: normalizePickupPoints(order),
    customerLocation:
      order.customerLocation ||
      order.deliveryAddress?.location ||
      null,
    customerAddress: formatDeliveryAddressText(
      order.deliveryAddress,
      order.customerAddress || order.customer_address || "",
    ),
  });
}

export function DeliveryRealtimeProvider({ children }) {
  const notifications = useDeliveryNotifications();
  const { acceptOrder } = useOrderManager();
  const activeOrder = useDeliveryStore((s) => s.activeOrder);

  const [queue, setQueue] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const seenIdsRef = useRef(new Set());
  const queueRef = useRef([]);

  const enqueueOffer = useCallback((rawOrder) => {
    const order = normalizeIncomingOffer(rawOrder);
    if (!order) return;
    const keys = getOfferKeys(order);
    if (!keys.length) return;
    if (keys.some((k) => seenIdsRef.current.has(k))) return;

    for (const k of keys) seenIdsRef.current.add(k);

    setQueue((prev) => {
      const exists = prev.some((o) =>
        getOfferKeys(o).some((k) => keys.includes(k)),
      );
      if (exists) return prev;
      const next = [...prev, order];
      queueRef.current = next;
      return next;
    });
    setIsMinimized(false);
  }, []);

  useEffect(() => {
    if (notifications.newOrder) {
      enqueueOffer(notifications.newOrder);
    }
  }, [notifications.newOrder, enqueueOffer]);

  // One-shot catch-up so deep pages still surface open offers after login/refresh.
  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        const availableResponse = await deliveryAPI.getOrders({ limit: 20, page: 1 });
        const availablePayload =
          availableResponse?.data?.data || availableResponse?.data || {};
        const availableOrders = Array.isArray(availablePayload?.docs)
          ? availablePayload.docs
          : Array.isArray(availablePayload?.items)
            ? availablePayload.items
            : Array.isArray(availablePayload)
              ? availablePayload
              : [];
        if (cancelled) return;
        availableOrders
          .filter((order) => {
            const dispatchStatus = String(order?.dispatch?.status || "").toLowerCase();
            const orderStatus = String(
              order?.orderStatus || order?.status || "",
            ).toLowerCase();
            return (
              ["unassigned", "assigned"].includes(dispatchStatus) &&
              ["confirmed", "preparing", "ready_for_pickup", "return_approved", "return_pickup_assigned"].includes(
                orderStatus,
              )
            );
          })
          .forEach((order) => enqueueOffer(order));
      } catch {
        // non-blocking
      }
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [enqueueOffer]);

  // Clear offer when driver already has an active trip, or status leaves offerable state.
  useEffect(() => {
    if (!activeOrder) return;
    const activeKeys = getOfferKeys(activeOrder);
    setQueue((prev) => {
      const next = prev.filter(
        (o) => !getOfferKeys(o).some((k) => activeKeys.includes(k)),
      );
      queueRef.current = next;
      return next;
    });
    notifications.clearNewOrder?.();
  }, [activeOrder, notifications.clearNewOrder]);

  useEffect(() => {
    const update = notifications.orderStatusUpdate;
    if (!update) return;
    const keys = getOfferKeys(update);
    const status = String(
      update.orderStatus || update.status || "",
    ).toLowerCase();
    const stillOfferable = ["confirmed", "preparing", "ready_for_pickup"].includes(
      status,
    );

    if (keys.length && !stillOfferable) {
      setQueue((prev) => {
        const next = prev.filter(
          (o) => !getOfferKeys(o).some((k) => keys.includes(k)),
        );
        queueRef.current = next;
        return next;
      });
      notifications.clearNewOrder?.();
    } else if (keys.length && stillOfferable) {
      setQueue((prev) =>
        prev.map((o) => {
          if (!getOfferKeys(o).some((k) => keys.includes(k))) return o;
          return {
            ...o,
            ...update,
            status: update.orderStatus || update.status || o.status,
            orderStatus: update.orderStatus || update.status || o.orderStatus,
            preparationTime:
              update.preparationTime ?? o.preparationTime,
            expectedReadyAt: update.expectedReadyAt || o.expectedReadyAt,
          };
        }),
      );
    }
  }, [notifications.orderStatusUpdate, notifications.clearNewOrder]);

  const incomingOrder = activeOrder ? null : queue[0] || null;

  const clearIncoming = useCallback(
    (orderLike) => {
      const keys = orderLike
        ? getOfferKeys(orderLike)
        : getOfferKeys(incomingOrder);
      setQueue((prev) => {
        const next = orderLike
          ? prev.filter((o) => !getOfferKeys(o).some((k) => keys.includes(k)))
          : prev.slice(1);
        queueRef.current = next;
        return next;
      });
      notifications.clearNewOrder?.();
    },
    [incomingOrder, notifications.clearNewOrder],
  );

  const acceptIncoming = useCallback(
    async (order) => {
      const target = order || queueRef.current[0];
      if (!target) return false;
      try {
        await acceptOrder(target);
        clearIncoming(target);
        setIsMinimized(false);
        return true;
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Failed to accept delivery",
        );
        return false;
      }
    },
    [acceptOrder, clearIncoming],
  );

  const rejectIncoming = useCallback(
    async (order) => {
      const target = order || queueRef.current[0];
      if (!target) return false;
      const orderId = getDeliveryDocumentId(target);
      try {
        if (orderId) {
          await deliveryAPI.rejectOrder(orderId, {
            ...(target?.dispatchLeg?.legId
              ? { legId: target.dispatchLeg.legId }
              : {}),
            ...(String(target?.documentType || "").includes("return")
              ? { documentType: "seller_return" }
              : {}),
          });
        }
      } catch {
        // Still clear local offer so ring/popup stop; backend may re-offer.
      }
      clearIncoming(target);
      setIsMinimized(false);
      return true;
    },
    [clearIncoming],
  );

  const value = useMemo(
    () => ({
      ...notifications,
      incomingOrder,
      queueLength: queue.length,
      isMinimized,
      setIsMinimized,
      acceptIncoming,
      rejectIncoming,
      clearIncoming,
      enqueueOffer,
    }),
    [
      notifications,
      incomingOrder,
      queue.length,
      isMinimized,
      acceptIncoming,
      rejectIncoming,
      clearIncoming,
      enqueueOffer,
    ],
  );

  return (
    <DeliveryRealtimeContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {!isMinimized && incomingOrder ? (
          <NewOrderModal
            key={getOfferKeys(incomingOrder).join("-") || "incoming"}
            order={incomingOrder}
            onAccept={(o) => acceptIncoming(o)}
            onReject={() => rejectIncoming(incomingOrder)}
            onMinimize={() => setIsMinimized(true)}
          />
        ) : null}
      </AnimatePresence>
    </DeliveryRealtimeContext.Provider>
  );
}

/** Mount socket+popup only for authenticated delivery sessions. */
export function DeliveryRealtimeGate({ children }) {
  const authenticated = isModuleAuthenticated("delivery");
  if (!authenticated) return children;
  return <DeliveryRealtimeProvider>{children}</DeliveryRealtimeProvider>;
}

export function useDeliveryRealtime() {
  const ctx = useContext(DeliveryRealtimeContext);
  if (!ctx) {
    throw new Error(
      "useDeliveryRealtime must be used within DeliveryRealtimeProvider",
    );
  }
  return ctx;
}

export function useDeliveryRealtimeOptional() {
  return useContext(DeliveryRealtimeContext);
}
