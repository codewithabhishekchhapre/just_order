import React, { useMemo, useState } from "react";
import { Pencil, IndianRupee, Save } from "lucide-react";
import {
  PageHeader, SectionCard, StatCard, AdminTable, StatusBadge,
  FormLayout, FormSection, FormRow, FormField,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MOCK_VEHICLE_TYPES } from "../utils/mock/vehicleTypes";
import { formatCurrency } from "../utils/taxiTableHelpers";

const selectCls = "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

const Pricing = () => {
  const [fares, setFares] = useState(MOCK_VEHICLE_TYPES);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({
    nightSurchargePercent: 15,
    waitingChargePerMin: 2,
    cancellationFee: 30,
    freeWaitMinutes: 5,
    platformFee: 5,
  });

  const avgBase = useMemo(
    () => Math.round(fares.reduce((s, f) => s + f.baseFare, 0) / fares.length),
    [fares],
  );

  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...row });
  };

  const saveFare = () => {
    setFares((prev) => prev.map((f) => f.id === editing.id ? { ...f, ...form } : f));
    setEditing(null);
    toast.success(`${form.name} fare updated`);
  };

  const saveGlobal = () => {
    toast.success("Global fare settings saved");
  };

  const columns = [
    { key: "name", header: "Vehicle Type", cell: (row) => <span className="font-semibold">{row.name}</span> },
    { key: "baseFare", header: "Base Fare", cell: (row) => formatCurrency(row.baseFare) },
    { key: "perKmRate", header: "Per Km", cell: (row) => formatCurrency(row.perKmRate) },
    { key: "perMinRate", header: "Per Min", cell: (row) => formatCurrency(row.perMinRate) },
    { key: "minFare", header: "Minimum", cell: (row) => formatCurrency(row.minFare) },
    { key: "commissionPercent", header: "Commission", cell: (row) => `${row.commissionPercent}%` },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status === "active" ? "success" : "default"} label={row.status} /> },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (row) => <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil size={14} /></Button>,
    },
  ];

  return (
    <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader title="Pricing / Fare Management" description="Configure base fares, distance rates and platform commissions" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Vehicle Types" value={String(fares.length)} icon={<IndianRupee size={18} />} />
        <StatCard title="Avg Base Fare" value={formatCurrency(avgBase)} />
        <StatCard title="Night Surcharge" value={`${globalSettings.nightSurchargePercent}%`} />
        <StatCard title="Cancellation Fee" value={formatCurrency(globalSettings.cancellationFee)} />
      </div>

      <SectionCard title="Fare Matrix by Vehicle Type" flush>
        <div className="p-4">
          <AdminTable columns={columns} data={fares} getRowId={(r) => r.id} />
        </div>
      </SectionCard>

      <SectionCard title="Global Fare Rules">
        <FormLayout>
          <FormSection title="Charges & Fees">
            <FormRow>
              <FormField label="Night Surcharge (%)">
                <Input type="number" value={globalSettings.nightSurchargePercent} onChange={(e) => setGlobalSettings({ ...globalSettings, nightSurchargePercent: Number(e.target.value) })} />
              </FormField>
              <FormField label="Waiting Charge / Min">
                <Input type="number" value={globalSettings.waitingChargePerMin} onChange={(e) => setGlobalSettings({ ...globalSettings, waitingChargePerMin: Number(e.target.value) })} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Free Wait Minutes">
                <Input type="number" value={globalSettings.freeWaitMinutes} onChange={(e) => setGlobalSettings({ ...globalSettings, freeWaitMinutes: Number(e.target.value) })} />
              </FormField>
              <FormField label="Cancellation Fee">
                <Input type="number" value={globalSettings.cancellationFee} onChange={(e) => setGlobalSettings({ ...globalSettings, cancellationFee: Number(e.target.value) })} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Platform Fee">
                <Input type="number" value={globalSettings.platformFee} onChange={(e) => setGlobalSettings({ ...globalSettings, platformFee: Number(e.target.value) })} />
              </FormField>
            </FormRow>
          </FormSection>
        </FormLayout>
        <div className="mt-4 flex justify-end">
          <Button className="gap-2" onClick={saveGlobal}><Save size={16} /> Save Global Settings</Button>
        </div>
      </SectionCard>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="just-order-theme-scope sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Edit {editing?.name} Fare</DialogTitle></DialogHeader>
          {form && (
            <>
              <div className="px-6 py-4 space-y-3">
                <FormField label="Base Fare"><Input type="number" value={form.baseFare} onChange={(e) => setForm({ ...form, baseFare: Number(e.target.value) })} /></FormField>
                <FormField label="Per Km Rate"><Input type="number" value={form.perKmRate} onChange={(e) => setForm({ ...form, perKmRate: Number(e.target.value) })} /></FormField>
                <FormField label="Per Minute Rate"><Input type="number" value={form.perMinRate} onChange={(e) => setForm({ ...form, perMinRate: Number(e.target.value) })} /></FormField>
                <FormField label="Minimum Fare"><Input type="number" value={form.minFare} onChange={(e) => setForm({ ...form, minFare: Number(e.target.value) })} /></FormField>
                <FormField label="Commission %"><Input type="number" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: Number(e.target.value) })} /></FormField>
                <FormField label="Status">
                  <select className={selectCls + " w-full"} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </FormField>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50/50">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={saveFare}>Save Fare</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pricing;
