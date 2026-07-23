import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Car, LifeBuoy, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  getTaxiHomePath,
  getTaxiRidesPath,
  getTaxiSupportPath,
  getTaxiProfilePath,
  TAXI_ACCENT,
} from "../../utils/routes";

const TaxiBottomNav = () => {
  const location = useLocation();
  const navItems = useMemo(
    () => [
      {
        id: "home",
        label: "Home",
        icon: Home,
        path: getTaxiHomePath(),
      },
      {
        id: "rides",
        label: "Rides",
        icon: Car,
        path: getTaxiRidesPath(),
      },
      {
        id: "support",
        label: "Support",
        icon: LifeBuoy,
        path: getTaxiSupportPath(),
      },
      {
        id: "profile",
        label: "Profile",
        icon: User,
        path: getTaxiProfilePath(),
      },
    ],
    [],
  );

  const isActive = (item) => {
    if (item.id === "home") {
      return location.pathname === "/taxi" || location.pathname === "/taxi/";
    }
    if (item.id === "support") {
      return location.pathname.startsWith("/taxi/support");
    }
    if (item.id === "profile") {
      return location.pathname.startsWith("/taxi/profile");
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[500] flex h-[64px] items-center justify-around border-t border-gray-100 bg-white/90 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl md:hidden"
      aria-label="Taxi navigation"
    >
      {navItems.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            to={item.path}
            className="group relative flex h-full flex-1 flex-col items-center justify-center"
          >
            <motion.div
              animate={{ y: active ? -2 : 0, scale: active ? 1.08 : 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 2}
                className={cn(
                  "transition-colors",
                  active ? "text-[#FF6A00]" : "text-gray-400",
                )}
                style={active ? { color: TAXI_ACCENT } : undefined}
              />
            </motion.div>
            <span
              className={cn(
                "mt-0.5 text-[10px] font-bold tracking-tight transition-colors",
                active ? "text-[#FF6A00]" : "text-gray-400",
              )}
            >
              {item.label}
            </span>
            {active ? (
              <motion.div
                layoutId="taxiBottomActive"
                className="absolute -top-px h-[3px] w-8 rounded-full bg-[#FF6A00]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
};

export default React.memo(TaxiBottomNav);
