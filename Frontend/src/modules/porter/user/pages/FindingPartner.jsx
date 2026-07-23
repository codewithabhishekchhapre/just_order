import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Search } from "lucide-react";
import { toast } from "sonner";
import Screen from "../components/Screen";
import MapPreview from "../components/MapPreview";
import { useBooking } from "../context/BookingContext";
import { getPorterPartnerAssignedPath, getPorterHomePath } from "../utils/routes";
import { porterUserApi } from "../services/api";
import { clearBookingDraft } from "@/shared/utils/bookingDraft";

const toPlace = (place, fallbackOffset = 0) => {
  const lat = Number(place?.lat ?? place?.latitude ?? 28.5355 + fallbackOffset);
  const lng = Number(place?.lng ?? place?.longitude ?? 77.391 + fallbackOffset);
  return {
    address: place?.address || place?.title || "Address",
    lat,
    lng,
  };
};

export default function FindingPartner() {
  const navigate = useNavigate();
  const {
    setActiveShipment,
    pickup,
    delivery,
    vehicle,
    vehicleId,
    parcel,
    paymentMethodId,
    total,
  } = useBooking();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const body = {
          pickup: toPlace(pickup, 0),
          drop: toPlace(delivery, 0.01),
          vehicleId: vehicle?.id || vehicleId,
          parcel: {
            description: parcel?.parcelDescription || parcel?.parcelName || "",
            weightKg: Number(parcel?.weightKg) || 0,
            size: parcel?.size || "",
          },
          paymentMethod: paymentMethodId === "cash" ? "cash" : "wallet",
        };

        // Prefer real ObjectId vehicles from public catalog; fall back to quote error message
        if (!body.vehicleId || String(body.vehicleId).length < 12) {
          const vehicles = await porterUserApi.getPublicVehicles();
          if (vehicles?.[0]?.id) body.vehicleId = vehicles[0].id;
        }

        const trip = await porterUserApi.createTrip(body);
        if (cancelled) return;

        clearBookingDraft("porter");
        setActiveShipment({
          id: trip?.id || trip?._id,
          trackingId: trip?.tripNumber || `BLZ${Date.now().toString().slice(-8)}`,
          status: trip?.status || "searching",
          stage: "to_pickup",
          partner: null,
          pickup,
          delivery,
          vehicle: vehicle?.name,
          total: trip?.fareEstimateTotal ?? total,
          createdAt: trip?.createdAt || new Date().toISOString(),
          trip,
        });
        navigate(getPorterPartnerAssignedPath(), { replace: true });
      } catch (err) {
        if (cancelled) return;
        const msg = err?.response?.data?.message || err?.message || "Failed to create trip";
        setError(msg);
        toast.error(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    navigate,
    setActiveShipment,
    pickup,
    delivery,
    vehicle,
    vehicleId,
    parcel,
    paymentMethodId,
    total,
  ]);

  return (
    <Screen title="Finding partner" subtitle="Matching you with a nearby delivery partner" bare>
      <div className="relative">
        <MapPreview height="calc(100vh - 120px)" showRoute animateCar rounded="rounded-none" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent px-4 pb-10 pt-16">
          {error ? (
            <>
              <h2 className="text-center text-[18px] font-extrabold text-gray-900">Could not book</h2>
              <p className="mt-2 text-center text-[13px] text-red-500">{error}</p>
              <button
                type="button"
                className="mt-4 w-full rounded-xl bg-[#FF6A00] py-3 text-sm font-bold text-white"
                onClick={() => navigate(getPorterHomePath())}
              >
                Back to home
              </button>
            </>
          ) : (
            <>
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF1F1]"
              >
                <Search className="h-7 w-7 text-[#FF6A00]" />
              </motion.div>
              <h2 className="text-center text-[18px] font-extrabold text-gray-900">Searching for delivery partner</h2>
              <p className="mt-1 text-center text-[13px] text-gray-500">
                Finding the best partner for your {vehicle?.name || "delivery"} shipment
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-[#FF6A00]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
              <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-gray-50 p-3">
                <Package className="h-4 w-4 text-[#FF6A00]" />
                <span className="text-[12px] font-semibold text-gray-600">Your parcel details are shared securely with the partner</span>
              </div>
            </>
          )}
        </div>
      </div>
    </Screen>
  );
}
