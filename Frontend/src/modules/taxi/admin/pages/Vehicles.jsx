import React, { useMemo, useState } from "react";
import { Search, Eye, Truck, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  PageHeader, SectionCard, StatCard, AdminTable, FilterBar, StatusBadge,
  FormLayout, FormSection, FormRow, FormField,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MOCK_TAXI_VEHICLES } from "../utils/mock/vehicles";
import { VEHICLE_TYPE_NAMES } from "../utils/mock/vehicleTypes";
import { filterBySearch, sortItems, paginateItems, formatDateTime } from "../utils/taxiTableHelpers";

const selectCls = "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

const Vehicles = () => {
  const [vehicles, setVehicles] = useState(MOCK_TAXI_VEHICLES);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    let rows = filterBySearch(vehicles, search, ["id", "number", "brand", "model", "ownerName", "rcNumber"]);
    if (typeFilter !== "all") rows = rows.filter((r) => r.type === typeFilter);
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    return sortItems(rows, "number", "asc");
  }, [vehicles, search, typeFilter, statusFilter]);

  const { items: pageItems, total, totalPages } = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  const stats = useMemo(() => ({
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === "active").length,
    pending: vehicles.filter((v) => v.verification === "pending").length,
  }), [vehicles]);

  const verifyVehicle = (id) => {
    setVehicles((prev) => prev.map((v) => v.id === id ? { ...v, verification: "verified" } : v));
    toast.success("Vehicle marked as verified");
    setDetailOpen(false);
  };

  const columns = [
    { key: "number", header: "Plate", cell: (row) => <span className="font-semibold font-mono">{row.number}</span> },
    { key: "type", header: "Type" },
    { key: "model", header: "Model", cell: (row) => `${row.brand} ${row.model}` },
    { key: "ownerName", header: "Owner / Driver" },
    { key: "year", header: "Year" },
    { key: "verification", header: "Verification", cell: (row) => <StatusBadge status={row.verification === "verified" ? "success" : "warning"} label={row.verification} /> },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status === "active" ? "success" : "default"} label={row.status} /> },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (row) => <Button variant="ghost" size="sm" onClick={() => { setSelected(row); setDetailOpen(true); }}><Eye size={14} /></Button>,
    },
  ];

  return (
    <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader title="Vehicles" description="Registered taxi fleet and compliance documents" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Total Vehicles" value={String(stats.total)} icon={<Truck size={18} />} />
        <StatCard title="Active" value={String(stats.active)} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Pending Verification" value={String(stats.pending)} icon={<AlertTriangle size={18} />} />
      </div>

      <SectionCard flush>
        <div className="p-4 space-y-4">
          <FilterBar
            start={
              <div className="flex flex-wrap gap-2 w-full">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search vehicles..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className={selectCls} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                  <option value="all">All Types</option>
                  {VEHICLE_TYPE_NAMES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select className={selectCls} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
        <DialogContent className="just-order-theme-scope sm:max-w-[520px]">
          <DialogHeader><DialogTitle>Vehicle {selected?.number}</DialogTitle></DialogHeader>
          {selected && (
            <>
              <div className="px-6 py-4">
                <FormLayout>
                  <FormSection title="Vehicle Info">
                    <FormRow>
                      <FormField label="Type"><div className="text-sm font-medium">{selected.type}</div></FormField>
                      <FormField label="Model"><div className="text-sm font-medium">{selected.brand} {selected.model} ({selected.year})</div></FormField>
                    </FormRow>
                    <FormRow>
                      <FormField label="Owner"><div className="text-sm font-medium">{selected.ownerName}</div></FormField>
                      <FormField label="Driver ID"><div className="text-sm font-medium">{selected.driverId}</div></FormField>
                    </FormRow>
                  </FormSection>
                  <FormSection title="Compliance">
                    <FormRow>
                      <FormField label="RC Number"><div className="text-sm font-medium">{selected.rcNumber}</div></FormField>
                      <FormField label="Insurance Expiry"><div className="text-sm font-medium">{formatDateTime(selected.insuranceExpiry)}</div></FormField>
                    </FormRow>
                    <FormRow>
                      <FormField label="Fitness Expiry"><div className="text-sm font-medium">{formatDateTime(selected.fitnessExpiry)}</div></FormField>
                      <FormField label="Verification">
                        <StatusBadge status={selected.verification === "verified" ? "success" : "warning"} label={selected.verification} />
                      </FormField>
                    </FormRow>
                  </FormSection>
                </FormLayout>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50/50">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                {selected.verification === "pending" && (
                  <Button onClick={() => verifyVehicle(selected.id)}>Mark Verified</Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vehicles;
