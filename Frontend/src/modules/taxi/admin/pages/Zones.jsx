import React, { useMemo, useState } from "react";
import { Plus, Search, Pencil, MapPin } from "lucide-react";
import {
  PageHeader, SectionCard, StatCard, AdminTable, FilterBar, StatusBadge,
  FormLayout, FormSection, FormRow, FormField,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MOCK_TAXI_ZONES } from "../utils/mock/zones";
import { filterBySearch, paginateItems } from "../utils/taxiTableHelpers";

const selectCls = "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

const EMPTY_FORM = {
  name: "",
  city: "Indore",
  areaKm2: 10,
  activeDrivers: 0,
  dailyRides: 0,
  surgeMultiplier: 1,
  status: "active",
};

const Zones = () => {
  const [zones, setZones] = useState(MOCK_TAXI_ZONES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = useMemo(() => {
    let rows = filterBySearch(zones, search, ["name", "city"]);
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [zones, search, statusFilter]);

  const { items: pageItems, total, totalPages } = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  const openModal = (row = null) => {
    setEditing(row);
    setForm(row ? { ...row } : EMPTY_FORM);
    setModalOpen(true);
  };

  const saveZone = () => {
    if (!form.name.trim()) {
      toast.error("Zone name is required");
      return;
    }
    if (editing) {
      setZones((prev) => prev.map((z) => z.id === editing.id ? { ...editing, ...form } : z));
      toast.success("Zone updated");
    } else {
      const id = `TXZ-${String(zones.length + 1).padStart(2, "0")}`;
      setZones((prev) => [...prev, { ...form, id }]);
      toast.success("Zone created");
    }
    setModalOpen(false);
  };

  const columns = [
    { key: "name", header: "Zone", cell: (row) => (
      <div>
        <p className="font-semibold">{row.name}</p>
        <p className="text-xs text-gray-500">{row.city}</p>
      </div>
    ) },
    { key: "areaKm2", header: "Area", cell: (row) => `${row.areaKm2} km²` },
    { key: "activeDrivers", header: "Drivers" },
    { key: "dailyRides", header: "Daily Rides" },
    { key: "surgeMultiplier", header: "Surge", cell: (row) => (
      <span className={row.surgeMultiplier > 1 ? "font-semibold text-orange-600" : ""}>{row.surgeMultiplier}x</span>
    ) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status === "active" ? "success" : "default"} label={row.status} /> },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (row) => <Button variant="ghost" size="sm" onClick={() => openModal(row)}><Pencil size={14} /></Button>,
    },
  ];

  return (
    <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader
        title="Service Zones"
        description="Define operational areas and surge pricing multipliers"
        actions={<Button className="gap-2" onClick={() => openModal()}><Plus size={16} /> Add Zone</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Zones" value={String(zones.length)} icon={<MapPin size={18} />} />
        <StatCard title="Active Zones" value={String(zones.filter((z) => z.status === "active").length)} />
        <StatCard title="Drivers Deployed" value={String(zones.reduce((s, z) => s + z.activeDrivers, 0))} />
      </div>

      <SectionCard flush>
        <div className="p-4 space-y-4">
          <FilterBar
            start={
              <div className="flex flex-wrap gap-2 w-full">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search zones..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
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
        <DialogContent className="just-order-theme-scope sm:max-w-[520px]">
          <DialogHeader><DialogTitle>{editing ? "Edit Zone" : "Add Zone"}</DialogTitle></DialogHeader>
          <div className="px-6 py-4">
            <FormLayout>
              <FormSection title="Zone Details">
                <FormRow>
                  <FormField label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
                  <FormField label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></FormField>
                </FormRow>
                <FormRow>
                  <FormField label="Area (km²)"><Input type="number" value={form.areaKm2} onChange={(e) => setForm({ ...form, areaKm2: Number(e.target.value) })} /></FormField>
                  <FormField label="Surge Multiplier"><Input type="number" step="0.1" value={form.surgeMultiplier} onChange={(e) => setForm({ ...form, surgeMultiplier: Number(e.target.value) })} /></FormField>
                </FormRow>
                <FormRow>
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
            <Button onClick={saveZone}>{editing ? "Save Changes" : "Create Zone"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Zones;
