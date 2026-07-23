import React, { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Loader from "@/modules/Food/components/Loader";

const Dashboard = React.lazy(() => import("../pages/Dashboard"));
const Rides = React.lazy(() => import("../pages/Rides"));
const Drivers = React.lazy(() => import("../pages/Drivers"));
const DriverOnboardingRequests = React.lazy(() => import("../pages/DriverOnboardingRequests"));
const Customers = React.lazy(() => import("../pages/Customers"));
const Vehicles = React.lazy(() => import("../pages/Vehicles"));
const VehicleTypes = React.lazy(() => import("../pages/VehicleTypes"));
const Pricing = React.lazy(() => import("../pages/Pricing"));
const Coupons = React.lazy(() => import("../pages/Coupons"));
const Zones = React.lazy(() => import("../pages/Zones"));
const Reports = React.lazy(() => import("../pages/Reports"));
const Settings = React.lazy(() => import("../pages/Settings"));

function TaxiAdminRoutesInner() {
  return (
    <Routes>
      <Route index element={<Navigate to="/admin/taxi/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />

      <Route path="rides/requests" element={<Rides statusKey="requests" />} />
      <Route path="rides/active" element={<Rides statusKey="active" />} />
      <Route path="rides/completed" element={<Rides statusKey="completed" />} />
      <Route path="rides/cancelled" element={<Rides statusKey="cancelled" />} />

      <Route path="drivers" element={<Drivers />} />
      <Route path="drivers/requests" element={<DriverOnboardingRequests />} />

      <Route path="customers" element={<Customers />} />
      <Route path="vehicles" element={<Vehicles />} />
      <Route path="vehicle-types" element={<VehicleTypes />} />
      <Route path="pricing" element={<Pricing />} />
      <Route path="coupons" element={<Coupons />} />
      <Route path="zones" element={<Zones />} />
      <Route path="reports" element={<Reports />} />
      <Route path="settings" element={<Settings />} />

      <Route path="*" element={<Navigate to="/admin/taxi/dashboard" replace />} />
    </Routes>
  );
}

export default function TaxiAdminRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <TaxiAdminRoutesInner />
    </Suspense>
  );
}
