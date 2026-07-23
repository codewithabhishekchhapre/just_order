import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, IndianRupee, Trash2 } from "lucide-react";
import {
  PageHeader, SectionCard, StatCard, AdminTable, StatusBadge,
  FormRow, FormField,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { taxiAdminApi } from "../../services/api";
import { formatCurrency } from "../utils/taxiTableHelpers";

const selectCls = "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

const EMPTY_FORM = {
  vehicleTypeId: "",
  zoneId: "",
  baseFare: 50,
  baseDistanceKm: 0,
  perKmRate: 12,
  perMinRate: 2,
  freeWaitMinutes: 5,
  perMinWaitRate: 2,
  platformFee: 5,
  surgeMultiplier: 1,
  status: "active",
};

const Pricing = () => {
  const [rows, setRows] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pricing, types, zoneList] = await Promise.all([
        taxiAdminApi.getPricing({ limit: 100 }),
        taxiAdminApi.getVehicleTypeDropdown(),
        taxiAdminApi.getZoneDropdown(),
      ]);
      setRows(pricing.records || []);
      setVehicleTypes(types || []);
      setZones(zoneList || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load pricing");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const avgBase = useMemo(() => {
    if (!rows.length) return 0;
    return Math.round(rows.reduce((s, f) => s + Number(f.baseFare || 0), 0) / rows.length);
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      vehicleTypeId: vehicleTypes[0]?.id || "",
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      vehicleTypeId: row.vehicleTypeId || row.vehicleType?.id || "",
      zoneId: row.zoneId || "",
      baseFare: Number(row.baseFare || 0),
      baseDistanceKm: Number(row.baseDistanceKm || 0),
      perKmRate: Number(row.perKmRate || 0),
      perMinRate: Number(row.perMinRate || 0),
      freeWaitMinutes: Number(row.freeWaitMinutes || 0),
      perMinWaitRate: Number(row.perMinWaitRate || 0),
      platformFee: Number(row.platformFee || 0),
      surgeMultiplier: Number(row.surgeMultiplier ?? 1),
      status: row.status || "active",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.vehicleTypeId) {
      toast.error("Select a vehicle type");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        zoneId: form.zoneId || null,
      };
      if (editing?.id) {
        await taxiAdminApi.updatePricing(editing.id, body);
        toast.success("Pricing updated");
      } else {
        await taxiAdminApi.createPricing(body);
        toast.success("Pricing created");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm("Delete this pricing rule?")) return;
    try {
      await taxiAdminApi.deletePricing(row.id);
      toast.success("Pricing deleted");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const columns = [
    {
      key: "vehicle",
      header: "Vehicle Type",
      cell: (row) => (
        <span className="font-semibold">
          {row.vehicleType?.name || vehicleTypes.find((v) => v.id === row.vehicleTypeId)?.name || "—"}
        </span>
      ),
    },
    {
      key: "zone",
      header: "Zone",
      cell: (row) => row.zone?.name || zones.find((z) => z.id === row.zoneId)?.name || "All zones",
    },
    { key: "baseFare", header: "Base", cell: (row) => formatCurrency(row.baseFare) },
    { key: "perKmRate", header: "Per Km", cell: (row) => formatCurrency(row.perKmRate) },
    { key: "perMinRate", header: "Per Min", cell: (row) => formatCurrency(row.perMinRate) },
    { key: "platformFee", header: "Platform", cell: (row) => formatCurrency(row.platformFee) },
    { key: "surgeMultiplier", header: "Surge", cell: (row) => `${row.surgeMultiplier || 1}x` },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status === "active" ? "success" : "default"} label={row.status} /> },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil size={14} /></Button>
          <Button variant="ghost" size="sm" onClick={() => remove(row)}><Trash2 size={14} /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader
        title="Pricing / Fare Management"
        description="Base fare, distance, time and platform fees per vehicle type"
        actions={<Button onClick={openCreate} disabled={!vehicleTypes.length}><Plus className="mr-2 h-4 w-4" /> Add Pricing</Button>}
      />

      {!vehicleTypes.length && !loading && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          Create at least one vehicle type before adding pricing rules.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Pricing Rules" value={String(rows.length)} icon={<IndianRupee size={18} />} />
        <StatCard title="Avg Base Fare" value={formatCurrency(avgBase)} />
        <StatCard title="Vehicle Types" value={String(vehicleTypes.length)} />
        <StatCard title="Zones" value={String(zones.length)} />
      </div>

      <SectionCard title="Fare Matrix" flush>
        <div className="p-4">
          <AdminTable
            columns={columns}
            data={rows}
            loading={loading}
            getRowId={(r) => r.id}
            emptyState={{ title: "No pricing rules", description: "Add pricing for each vehicle type (optionally per zone)." }}
          />
        </div>
      </SectionCard>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit pricing" : "Create pricing"}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
            <FormField label="Vehicle Type" required>
              <select
                className={selectCls + " w-full"}
                value={form.vehicleTypeId}
                disabled={Boolean(editing)}
                onChange={(e) => setForm((f) => ({ ...f, vehicleTypeId: e.target.value }))}
              >
                <option value="">Select…</option>
                {vehicleTypes.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Zone (optional)">
              <select
                className={selectCls + " w-full"}
                value={form.zoneId || ""}
                onChange={(e) => setForm((f) => ({ ...f, zoneId: e.target.value }))}
              >
                <option value="">All zones</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </FormField>
            <FormRow>
              <FormField label="Base Fare"><Input type="number" value={form.baseFare} onChange={(e) => setForm((f) => ({ ...f, baseFare: Number(e.target.value) }))} /></FormField>
              <FormField label="Base Distance (km)"><Input type="number" value={form.baseDistanceKm} onChange={(e) => setForm((f) => ({ ...f, baseDistanceKm: Number(e.target.value) }))} /></FormField>
            </FormRow>
            <FormRow>
              <FormField label="Per Km"><Input type="number" value={form.perKmRate} onChange={(e) => setForm((f) => ({ ...f, perKmRate: Number(e.target.value) }))} /></FormField>
              <FormField label="Per Min"><Input type="number" value={form.perMinRate} onChange={(e) => setForm((f) => ({ ...f, perMinRate: Number(e.target.value) }))} /></FormField>
            </FormRow>
            <FormRow>
              <FormField label="Free Wait (min)"><Input type="number" value={form.freeWaitMinutes} onChange={(e) => setForm((f) => ({ ...f, freeWaitMinutes: Number(e.target.value) }))} /></FormField>
              <FormField label="Wait / Min"><Input type="number" value={form.perMinWaitRate} onChange={(e) => setForm((f) => ({ ...f, perMinWaitRate: Number(e.target.value) }))} /></FormField>
            </FormRow>
            <FormRow>
              <FormField label="Platform Fee"><Input type="number" value={form.platformFee} onChange={(e) => setForm((f) => ({ ...f, platformFee: Number(e.target.value) }))} /></FormField>
              <FormField label="Surge Multiplier"><Input type="number" step="0.1" value={form.surgeMultiplier} onChange={(e) => setForm((f) => ({ ...f, surgeMultiplier: Number(e.target.value) }))} /></FormField>
            </FormRow>
            <FormField label="Status">
              <select className={selectCls + " w-full"} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormField>
          </div>
          <div className="flex justify-end gap-2 px-6 pb-6">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pricing;
