import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, FolderTree, Bike, Car, Bus, Truck } from "lucide-react";
import {
  PageHeader, SectionCard, StatCard, AdminTable, FilterBar, StatusBadge,
  FormLayout, FormSection, FormRow, FormField,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { taxiAdminApi } from "../../services/api";
import { filterBySearch, paginateItems } from "../utils/taxiTableHelpers";

const selectCls = "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";
const ICON_MAP = { Bike, Car, Bus, Truck };

const EMPTY_FORM = {
  name: "",
  category: "car",
  icon: "Car",
  seats: 4,
  status: "active",
  displayOrder: 0,
};

const VehicleTypes = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taxiAdminApi.getVehicleTypes({
        limit: 100,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setTypes(data.records || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load vehicle types");
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let rows = filterBySearch(types, search, ["name", "code", "category"]);
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [types, search, statusFilter]);

  const { items: pageItems, total, totalPages } = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  const openModal = (row = null) => {
    setEditing(row);
    setForm(row
      ? {
          name: row.name || "",
          category: row.category || "car",
          icon: row.icon || "Car",
          seats: row.seats || 4,
          status: row.status || "active",
          displayOrder: row.displayOrder || 0,
        }
      : EMPTY_FORM);
    setModalOpen(true);
  };

  const saveType = async () => {
    if (!form.name.trim()) {
      toast.error("Vehicle type name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing?.id) {
        await taxiAdminApi.updateVehicleType(editing.id, form);
        toast.success("Vehicle type updated");
      } else {
        await taxiAdminApi.createVehicleType(form);
        toast.success("Vehicle type created");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
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
              <p className="text-xs text-gray-500">{row.code || row.category}</p>
            </div>
          </div>
        );
      },
    },
    { key: "category", header: "Category", cell: (row) => <span className="capitalize">{row.category}</span> },
    { key: "seats", header: "Seats" },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status === "active" ? "success" : "default"} label={row.status} /> },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (row) => (
        <Button variant="ghost" size="sm" onClick={() => openModal(row)}>
          <Pencil size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader
        title="Vehicle Types"
        description="Catalog of taxi vehicle classes used for booking and pricing"
        actions={<Button onClick={() => openModal()}><Plus className="mr-2 h-4 w-4" /> Add Type</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Total Types" value={String(types.length)} icon={<FolderTree size={18} />} />
        <StatCard title="Active" value={String(types.filter((t) => t.status === "active").length)} />
        <StatCard title="Inactive" value={String(types.filter((t) => t.status !== "active").length)} />
      </div>

      <SectionCard>
        <FilterBar
          start={
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input className="pl-9" placeholder="Search types..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          }
          end={
            <select className={selectCls} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          }
        />
        <AdminTable
          columns={columns}
          data={pageItems}
          loading={loading}
          pagination={{
            page,
            pageSize,
            total,
            totalPages,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          emptyState={{ title: "No vehicle types yet", description: "Create bike, auto, car, or SUV types for taxi booking." }}
        />
      </SectionCard>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit vehicle type" : "Create vehicle type"}</DialogTitle>
          </DialogHeader>
          <FormLayout>
            <FormSection>
              <FormRow>
                <FormField label="Name" required>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Category" required>
                  <select className={selectCls + " w-full"} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    <option value="bike">Bike</option>
                    <option value="auto">Auto</option>
                    <option value="car">Car</option>
                    <option value="suv">SUV</option>
                  </select>
                </FormField>
                <FormField label="Seats">
                  <Input type="number" min={1} value={form.seats} onChange={(e) => setForm((f) => ({ ...f, seats: Number(e.target.value) }))} />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Status">
                  <select className={selectCls + " w-full"} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </FormField>
              </FormRow>
            </FormSection>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={saveType} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </FormLayout>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleTypes;
