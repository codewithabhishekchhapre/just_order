import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { userAPI } from "@food/api";
import { useLocation as useAppLocation } from "@food/hooks/useLocation";
import { useLocationSelector } from "@food/components/user/UserLayout";
import { formatSavedAddress } from "@food/utils/imageUtils";
import TaxiBottomNav from "../components/layout/BottomNav";
import TaxiTopBar from "../components/home/TaxiTopBar";
import DestinationSearch from "../components/home/DestinationSearch";
import ServiceCards from "../components/home/ServiceCards";
import PickupMapCard from "../components/home/PickupMapCard";
import RecommendedServices from "../components/home/RecommendedServices";
import SavingsSection from "../components/home/SavingsSection";
import ExploreCity from "../components/home/ExploreCity";
import BrandBanner from "../components/home/BrandBanner";
import useTaxiVehicles from "../hooks/useTaxiVehicles";
import { getTaxiWalletPath } from "../utils/routes";
import {
  isTaxiUserLoggedIn,
  redirectToTaxiLogin,
} from "../utils/authUser";

const SectionTitle = ({ children, action }) => (
  <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
    <h2 className="text-sm font-extrabold text-gray-900">{children}</h2>
    {action || null}
  </div>
);

export default function TaxiHome({ embedded = false }) {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { location } = useAppLocation();
  const { openLocationSelector } = useLocationSelector();
  const { vehicles, loading: vehiclesLoading } = useTaxiVehicles();

  const [destination, setDestination] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const locationTitle = useMemo(() => {
    const area = location?.area || location?.city;
    return area || "Current location";
  }, [location]);

  const locationSubtitle = useMemo(() => {
    const formatted = formatSavedAddress?.(location);
    if (formatted && String(formatted).trim()) return String(formatted);
    return location?.address || location?.formattedAddress || "Tap to change pickup location";
  }, [location]);

  const cityName = location?.city || locationTitle || "";

  const pickupCoords = useMemo(() => {
    const lat = Number(location?.latitude ?? location?.lat);
    const lng = Number(location?.longitude ?? location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [location]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isTaxiUserLoggedIn()) {
        setWalletBalance(null);
        setWalletLoading(false);
        return;
      }
      setWalletLoading(true);
      try {
        const res = await userAPI.getWallet();
        const data = res?.data?.data || res?.data || {};
        const balance =
          data?.wallet?.balance ??
          data?.balance ??
          data?.walletBalance ??
          data?.totalBalance ??
          null;
        if (!cancelled) setWalletBalance(balance == null ? null : Number(balance));
      } catch {
        if (!cancelled) setWalletBalance(null);
      } finally {
        if (!cancelled) setWalletLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedVehicleId && vehicles[0]?.id) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  const ensureLoggedInForBooking = () => {
    if (isTaxiUserLoggedIn()) return true;
    toast.message("Login required", {
      description: "Please sign in to book a taxi ride.",
    });
    redirectToTaxiLogin(navigate, routerLocation);
    return false;
  };

  const startBooking = (vehicle) => {
    if (!ensureLoggedInForBooking()) return;
    const name = vehicle?.name || "Taxi";
    toast.message(`Booking ${name}`, {
      description: destination
        ? `Towards ${destination}`
        : "Add a destination to continue",
    });
  };

  const onSelectVehicle = (vehicle) => {
    setSelectedVehicleId(vehicle.id);
    startBooking(vehicle);
  };

  return (
    <div
      className={`min-h-screen bg-[#F7F7F8] text-gray-900 ${
        embedded ? "pb-24" : "pb-28"
      }`}
    >
      <TaxiTopBar
        title={locationTitle}
        subtitle={locationSubtitle}
        onLocationClick={() => openLocationSelector?.()}
        walletBalance={walletBalance}
        walletLoading={walletLoading}
      />

      <main className="mx-auto max-w-lg space-y-5 px-4 py-4">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <DestinationSearch
            value={destination}
            onChange={setDestination}
            onUseCurrentLocation={() => {
              openLocationSelector?.();
              toast.success("Using your current location");
            }}
            onFocus={() => {}}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, duration: 0.25 }}
        >
          <SectionTitle>Services</SectionTitle>
          <ServiceCards
            vehicles={vehicles}
            loading={vehiclesLoading}
            selectedId={selectedVehicleId}
            onSelect={onSelectVehicle}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.25 }}
        >
          <SectionTitle>Set pickup on map</SectionTitle>
          <PickupMapCard
            addressLabel={
              pickupConfirmed
                ? locationSubtitle
                : "Move the pin, then confirm pickup"
            }
            initialLocation={pickupCoords}
            onPickupChange={(payload) => {
              if (payload?.address || payload?.formattedAddress) {
                setPickupConfirmed(false);
              }
            }}
            onConfirm={() => {
              setPickupConfirmed(true);
              toast.success("Pickup location confirmed");
            }}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.25 }}
        >
          <SectionTitle>Recommended</SectionTitle>
          <RecommendedServices
            vehicles={vehicles}
            onSelect={onSelectVehicle}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.25 }}
        >
          <SectionTitle>Savings</SectionTitle>
          <SavingsSection
            onOpenWallet={() => navigate(getTaxiWalletPath())}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.25 }}
        >
          <ExploreCity
            city={cityName}
            onSelectPlace={(place) => {
              setDestination(place.name);
              toast.message(`Destination set to ${place.name}`);
            }}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.25 }}
          className="pb-2"
        >
          <BrandBanner />
        </motion.section>
      </main>

      <TaxiBottomNav />
    </div>
  );
}
