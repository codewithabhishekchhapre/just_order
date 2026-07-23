import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CarTaxiFront,
  ShoppingBasket,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEnabledModules } from "@/modules/common/hooks/useEnabledModules";

const ADMIN_MODULES = [
  {
    key: "food",
    moduleKey: "food",
    label: "Food",
    shortLabel: "Food",
    path: "/admin/food",
    icon: UtensilsCrossed,
    active: (pathname) => pathname.startsWith("/admin/food"),
  },
  {
    key: "quick",
    moduleKey: "quickCommerce",
    label: "Quick",
    shortLabel: "Quick",
    path: "/admin/quick-commerce",
    icon: ShoppingBasket,
    active: (pathname) => pathname.startsWith("/admin/quick-commerce"),
  },
  {
    key: "taxi",
    moduleKey: "taxi",
    label: "Taxi",
    shortLabel: "Taxi",
    path: "/admin/taxi",
    icon: CarTaxiFront,
    active: (pathname) => pathname.startsWith("/admin/taxi"),
  },
];

export default function AdminModuleSwitcher({ className = "" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { modules } = useEnabledModules();

  const visibleModules = useMemo(
    () =>
      ADMIN_MODULES.filter(
        (module) => modules[module.moduleKey] !== false,
      ),
    [modules],
  );

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm",
        className,
      )}
      aria-label="Switch admin module"
    >
      {visibleModules.map((module) => {
        const Icon = module.icon;
        const isActive = module.active(location.pathname);

        return (
          <button
            key={module.key}
            type="button"
            onClick={() => navigate(module.path)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide transition-all",
              isActive
                ? "bg-slate-950 text-white shadow-lg shadow-slate-900/15"
                : "text-slate-500 hover:bg-white hover:text-slate-950",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{module.label}</span>
            <span className="sm:hidden">{module.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
