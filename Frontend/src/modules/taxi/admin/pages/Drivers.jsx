import React, { useMemo, useState } from "react";
import { Search, Eye, Users, Wifi, Star, Ban, CheckCircle2 } from "lucide-react";
import {
  PageHeader, SectionCard, StatCard, AdminTable, FilterBar, StatusBadge,
  FormLayout, FormSection, FormRow, FormField,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MOCK_TAXI_DRIVERS } from "../utils/mock/drivers";
import { VEHICLE_TYPE_NAMES } from "../utils/mock/vehicleTypes";
import { filterBySearch, sortItems, paginateItems, formatCurrency, formatDateTime } from "../utils/taxiTableHelpers";

const selectCls = "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

const Drivers = () => {
  const [drivers, setDrivers] = useState(MOCK_TAXI_DRIVERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlineFilter, setOnlineFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    let rows = filterBySearch(drivers, search, ["id", "name", "phone", "vehicleNumber", "currentZone"]);
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    if (onlineFilter !== "all") rows = rows.filter((r) => r.onlineStatus === onlineFilter);
    if (vehicleFilter !== "all") rows = rows.filter((r) => r.vehicleType === vehicleFilter);
    return sortItems(rows, "name", "asc");
  }, [drivers, search, statusFilter, onlineFilter, vehicleFilter]);

  const { items: pageItems, total, totalPages } = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  const stats = useMemo(() => ({
    total: drivers.length,
    online: drivers.filter((d) => d.onlineStatus === "online").length,
    active: drivers.filter((d) => d.status === "active").length,
    suspended: drivers.filter((d) => d.status === "suspended").length,
  }), [drivers]);

  const toggleStatus = (id) => {
    setDrivers((prev) => prev.map((d) => {
      if (d.id !== id) return d;
      const next = d.status === "active" ? "suspended" : "active";
      toast.success(`${d.name} marked ${next}`);
      return { ...d, status: next, onlineStatus: next === "suspended" ? "offline" : d.onlineStatus };
    }));
    setDetailOpen(false);
  };

  const columns = [
    {
      key: "name", header: "Driver",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <img src={row.photo} alt={row.name} className="w-9 h-9 rounded-full bg-gray-100" />
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-gray-500">{row.id}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone" },
    { key: "vehicleType", header: "Vehicle", cell: (row) => (
      <div>
        <p className="font-medium text-sm">{row.vehicleType}</p>
        <p className="text-xs text-gray-500">{row.vehicleNumber}</p>
      </div>
    ) },
    { key: "currentZone", header: "Zone" },
    { key: "ridesCompleted", header: "Rides" },
    { key: "rating", header: "Rating", cell: (row) => <span className="text-yellow-600 font-medium">★ {row.rating}</span> },
    { key: "walletBalance", header: "Wallet", cell: (row) => formatCurrency(row.walletBalance) },
    { key: "onlineStatus", header: "Online", cell: (row) => <StatusBadge status={row.onlineStatus === "online" ? "success" : "default"} label={row.onlineStatus} /> },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status === "active" ? "success" : "danger"} label={row.status} /> },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (row) => (
        <Button variant="ghost" size="sm" onClick={() => { setSelected(row); setDetailOpen(true); }}><Eye size={14} /></Button>
      ),
    },
  ];

  return (
    <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader title="Drivers" description="Manage registered taxi drivers and their availability" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Drivers" value={String(stats.total)} icon={<Users size={18} />} />
        <StatCard title="Online Now" value={String(stats.online)} icon={<Wifi size={18} />} />
        <StatCard title="Active" value={String(stats.active)} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Suspended" value={String(stats.suspended)} icon={<Ban size={18} />} />
      </div>

      <SectionCard flush>
        <div className="p-4 space-y-4">
          <FilterBar
            start={
              <div className="flex flex-wrap gap-2 w-full">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search drivers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className={selectCls} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
                <select className={selectCls} value={onlineFilter} onChange={(e) => { setOnlineFilter(e.target.value); setPage(1); }}>
                  <option value="all">Online / Offline</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
                <select className={selectCls} value={vehicleFilter} onChange={(e) => { setVehicleFilter(e.target.value); setPage(1); }}>
                  <option value="all">All Vehicles</option>
                  {VEHICLE_TYPE_NAMES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
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

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="just-order-theme-scope sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Driver Details</DialogTitle></DialogHeader>
          {selected && (
            <>
              <div className="px-6 py-4">
                <div className="flex items-center gap-4 mb-5">
                  <img src={selected.photo} alt={selected.name} className="w-16 h-16 rounded-2xl bg-gray-100" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selected.name}</h3>
                    <p className="text-sm text-gray-500">{selected.id}</p>
                    <div className="flex gap-2 mt-2">
                      <StatusBadge status={selected.onlineStatus === "online" ? "success" : "default"} label={selected.onlineStatus} />
                      <StatusBadge status={selected.status === "active" ? "success" : "danger"} label={selected.status} />
                    </div>
                  </div>
                </div>
                <FormLayout>
                  <FormSection title="Contact">
                    <FormRow>
                      <FormField label="Phone"><div className="text-sm font-medium">{selected.phone}</div></FormField>
                      <FormField label="Email"><div className="text-sm font-medium">{selected.email}</div></FormField>
                    </FormRow>
                  </FormSection>
                  <FormSection title="Vehicle">
                    <FormRow>
                      <FormField label="Type"><div className="text-sm font-medium">{selected.vehicleType}</div></FormField>
                      <FormField label="Number"><div className="text-sm font-medium">{selected.vehicleNumber}</div></FormField>
                    </FormRow>
                    <FormRow>
                      <FormField label="License"><div className="text-sm font-medium">{selected.licenseNumber}</div></FormField>
                      <FormField label="Zone"><div className="text-sm font-medium">{selected.currentZone}</div></FormField>
                    </FormRow>
                  </FormSection>
                  <FormSection title="Performance">
                    <FormRow>
                      <FormField label="Completed Rides"><div className="text-sm font-medium">{selected.ridesCompleted}</div></FormField>
                      <FormField label="Rating"><div className="text-sm font-medium text-yellow-600 flex items-center gap-1"><Star size={14} /> {selected.rating}</div></FormField>
                    </FormRow>
                    <FormRow>
                      <FormField label="Wallet"><div className="text-sm font-medium">{formatCurrency(selected.walletBalance)}</div></FormField>
                      <FormField label="Joined"><div className="text-sm font-medium">{formatDateTime(selected.joinedAt)}</div></FormField>
                    </FormRow>
                  </FormSection>
                </FormLayout>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50/50">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                <Button
                  variant={selected.status === "active" ? "outline" : "default"}
                  className={selected.status === "active" ? "text-red-600" : ""}
                  onClick={() => toggleStatus(selected.id)}
                >
                  {selected.status === "active" ? "Suspend Driver" : "Activate Driver"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Drivers;
