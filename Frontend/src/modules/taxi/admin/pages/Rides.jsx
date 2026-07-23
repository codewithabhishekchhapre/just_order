import React, { useMemo, useState } from "react";
import {
  Search, Eye, UserPlus, XCircle, CarTaxiFront, Clock, CheckCircle2, Circle,
  MapPin, IndianRupee, RefreshCw, Star,
} from "lucide-react";
import {
  PageHeader, SectionCard, StatCard, AdminTable, FilterBar, StatusBadge,
  FormLayout, FormSection, FormRow, FormField,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MOCK_RIDES, RIDE_STATUSES } from "../utils/mock/rides";
import { MOCK_TAXI_DRIVERS } from "../utils/mock/drivers";
import { VEHICLE_TYPE_NAMES } from "../utils/mock/vehicleTypes";
import { filterBySearch, sortItems, paginateItems, formatCurrency, formatDateTime } from "../utils/taxiTableHelpers";

const PAGE_CONFIG = {
  requests: {
    title: "Ride Requests",
    description: "Pending ride requests awaiting driver assignment",
    statuses: ["pending"],
  },
  active: {
    title: "Active Rides",
    description: "Rides currently assigned, arriving or in progress",
    statuses: ["accepted", "arriving", "in_progress"],
  },
  completed: {
    title: "Completed Rides",
    description: "Successfully finished trips",
    statuses: ["completed"],
  },
  cancelled: {
    title: "Cancelled Rides",
    description: "Trips cancelled by customer, driver or admin",
    statuses: ["cancelled"],
  },
};

const selectCls = "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

const Rides = ({ statusKey = "requests" }) => {
  const config = PAGE_CONFIG[statusKey] || PAGE_CONFIG.requests;

  const [rides, setRides] = useState(MOCK_RIDES);
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailOpen, setDetailOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [assignDriverId, setAssignDriverId] = useState("");

  const scoped = useMemo(
    () => rides.filter((r) => config.statuses.includes(r.status)),
    [rides, config],
  );

  const filtered = useMemo(() => {
    let rows = filterBySearch(scoped, search, ["id", "customer", "pickup", "drop", "driverName"]);
    if (vehicleFilter !== "all") rows = rows.filter((r) => r.vehicleType === vehicleFilter);
    if (paymentFilter !== "all") rows = rows.filter((r) => r.paymentMethod === paymentFilter);
    if (dateFrom) rows = rows.filter((r) => new Date(r.createdAt) >= new Date(dateFrom));
    if (dateTo) rows = rows.filter((r) => new Date(r.createdAt) <= new Date(dateTo + "T23:59:59"));
    return sortItems(rows, "createdAt", "desc");
  }, [scoped, search, vehicleFilter, paymentFilter, dateFrom, dateTo]);

  const { items: pageItems, total, totalPages } = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  const stats = useMemo(() => ({
    count: scoped.length,
    revenue: scoped.reduce((sum, r) => sum + (r.status === "completed" ? r.fare : 0), 0),
    avgDistance: scoped.length
      ? (scoped.reduce((sum, r) => sum + r.distanceKm, 0) / scoped.length).toFixed(1)
      : 0,
  }), [scoped]);

  const openDetail = (row) => { setSelected(row); setDetailOpen(true); };

  const handleAssign = () => {
    if (!selected || !assignDriverId) return;
    const driver = MOCK_TAXI_DRIVERS.find((d) => d.id === assignDriverId);
    setRides((prev) => prev.map((r) => r.id === selected.id ? {
      ...r,
      driverId: driver.id,
      driverName: driver.name,
      status: "accepted",
      timeline: [...(r.timeline || []), { label: `Driver Assigned — ${driver.name}`, status: "completed", at: new Date().toISOString() }],
    } : r));
    setAssignOpen(false);
    setDetailOpen(false);
    toast.success(`${driver.name} assigned to ${selected.id}`);
  };

  const handleCancel = (id) => {
    if (!window.confirm("Cancel this ride?")) return;
    setRides((prev) => prev.map((r) => r.id === id ? {
      ...r,
      status: "cancelled",
      paymentStatus: "refunded",
      cancellationReason: "Cancelled by admin",
      timeline: [...(r.timeline || []), { label: "Cancelled by Admin", status: "cancelled", at: new Date().toISOString() }],
    } : r));
    setDetailOpen(false);
    toast.success("Ride cancelled");
  };

  const handleComplete = (id) => {
    setRides((prev) => prev.map((r) => r.id === id ? {
      ...r,
      status: "completed",
      paymentStatus: "paid",
      timeline: [...(r.timeline || []), { label: "Trip Completed", status: "completed", at: new Date().toISOString() }],
    } : r));
    setDetailOpen(false);
    toast.success("Ride marked completed");
  };

  const columns = [
    { key: "id", header: "Ride ID", cell: (row) => <span className="font-semibold">{row.id}</span> },
    { key: "customer", header: "Customer" },
    { key: "pickup", header: "Pickup", cell: (row) => <span className="text-sm">{row.pickup}</span> },
    { key: "drop", header: "Drop", cell: (row) => <span className="text-sm">{row.drop}</span> },
    { key: "driverName", header: "Driver" },
    { key: "vehicleType", header: "Vehicle" },
    { key: "distanceKm", header: "Distance", cell: (row) => `${row.distanceKm} km` },
    { key: "fare", header: "Fare", cell: (row) => formatCurrency(row.fare) },
    { key: "paymentMethod", header: "Payment", cell: (row) => <span className="uppercase text-xs font-semibold text-gray-600">{row.paymentMethod}</span> },
    { key: "status", header: "Status", cell: (row) => <StatusBadge tone={RIDE_STATUSES[row.status].tone} label={RIDE_STATUSES[row.status].label} /> },
    ...(statusKey === "completed" ? [
      { key: "rating", header: "Rating", cell: (row) => row.rating ? <span className="text-yellow-600 font-medium">★ {row.rating}</span> : "—" },
    ] : []),
    ...(statusKey === "cancelled" ? [
      { key: "cancellationReason", header: "Reason", cell: (row) => <span className="text-xs text-muted-foreground">{row.cancellationReason}</span> },
    ] : []),
    { key: "createdAt", header: "Created", cell: (row) => <span className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</span> },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openDetail(row)}><Eye size={14} /></Button>
          {row.status === "pending" && (
            <Button variant="ghost" size="sm" onClick={() => { setSelected(row); setAssignDriverId(""); setAssignOpen(true); }}><UserPlus size={14} /></Button>
          )}
          {!["completed", "cancelled"].includes(row.status) && (
            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleCancel(row.id)}><XCircle size={14} /></Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader title={config.title} description={config.description} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title={config.title} value={String(stats.count)} icon={<CarTaxiFront size={18} />} />
        <StatCard title="Avg Distance" value={`${stats.avgDistance} km`} icon={<MapPin size={18} />} />
        <StatCard
          title={statusKey === "completed" ? "Revenue" : "Est. Fare Value"}
          value={formatCurrency(statusKey === "completed" ? stats.revenue : scoped.reduce((s, r) => s + r.fare, 0))}
          icon={<IndianRupee size={18} />}
        />
      </div>

      <SectionCard flush>
        <div className="p-4 space-y-4">
          <FilterBar
            start={
              <div className="flex flex-wrap gap-2 w-full">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search rides..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className={selectCls} value={vehicleFilter} onChange={(e) => { setVehicleFilter(e.target.value); setPage(1); }}>
                  <option value="all">All Vehicles</option>
                  {VEHICLE_TYPE_NAMES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select className={selectCls} value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}>
                  <option value="all">All Payments</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="wallet">Wallet</option>
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

      {/* Ride Details */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="just-order-theme-scope sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ride {selected?.id}</DialogTitle></DialogHeader>
          {selected && (
            <>
              <div className="px-6 py-4 overflow-y-auto">
                <FormLayout>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <StatusBadge tone={RIDE_STATUSES[selected.status].tone} label={RIDE_STATUSES[selected.status].label} />
                    <StatusBadge status={selected.paymentStatus === "paid" ? "success" : selected.paymentStatus === "refunded" ? "danger" : "warning"} label={selected.paymentStatus} />
                    <StatusBadge status="neutral" label={selected.vehicleType} />
                  </div>

                  <FormSection title="Ride Summary">
                    <FormRow>
                      <FormField label="Customer"><div className="text-sm font-medium">{selected.customer}</div></FormField>
                      <FormField label="Phone"><div className="text-sm font-medium">{selected.customerPhone}</div></FormField>
                    </FormRow>
                    <FormRow>
                      <FormField label="Driver"><div className="text-sm font-medium">{selected.driverName}</div></FormField>
                      <FormField label="Ride OTP"><div className="text-sm font-mono font-semibold">{selected.otp}</div></FormField>
                    </FormRow>
                    <FormRow>
                      <FormField label="Distance"><div className="text-sm font-medium">{selected.distanceKm} km · {selected.durationMin} min</div></FormField>
                      <FormField label="Fare"><div className="text-sm font-medium text-emerald-600">{formatCurrency(selected.fare)} ({selected.paymentMethod.toUpperCase()})</div></FormField>
                    </FormRow>
                    {selected.rating && (
                      <FormRow>
                        <FormField label="Customer Rating">
                          <div className="text-sm font-medium text-yellow-600 flex items-center gap-1"><Star size={14} /> {selected.rating} / 5</div>
                        </FormField>
                      </FormRow>
                    )}
                    {selected.cancellationReason && (
                      <FormRow>
                        <FormField label="Cancellation Reason"><div className="text-sm text-red-600">{selected.cancellationReason}</div></FormField>
                      </FormRow>
                    )}
                  </FormSection>

                  <FormSection title="Route">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 text-sm p-3 border rounded-lg bg-gray-50/50">
                        <MapPin size={16} className="mt-0.5 text-green-600 shrink-0" />
                        <div><p className="font-semibold text-gray-900">Pickup</p><p className="text-muted-foreground">{selected.pickup}</p></div>
                      </div>
                      <div className="flex items-start gap-3 text-sm p-3 border rounded-lg bg-gray-50/50">
                        <MapPin size={16} className="mt-0.5 text-red-600 shrink-0" />
                        <div><p className="font-semibold text-gray-900">Drop</p><p className="text-muted-foreground">{selected.drop}</p></div>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection title="Trip Timeline">
                    <div className="space-y-4 pl-2">
                      {(selected.timeline || []).map((step, i) => (
                        <div key={i} className="flex gap-4 relative">
                          {i !== (selected.timeline || []).length - 1 && (
                            <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-gray-200" />
                          )}
                          <div className="relative z-10 shrink-0 mt-1">
                            {step.status === "completed" ? <CheckCircle2 size={24} className="text-green-600 bg-white" /> :
                             step.status === "cancelled" ? <XCircle size={24} className="text-red-500 bg-white" /> :
                             <Circle size={24} className="text-amber-500 bg-white fill-amber-50" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{step.label}</p>
                            {step.at && <p className="text-xs text-muted-foreground">{formatDateTime(step.at)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </FormSection>
                </FormLayout>
              </div>
              <div className="px-6 py-4 border-t flex flex-wrap gap-2 justify-end bg-gray-50/50">
                {selected.status === "pending" && (
                  <Button size="sm" className="gap-1" onClick={() => { setAssignDriverId(""); setAssignOpen(true); }}><UserPlus size={14} /> Assign Driver</Button>
                )}
                {["accepted", "arriving"].includes(selected.status) && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                    setRides((prev) => prev.map((r) => r.id === selected.id ? { ...r, status: "in_progress", timeline: [...(r.timeline || []), { label: "Trip Started", status: "completed", at: new Date().toISOString() }] } : r));
                    setDetailOpen(false);
                  }}><RefreshCw size={14} /> Mark Trip Started</Button>
                )}
                {selected.status === "in_progress" && (
                  <Button size="sm" onClick={() => handleComplete(selected.id)}>Mark Completed</Button>
                )}
                {!["completed", "cancelled"].includes(selected.status) && (
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleCancel(selected.id)}>Cancel Ride</Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Driver */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="just-order-theme-scope sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Assign Driver</DialogTitle></DialogHeader>
          <select className={selectCls + " w-full"} value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)}>
            <option value="">Select driver</option>
            {MOCK_TAXI_DRIVERS.filter((d) => d.onlineStatus === "online" && d.status === "active").map((d) => (
              <option key={d.id} value={d.id}>{d.name} · {d.vehicleType} · ★{d.rating}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!assignDriverId}>Assign</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rides;
