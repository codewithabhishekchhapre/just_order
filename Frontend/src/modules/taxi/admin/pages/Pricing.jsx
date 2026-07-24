import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, IndianRupee, Trash2, Loader2, Copy } from "lucide-react";
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

const selectCls =
  "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

const emptySlab = (fromKm = 0, toKm = 2) => ({
  fromKm,
  toKm,
  baseFare: 50,
  baseDistanceKm: 0,
  perKmRate: 12,
  perMinRate: 2,
  freeWaitMinutes: 5,
  perMinWaitRate: 2,
  platformFee: 5,
  surgeMultiplier: 1,
});

const EMPTY_FORM = {
  vehicleTypeId: "",
  zoneId: "",
  status: "active",
  slabs: [emptySlab(0, 2), emptySlab(2, 5)],
};

const formatSlabRange = (slab) => {
  const from = Number(slab?.fromKm ?? 0);
  const to = slab?.toKm;
  if (to == null || to === "") return `${from}+ km`;
  return `${from}–${to} km`;
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  const avgBase = useMemo(() => {
    if (!rows.length) return 0;
    const bases = rows.flatMap((r) =>
      (r.slabs?.length ? r.slabs : [{ baseFare: r.baseFare }]).map((s) =>
        Number(s.baseFare || 0),
      ),
    );
    if (!bases.length) return 0;
    return Math.round(bases.reduce((s, n) => s + n, 0) / bases.length);
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      vehicleTypeId: vehicleTypes[0]?.id || "",
      slabs: [emptySlab(0, 2), emptySlab(2, 5)],
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    const slabs =
      Array.isArray(row.slabs) && row.slabs.length
        ? row.slabs.map((s) => ({
            fromKm: Number(s.fromKm || 0),
            toKm: s.toKm == null ? "" : Number(s.toKm),
            baseFare: Number(s.baseFare || 0),
            baseDistanceKm: Number(s.baseDistanceKm || 0),
            perKmRate: Number(s.perKmRate || 0),
            perMinRate: Number(s.perMinRate || 0),
            freeWaitMinutes: Number(s.freeWaitMinutes || 0),
            perMinWaitRate: Number(s.perMinWaitRate || 0),
            platformFee: Number(s.platformFee || 0),
            surgeMultiplier: Number(s.surgeMultiplier ?? 1),
          }))
        : [
            {
              fromKm: 0,
              toKm: "",
              baseFare: Number(row.baseFare || 0),
              baseDistanceKm: Number(row.baseDistanceKm || 0),
              perKmRate: Number(row.perKmRate || 0),
              perMinRate: Number(row.perMinRate || 0),
              freeWaitMinutes: Number(row.freeWaitMinutes || 0),
              perMinWaitRate: Number(row.perMinWaitRate || 0),
              platformFee: Number(row.platformFee || 0),
              surgeMultiplier: Number(row.surgeMultiplier ?? 1),
            },
          ];
    setForm({
      vehicleTypeId: row.vehicleTypeId || row.vehicleType?.id || "",
      zoneId: row.zoneId || "",
      status: row.status || "active",
      slabs,
    });
    setModalOpen(true);
  };

  const updateSlab = (index, patch) => {
    setForm((f) => ({
      ...f,
      slabs: f.slabs.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const addSlab = () => {
    setForm((f) => {
      const last = f.slabs[f.slabs.length - 1];
      const prevTo = last?.toKm === "" || last?.toKm == null ? Number(last?.fromKm || 0) + 5 : Number(last.toKm);
      const next = emptySlab(prevTo, prevTo + 5);
      // close previous open-ended slab
      const slabs = f.slabs.map((s, i) =>
        i === f.slabs.length - 1 && (s.toKm === "" || s.toKm == null)
          ? { ...s, toKm: prevTo }
          : s,
      );
      return { ...f, slabs: [...slabs, next] };
    });
  };

  const duplicateSlab = (index) => {
    setForm((f) => {
      const src = f.slabs[index];
      const copy = {
        ...src,
        fromKm: Number(src.toKm || src.fromKm || 0),
        toKm: Number(src.toKm || src.fromKm || 0) + 5,
      };
      const next = [...f.slabs];
      next.splice(index + 1, 0, copy);
      return { ...f, slabs: next };
    });
  };

  const removeSlab = (index) => {
    setForm((f) => {
      if (f.slabs.length <= 1) {
        toast.message("Keep at least one slab");
        return f;
      }
      return { ...f, slabs: f.slabs.filter((_, i) => i !== index) };
    });
  };

  const save = async () => {
    if (!form.vehicleTypeId) {
      toast.error("Select a vehicle type");
      return;
    }
    if (!form.slabs?.length) {
      toast.error("Add at least one distance slab");
      return;
    }

    const slabs = form.slabs.map((s) => ({
      ...s,
      fromKm: Number(s.fromKm || 0),
      toKm: s.toKm === "" || s.toKm == null ? null : Number(s.toKm),
      baseFare: Number(s.baseFare || 0),
      baseDistanceKm: Number(s.baseDistanceKm || 0),
      perKmRate: Number(s.perKmRate || 0),
      perMinRate: Number(s.perMinRate || 0),
      freeWaitMinutes: Number(s.freeWaitMinutes || 0),
      perMinWaitRate: Number(s.perMinWaitRate || 0),
      platformFee: Number(s.platformFee || 0),
      surgeMultiplier: Number(s.surgeMultiplier ?? 1),
    }));

    setSaving(true);
    try {
      const body = {
        vehicleTypeId: form.vehicleTypeId,
        zoneId: form.zoneId || null,
        status: form.status,
        slabs,
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

  const confirmDelete = async () => {
    const id = deleteTarget?.id;
    if (!id) {
      toast.error("Invalid pricing row");
      return;
    }
    setDeleting(true);
    try {
      await taxiAdminApi.deletePricing(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setDeleteTarget(null);
      toast.success("Pricing deleted");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "vehicle",
      header: "Vehicle Type",
      cell: (row) => (
        <span className="font-semibold">
          {row.vehicleType?.name ||
            vehicleTypes.find((v) => v.id === row.vehicleTypeId)?.name ||
            "—"}
        </span>
      ),
    },
    {
      key: "zone",
      header: "Zone",
      cell: (row) =>
        row.zone?.name || zones.find((z) => z.id === row.zoneId)?.name || "All zones",
    },
    {
      key: "slabs",
      header: "Distance slabs",
      cell: (row) => {
        const list = row.slabs?.length ? row.slabs : [];
        if (!list.length) return "—";
        return (
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-gray-900">{list.length} slab{list.length > 1 ? "s" : ""}</p>
            <p className="text-[11px] text-gray-500">
              {list.map(formatSlabRange).join(" · ")}
            </p>
          </div>
        );
      },
    },
    {
      key: "baseFare",
      header: "Base (1st)",
      cell: (row) => formatCurrency(row.slabs?.[0]?.baseFare ?? row.baseFare),
    },
    {
      key: "perKmRate",
      header: "₹/km (1st)",
      cell: (row) => formatCurrency(row.slabs?.[0]?.perKmRate ?? row.perKmRate),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.status === "active" ? "success" : "default"} label={row.status} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)} aria-label="Edit pricing">
            <Pencil size={14} />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteTarget(row)} aria-label="Delete pricing">
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const deleteLabel =
    deleteTarget?.vehicleType?.name ||
    vehicleTypes.find((v) => v.id === deleteTarget?.vehicleTypeId)?.name ||
    "this pricing rule";

  return (
    <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader
        title="Pricing / Fare Management"
        description="Set full rate cards per distance slab (e.g. 0–2 km, 2–5 km). The matching slab applies to the whole trip."
        actions={
          <Button type="button" onClick={openCreate} disabled={!vehicleTypes.length}>
            <Plus className="mr-2 h-4 w-4" /> Add Pricing
          </Button>
        }
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
            emptyState={{
              title: "No pricing rules",
              description: "Add pricing with distance slabs for each vehicle type.",
            }}
          />
        </div>
      </SectionCard>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit pricing" : "Create pricing"}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
            <p className="rounded-xl border border-orange-100 bg-orange-50/70 px-3 py-2 text-xs text-gray-700">
              Whole-trip slabs: a 4 km ride uses only the <strong>2–5 km</strong> slab rates for the
              entire trip (not progressive bands).
            </p>

            <FormField label="Vehicle Type" required>
              <select
                className={selectCls + " w-full"}
                value={form.vehicleTypeId}
                disabled={Boolean(editing)}
                onChange={(e) => setForm((f) => ({ ...f, vehicleTypeId: e.target.value }))}
              >
                <option value="">Select…</option>
                {vehicleTypes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
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
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Status">
              <select
                className={selectCls + " w-full"}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormField>

            <div className="flex items-center justify-between gap-2 pt-1">
              <h4 className="text-sm font-extrabold text-gray-900">Distance slabs</h4>
              <Button type="button" variant="outline" size="sm" onClick={addSlab}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add slab
              </Button>
            </div>

            <div className="space-y-3">
              {form.slabs.map((slab, index) => (
                <div
                  key={`slab-${index}`}
                  className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#FF6A00]">
                      Slab {index + 1} · {formatSlabRange(slab)}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateSlab(index)}
                        aria-label="Duplicate slab"
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlab(index)}
                        aria-label="Remove slab"
                        disabled={form.slabs.length <= 1}
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <FormRow>
                    <FormField label="From (km)">
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={slab.fromKm}
                        onChange={(e) => updateSlab(index, { fromKm: e.target.value })}
                      />
                    </FormField>
                    <FormField label="To (km) — blank = unlimited">
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={slab.toKm ?? ""}
                        placeholder="∞"
                        onChange={(e) => updateSlab(index, { toKm: e.target.value })}
                      />
                    </FormField>
                  </FormRow>
                  <FormRow>
                    <FormField label="Base Fare">
                      <Input
                        type="number"
                        value={slab.baseFare}
                        onChange={(e) => updateSlab(index, { baseFare: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Base Distance (km)">
                      <Input
                        type="number"
                        value={slab.baseDistanceKm}
                        onChange={(e) => updateSlab(index, { baseDistanceKm: e.target.value })}
                      />
                    </FormField>
                  </FormRow>
                  <FormRow>
                    <FormField label="Per Km">
                      <Input
                        type="number"
                        value={slab.perKmRate}
                        onChange={(e) => updateSlab(index, { perKmRate: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Per Min">
                      <Input
                        type="number"
                        value={slab.perMinRate}
                        onChange={(e) => updateSlab(index, { perMinRate: e.target.value })}
                      />
                    </FormField>
                  </FormRow>
                  <FormRow>
                    <FormField label="Free Wait (min)">
                      <Input
                        type="number"
                        value={slab.freeWaitMinutes}
                        onChange={(e) => updateSlab(index, { freeWaitMinutes: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Wait / Min">
                      <Input
                        type="number"
                        value={slab.perMinWaitRate}
                        onChange={(e) => updateSlab(index, { perMinWaitRate: e.target.value })}
                      />
                    </FormField>
                  </FormRow>
                  <FormRow>
                    <FormField label="Platform Fee">
                      <Input
                        type="number"
                        value={slab.platformFee}
                        onChange={(e) => updateSlab(index, { platformFee: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Surge Multiplier">
                      <Input
                        type="number"
                        step="0.1"
                        value={slab.surgeMultiplier}
                        onChange={(e) => updateSlab(index, { surgeMultiplier: e.target.value })}
                      />
                    </FormField>
                  </FormRow>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 pb-6">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete pricing?</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-3 text-sm text-gray-600">
            Remove fare matrix for <span className="font-semibold text-gray-900">{deleteLabel}</span>
            {deleteTarget?.zone?.name ? (
              <>
                {" "}
                in zone <span className="font-semibold text-gray-900">{deleteTarget.zone.name}</span>
              </>
            ) : (
              <> (all zones)</>
            )}
            ?
          </div>
          <div className="flex justify-end gap-2 px-6 pb-6">
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={deleting} onClick={confirmDelete}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pricing;
