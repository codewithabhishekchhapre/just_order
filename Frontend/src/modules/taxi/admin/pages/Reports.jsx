import React, { useMemo, useState } from "react";
import {
  FileText, IndianRupee, CarTaxiFront, Users, Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import {
  PageHeader, SectionCard, StatCard, AdminTable, FilterBar, StatusBadge,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { toast } from "sonner";
import { MOCK_RIDES, RIDE_STATUSES } from "../utils/mock/rides";
import { MOCK_TAXI_DRIVERS } from "../utils/mock/drivers";
import { MOCK_TAXI_DAILY_RIDES, MOCK_TAXI_REVENUE } from "../utils/mock/dashboard";
import { filterBySearch, sortItems, paginateItems, formatCurrency, formatDateTime } from "../utils/taxiTableHelpers";

const selectCls = "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

const Reports = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    let rows = filterBySearch(MOCK_RIDES, search, ["id", "customer", "driverName", "pickup", "drop"]);
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    if (dateFrom) rows = rows.filter((r) => new Date(r.createdAt) >= new Date(dateFrom));
    if (dateTo) rows = rows.filter((r) => new Date(r.createdAt) <= new Date(dateTo + "T23:59:59"));
    return sortItems(rows, "createdAt", "desc");
  }, [search, statusFilter, dateFrom, dateTo]);

  const { items: pageItems, total, totalPages } = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  const summary = useMemo(() => {
    const completed = filtered.filter((r) => r.status === "completed");
    return {
      rides: filtered.length,
      completed: completed.length,
      revenue: completed.reduce((s, r) => s + r.fare, 0),
      drivers: MOCK_TAXI_DRIVERS.filter((d) => d.status === "active").length,
    };
  }, [filtered]);

  const columns = [
    { key: "id", header: "Ride ID", cell: (row) => <span className="font-semibold">{row.id}</span> },
    { key: "customer", header: "Customer" },
    { key: "driverName", header: "Driver" },
    { key: "vehicleType", header: "Vehicle" },
    { key: "distanceKm", header: "Distance", cell: (row) => `${row.distanceKm} km` },
    { key: "fare", header: "Fare", cell: (row) => formatCurrency(row.fare) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge tone={RIDE_STATUSES[row.status].tone} label={RIDE_STATUSES[row.status].label} /> },
    { key: "createdAt", header: "Date", cell: (row) => <span className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</span> },
  ];

  return (
    <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader
        title="Reports"
        description="Operational and revenue reports for the taxi module"
        actions={
          <Button className="gap-2" onClick={() => toast.success("Report export queued")}>
            <Download size={16} /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Rides in Range" value={String(summary.rides)} icon={<CarTaxiFront size={18} />} />
        <StatCard title="Completed" value={String(summary.completed)} icon={<FileText size={18} />} />
        <StatCard title="Revenue" value={formatCurrency(summary.revenue)} icon={<IndianRupee size={18} />} />
        <StatCard title="Active Drivers" value={String(summary.drivers)} icon={<Users size={18} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Rides Trend">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_TAXI_DAILY_RIDES} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="rides" stroke="#f59e0b" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Revenue Trend">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_TAXI_REVENUE} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Ride Ledger" flush>
        <div className="p-4 space-y-4">
          <FilterBar
            start={
              <div className="flex flex-wrap gap-2 w-full">
                <Input className="min-w-[200px] flex-1" placeholder="Search ledger..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                <select className={selectCls} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="all">All Status</option>
                  {Object.entries(RIDE_STATUSES).map(([value, meta]) => (
                    <option key={value} value={value}>{meta.label}</option>
                  ))}
                </select>
                <Input type="date" className="w-auto" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
                <Input type="date" className="w-auto" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
              </div>
            }
          />
          <AdminTable
            columns={columns}
            data={pageItems}
            getRowId={(r) => r.id}
            pagination={{ page, totalPages, total, pageSize, onPageChange: setPage, onPageSizeChange: (s) => { setPageSize(s); setPage(1); } }}
          />
        </div>
      </SectionCard>
    </div>
  );
};

export default Reports;
