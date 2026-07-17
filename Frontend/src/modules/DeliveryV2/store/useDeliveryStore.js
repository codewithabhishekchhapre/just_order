import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * @typedef {Object} Location
 * @property {number} lat
 * @property {number} lng
 */

/**
 * @typedef {Object} ActiveOrder
 * @property {string} orderId
 * @property {string} status
 * @property {Location} restaurantLocation
 * @property {Location} customerLocation
 * @property {number} orderAmount
 */

/**
 * useDeliveryStore - Professional Zustand store for Delivery V2
 * Handles Trip Lifecycle, Rider Status, and Admin Settings.
 */
export const useDeliveryStore = create(
  persist(
    (set, get) => ({
      // --- Rider Status ---
      isOnline: false,
      riderLocation: null, // { lat, lng }
      activeVehicleId: null, // string | null
      driverVehicles: [], // array of vehicle objects
      
      // --- Trip State ---
      activeOrder: null, // ActiveOrder | null
      tripStatus: 'IDLE', // 'IDLE' | 'PICKING_UP' | 'REACHED_PICKUP' | 'PICKED_UP' | 'DELIVERING' | 'REACHED_DROP' | 'COMPLETED'
      
      // --- Admin / Business Settings ---
      settings: {
        pickupRangeLimit: 500, // meters, fallback default
        deliveryRangeLimit: 500, // meters, fallback default
      },

      // --- Actions ---
      /** Prefer explicit activeVehicleId; otherwise first approved / first listed vehicle. */
      resolveActiveVehicleId: (state = get()) => {
        if (state.activeVehicleId) return state.activeVehicleId;
        const list = state.driverVehicles || [];
        if (!list.length) return null;
        const approved = list.find(
          (v) =>
            String(v.verificationStatus || "").toLowerCase() === "approved" ||
            !v.verificationStatus
        );
        const pick = approved || list[0];
        return pick?.vehicleId || pick?.id || null;
      },

      toggleOnline: () => set((state) => {
        if (!state.isOnline) {
          const vehicleId = get().resolveActiveVehicleId(state);
          if (!vehicleId) {
            console.warn("Cannot go online without an active vehicle");
            return state;
          }
          return { isOnline: true, activeVehicleId: vehicleId };
        }
        return { isOnline: false };
      }),
      
      setOnline: (online) => set((state) => {
        if (online) {
          const vehicleId = get().resolveActiveVehicleId(state);
          if (!vehicleId) {
            console.warn("Cannot go online without an active vehicle");
            return state;
          }
          return { isOnline: true, activeVehicleId: vehicleId };
        }
        return { isOnline: false };
      }),

      setDriverVehicles: (vehicles) => {
        const list = Array.isArray(vehicles) ? vehicles : [];
        const state = get();
        const nextActive =
          state.activeVehicleId &&
          list.some((v) => (v.vehicleId || v.id) === state.activeVehicleId)
            ? state.activeVehicleId
            : get().resolveActiveVehicleId({ ...state, driverVehicles: list, activeVehicleId: null });
        set({ driverVehicles: list, activeVehicleId: nextActive || state.activeVehicleId });
      },

      setActiveVehicle: (id) => {
        const state = get();
        if (state.isOnline) {
          console.error("Cannot change active vehicle while online");
          return false;
        }
        set({ activeVehicleId: id });
        return true;
      },
      
      setRiderLocation: (location) => set({ riderLocation: location }),
      
      setSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      setActiveOrder: (order) => set({ 
        activeOrder: order, 
        tripStatus: order ? 'PICKING_UP' : 'IDLE' 
      }),

      updateTripStatus: (status) => set({ tripStatus: status }),

      clearActiveOrder: () => set({ 
        activeOrder: null, 
        tripStatus: 'IDLE' 
      }),

      // --- Selectors / Computed Helper ---
      canAdvanceToPickup: () => {
        const { activeOrder, tripStatus } = get();
        return activeOrder && tripStatus === 'PICKING_UP';
      },

      canAdvanceToDeliver: () => {
        const { activeOrder, tripStatus } = get();
        return activeOrder && tripStatus === 'PICKED_UP';
      },

      // Derived Getters
      getActiveVehicle: () => {
        const { activeVehicleId, driverVehicles } = get();
        if (!activeVehicleId || !driverVehicles || driverVehicles.length === 0) return null;
        return driverVehicles.find(v => v.vehicleId === activeVehicleId || v.id === activeVehicleId) || null;
      },

      getAvailableModules: () => {
        const activeVehicle = get().getActiveVehicle();
        if (!activeVehicle) return [];
        // Support either a nested master vehicle object or a flat supportedServices array
        return activeVehicle.supportedServices || (activeVehicle.master && activeVehicle.master.supportedServices) || [];
      },

      getCurrentModule: () => {
        const { activeOrder } = get();
        return activeOrder?.module || 'food'; // Default fallback
      }
    }),
    {
      name: 'delivery-v2-online-pref',
      // ONLY persist the 'isOnline' and 'activeVehicleId' state
      partialize: (state) => ({ 
        isOnline: state.isOnline,
        activeVehicleId: state.activeVehicleId
      }),
    }
  )
);
