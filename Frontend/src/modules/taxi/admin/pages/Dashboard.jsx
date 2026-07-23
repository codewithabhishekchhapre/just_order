import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Zap, Clock, CheckCircle, XCircle, IndianRupee, Star, Wifi,
  ArrowRight, Bell, CarTaxiFront, MapPin, Gift, FileText,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import {
  PageHeader, StatCard, SectionCard, AdminTable, StatusBadge,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import {
  MOCK_TAXI_KPIS, MOCK_TAXI_DAILY_RIDES, MOCK_TAXI_REVENUE,
  MOCK_TAXI_VEHICLE_SPLIT, MOCK_TAXI_ACTIVITIES,
} from "../utils/mock/dashboard";
import { MOCK_RIDES, RIDE_STATUSES } from "../utils/mock/rides";
import { MOCK_TAXI_DRIVERS } from "../utils/mock/drivers";
import { formatCurrency, formatDateTime } from "../utils/taxiTableHelpers";

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444"];

const Dashboard = () => {
  const navigate = useNavigate();

  const latestRequests = MOCK_RIDES.filter((r) => r.status === "pending").slice(0, 6);
  const topDrivers = [...MOCK_TAXI_DRIVERS]
    .sort((a, b) => b.ridesCompleted - a.ridesCompleted)
    .slice(0, 5);

  const requestColumns = [
    { key: "id", header: "Ride ID", cell: (row) => <span className="font-semibold">{row.id}</span> },
    { key: "customer", header: "Customer" },
    { key: "pickup", header: "Pickup", cell: (row) => <span className="text-sm">{row.pickup}</span> },
    { key: "drop", header: "Drop", cell: (row) => <span className="text-sm">{row.drop}</span> },
    { key: "vehicleType", header: "Vehicle" },
    { key: "fare", header: "Est. Fare", cell: (row) => formatCurrency(row.fare) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge tone={RIDE_STATUSES[row.status].tone} label={RIDE_STATUSES[row.status].label} /> },
    { key: "createdAt", header: "Requested", cell: (row) => <span className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</span> },
  ];

  const driverColumns = [
    {
      key: "name", header: "Driver",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <img src={row.photo} alt={row.name} className="w-8 h-8 rounded-full bg-gray-100" />
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-gray-500">{row.id}</p>
          </div>
        </div>
      ),
    },
    { key: "vehicleType", header: "Vehicle" },
    { key: "ridesCompleted", header: "Rides" },
    { key: "rating", header: "Rating", cell: (row) => <span className="text-yellow-600 font-medium">★ {row.rating}</span> },
    { key: "onlineStatus", header: "Status", cell: (row) => <StatusBadge status={row.onlineStatus === "online" ? "success" : "default"} label={row.onlineStatus} /> },
  ];

  return (
    <div className="just-order-theme-scope space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader
        title="Taxi Operations Dashboard"
        subtitle="Live overview of rides, drivers and revenue"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Taxi", href: "/admin/taxi" },
          { label: "Dashboard" },
        ]}
        actions={
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/taxi/reports")}>
              Export Data
            </Button>
            <Button className="gap-2" onClick={() => navigate("/admin/taxi/reports")}>
              View Reports <ArrowRight size={16} />
            </Button>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard title="Total Drivers" value={MOCK_TAXI_KPIS.totalDrivers.value} trend={MOCK_TAXI_KPIS.totalDrivers.trend} trendValue={MOCK_TAXI_KPIS.totalDrivers.trendValue} subtitle={MOCK_TAXI_KPIS.totalDrivers.description} icon={<Users size={18} />} iconBg="bg-blue-100 text-blue-600" />
        <StatCard title="Online Drivers" value={MOCK_TAXI_KPIS.onlineDrivers.value} trend={MOCK_TAXI_KPIS.onlineDrivers.trend} trendValue={MOCK_TAXI_KPIS.onlineDrivers.trendValue} subtitle={MOCK_TAXI_KPIS.onlineDrivers.description} icon={<Wifi size={18} />} iconBg="bg-green-100 text-green-600" />
        <StatCard title="Active Rides" value={MOCK_TAXI_KPIS.activeRides.value} trend={MOCK_TAXI_KPIS.activeRides.trend} trendValue={MOCK_TAXI_KPIS.activeRides.trendValue} subtitle={MOCK_TAXI_KPIS.activeRides.description} icon={<Zap size={18} />} iconBg="bg-purple-100 text-purple-600" />
        <StatCard title="Pending Requests" value={MOCK_TAXI_KPIS.pendingRequests.value} trend={MOCK_TAXI_KPIS.pendingRequests.trend} trendValue={MOCK_TAXI_KPIS.pendingRequests.trendValue} subtitle={MOCK_TAXI_KPIS.pendingRequests.description} icon={<Clock size={18} />} iconBg="bg-orange-100 text-orange-600" />
        <StatCard title="Completed Rides" value={MOCK_TAXI_KPIS.completedToday.value} trend={MOCK_TAXI_KPIS.completedToday.trend} trendValue={MOCK_TAXI_KPIS.completedToday.trendValue} subtitle={MOCK_TAXI_KPIS.completedToday.description} icon={<CheckCircle size={18} />} iconBg="bg-green-100 text-green-600" />
        <StatCard title="Cancelled Rides" value={MOCK_TAXI_KPIS.cancelledToday.value} trend={MOCK_TAXI_KPIS.cancelledToday.trend} trendValue={MOCK_TAXI_KPIS.cancelledToday.trendValue} subtitle={MOCK_TAXI_KPIS.cancelledToday.description} icon={<XCircle size={18} />} iconBg="bg-red-100 text-red-600" />
        <StatCard title="Revenue Today" value={MOCK_TAXI_KPIS.revenueToday.value} trend={MOCK_TAXI_KPIS.revenueToday.trend} trendValue={MOCK_TAXI_KPIS.revenueToday.trendValue} subtitle={MOCK_TAXI_KPIS.revenueToday.description} icon={<IndianRupee size={18} />} iconBg="bg-yellow-100 text-yellow-600" />
        <StatCard title="Avg Trip Rating" value={MOCK_TAXI_KPIS.avgRating.value} trend={MOCK_TAXI_KPIS.avgRating.trend} trendValue={MOCK_TAXI_KPIS.avgRating.trendValue} subtitle={MOCK_TAXI_KPIS.avgRating.description} icon={<Star size={18} />} iconBg="bg-amber-100 text-amber-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <SectionCard title="Daily Rides Trend">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_TAXI_DAILY_RIDES} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="rides" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Rides" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Revenue Trend (Last 7 Days)">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_TAXI_REVENUE} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Rides by Vehicle Type">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={MOCK_TAXI_VEHICLE_SPLIT} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} label={(entry) => `${entry.name} ${entry.value}%`}>
                  {MOCK_TAXI_VEHICLE_SPLIT.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <SectionCard
            title="Latest Ride Requests"
            action={<Button variant="ghost" size="sm" onClick={() => navigate("/admin/taxi/rides/requests")}>View All</Button>}
          >
            <div className="overflow-x-auto pb-4">
              <AdminTable columns={requestColumns} data={latestRequests} getRowId={(r) => r.id} />
            </div>
          </SectionCard>

          <SectionCard
            title="Top Drivers"
            action={<Button variant="ghost" size="sm" onClick={() => navigate("/admin/taxi/drivers")}>Manage Drivers</Button>}
          >
            <div className="overflow-x-auto pb-4">
              <AdminTable columns={driverColumns} data={topDrivers} getRowId={(r) => r.id} />
            </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-1 space-y-6">
          <SectionCard title="Quick Actions">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full justify-center h-auto py-3 flex-col gap-1" onClick={() => navigate("/admin/taxi/drivers/requests")}>
                <Users size={20} className="text-blue-500" />
                <span className="text-xs font-medium">Driver Requests</span>
              </Button>
              <Button variant="outline" className="w-full justify-center h-auto py-3 flex-col gap-1" onClick={() => navigate("/admin/taxi/rides/active")}>
                <CarTaxiFront size={20} className="text-amber-500" />
                <span className="text-xs font-medium">Active Rides</span>
              </Button>
              <Button variant="outline" className="w-full justify-center h-auto py-3 flex-col gap-1" onClick={() => navigate("/admin/taxi/pricing")}>
                <IndianRupee size={20} className="text-yellow-600" />
                <span className="text-xs font-medium">Pricing</span>
              </Button>
              <Button variant="outline" className="w-full justify-center h-auto py-3 flex-col gap-1" onClick={() => navigate("/admin/taxi/zones")}>
                <MapPin size={20} className="text-red-500" />
                <span className="text-xs font-medium">Zones</span>
              </Button>
              <Button variant="outline" className="w-full justify-center h-auto py-3 flex-col gap-1" onClick={() => navigate("/admin/taxi/coupons")}>
                <Gift size={20} className="text-purple-500" />
                <span className="text-xs font-medium">Coupons</span>
              </Button>
              <Button variant="outline" className="w-full justify-center h-auto py-3 flex-col gap-1" onClick={() => navigate("/admin/taxi/reports")}>
                <FileText size={20} className="text-indigo-500" />
                <span className="text-xs font-medium">Reports</span>
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Recent Activities">
            <div className="space-y-4">
              {MOCK_TAXI_ACTIVITIES.map((activity) => (
                <div key={activity.id} className="flex gap-3 items-start p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className={`mt-0.5 p-2 rounded-full ${
                    activity.type === "success" ? "bg-green-100 text-green-600" :
                    activity.type === "warning" ? "bg-orange-100 text-orange-600" :
                    activity.type === "error" ? "bg-red-100 text-red-600" :
                    "bg-blue-100 text-blue-600"
                  }`}>
                    <Bell size={14} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{activity.title}</h4>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{activity.message}</p>
                    <span className="text-[10px] font-medium text-gray-400 mt-1 block">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
