import React, { useMemo, useState } from "react";
import { Plus, Search, Pencil, FolderTree, Bike, Car, Bus, Truck } from "lucide-react";
import {
  PageHeader, SectionCard, StatCard, AdminTable, FilterBar, StatusBadge,
  FormLayout, FormSection, FormRow, FormField,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MOCK_VEHICLE_TYPES } from "../utils/mock/vehicleTypes";
import { filterBySearch, paginateItems, formatCurrency } from "../utils/taxiTableHelpers";

const selectCls = "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

const ICON_MAP = { Bike, Car, Bus, Truck, CarFront: Car };

const EMPTY_FORM = {
  name: "",
  icon: "Car",
  description: "",
  capacity: 4,
  baseFare: 50,
  perKmRate: 14,
  perMinRate: 2,
  minFare: 80,
  commissionPercent: 20,
  status: "active",
};

const VehicleTypes = () => {
  const [types, setTypes] = useState(MOCK_VEHICLE_TYPES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = useMemo(() => {
    let rows = filterBySearch(types, search, ["name", "description"]);
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [types, search, statusFilter]);

  const { items: pageItems, total, totalPages } = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  const openModal = (row = null) => {
    setEditing(row);
    setForm(row ? { ...row } : EMPTY_FORM);
    setModalOpen(true);
  };

  const saveType = () => {
    if (!form.name.trim()) {
      toast.error("Vehicle type name is required");
      return;
    }
    if (editing) {
      setTypes((prev) => prev.map((t) => t.id === editing.id ? { ...editing, ...form } : t));
      toast.success("Vehicle type updated");
    } else {
      const id = `VT-${String(types.length + 1).padStart(2, "0")}`;
      setTypes((prev) => [...prev, { ...form, id, activeVehicles: 0 }]);
      toast.success("Vehicle type created");
    }
    setModalOpen(false);
  };

  const columns = [
    {
      key: "name", header: "Type",
      cell: (row) => {
        const Icon = ICON_MAP[row.icon] || Car;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Icon size={16} />
            </div>
            <div>
              <p className="font-medium">{row.name}</p>
              <p className="text-xs text-gray-500">{row.description}</p>
            </div>
          </div>
        );
      },
    },
    { key: "capacity", header: "Seats" },
    { key: "baseFare", header: "Base Fare", cell: (row) => formatCurrency(row.baseFare) },
    { key: "perKmRate", header: "Per Km", cell: (row) => formatCurrency(row.perKmRate) },
    { key: "minFare", header: "Min Fare", cell: (row) => formatCurrency(row.minFare) },
    { key: "commissionPercent", header: "Commission", cell: (row) => `${row.commissionPercent}%` },
    { key: "activeVehicles", header: "Fleet" },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status === "active" ? "success" : "default"} label={row.status} /> },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (row) => <Button variant="ghost" size="sm" onClick={() => openModal(row)}><Pencil size={14} /></Button>,
    },
  ];

  return (
    <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader
        title="Vehicle Types"
        description="Configure Bike, Auto, Taxi, Cab and other ride categories"
        actions={<Button className="gap-2" onClick={() => openModal()}><Plus size={16} /> Add Type</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Vehicle Types" value={String(types.length)} icon={<FolderTree size={18} />} />
        <StatCard title="Active Types" value={String(types.filter((t) => t.status === "active").length)} />
        <StatCard title="Total Fleet" value={String(types.reduce((s, t) => s + t.activeVehicles, 0))} />
      </div>

      <SectionCard flush>
        <div className="p-4 space-y-4">
          <FilterBar
            start={
              <div className="flex flex-wrap gap-2 w-full">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search types..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="just-order-theme-scope sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Vehicle Type" : "Add Vehicle Type"}</DialogTitle></DialogHeader>
          <div className="px-6 py-4">
            <FormLayout>
              <FormSection title="Basics">
                <FormRow>
                  <FormField label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
                  <FormField label="Icon">
                    <select className={selectCls + " w-full"} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
                      <option value="Bike">Bike</option>
                      <option value="Truck">Auto</option>
                      <option value="Car">Taxi</option>
                      <option value="CarFront">Premium</option>
                      <option value="Bus">SUV</option>
                    </select>
                  </FormField>
                </FormRow>
                <FormRow>
                  <FormField label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
                  <FormField label="Capacity"><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></FormField>
                </FormRow>
              </FormSection>
              <FormSection title="Fare Defaults">
                <FormRow>
                  <FormField label="Base Fare"><Input type="number" value={form.baseFare} onChange={(e) => setForm({ ...form, baseFare: Number(e.target.value) })} /></FormField>
                  <FormField label="Per Km"><Input type="number" value={form.perKmRate} onChange={(e) => setForm({ ...form, perKmRate: Number(e.target.value) })} /></FormField>
                </FormRow>
                <FormRow>
                  <FormField label="Per Minute"><Input type="number" value={form.perMinRate} onChange={(e) => setForm({ ...form, perMinRate: Number(e.target.value) })} /></FormField>
                  <FormField label="Min Fare"><Input type="number" value={form.minFare} onChange={(e) => setForm({ ...form, minFare: Number(e.target.value) })} /></FormField>
                </FormRow>
                <FormRow>
                  <FormField label="Commission %"><Input type="number" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: Number(e.target.value) })} /></FormField>
                  <FormField label="Status">
                    <select className={selectCls + " w-full"} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </FormField>
                </FormRow>
              </FormSection>
            </FormLayout>
          </div>
          <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50/50">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={saveType}>{editing ? "Save Changes" : "Create Type"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleTypes;
