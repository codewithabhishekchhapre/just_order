import React, { useMemo, useState } from "react";
import { Plus, Search, Pencil, Gift, ToggleLeft } from "lucide-react";
import {
  PageHeader, SectionCard, StatCard, AdminTable, FilterBar, StatusBadge,
  FormLayout, FormSection, FormRow, FormField,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MOCK_TAXI_COUPONS } from "../utils/mock/coupons";
import { filterBySearch, paginateItems, formatCurrency, formatDateTime } from "../utils/taxiTableHelpers";

const selectCls = "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

const EMPTY_FORM = {
  code: "",
  title: "",
  type: "percent",
  value: 10,
  maxDiscount: 50,
  minFare: 100,
  usageLimit: 1,
  usedCount: 0,
  validFrom: "",
  validTill: "",
  status: "active",
};

const Coupons = () => {
  const [coupons, setCoupons] = useState(MOCK_TAXI_COUPONS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const filtered = useMemo(() => {
    let rows = filterBySearch(coupons, search, ["code", "title"]);
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    return rows;
  }, [coupons, search, statusFilter]);

  const { items: pageItems, total, totalPages } = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  const openModal = (row = null) => {
    setEditing(row);
    setForm(row ? { ...row } : EMPTY_FORM);
    setModalOpen(true);
  };

  const saveCoupon = () => {
    if (!form.code.trim() || !form.title.trim()) {
      toast.error("Code and title are required");
      return;
    }
    if (editing) {
      setCoupons((prev) => prev.map((c) => c.id === editing.id ? { ...editing, ...form, code: form.code.toUpperCase() } : c));
      toast.success("Coupon updated");
    } else {
      const id = `TXP-${String(coupons.length + 1).padStart(3, "0")}`;
      setCoupons((prev) => [...prev, { ...form, id, code: form.code.toUpperCase(), usedCount: 0 }]);
      toast.success("Coupon created");
    }
    setModalOpen(false);
  };

  const toggleStatus = (id) => {
    setCoupons((prev) => prev.map((c) => {
      if (c.id !== id || c.status === "expired") return c;
      const next = c.status === "active" ? "inactive" : "active";
      toast.success(`${c.code} marked ${next}`);
      return { ...c, status: next };
    }));
  };

  const columns = [
    { key: "code", header: "Code", cell: (row) => <span className="font-mono font-semibold text-amber-700">{row.code}</span> },
    { key: "title", header: "Title" },
    { key: "type", header: "Discount", cell: (row) => row.type === "percent" ? `${row.value}% (max ${formatCurrency(row.maxDiscount)})` : formatCurrency(row.value) },
    { key: "minFare", header: "Min Fare", cell: (row) => formatCurrency(row.minFare) },
    { key: "usedCount", header: "Usage", cell: (row) => `${row.usedCount} / ${row.usageLimit === 0 ? "∞" : row.usageLimit}` },
    { key: "validTill", header: "Valid Till", cell: (row) => formatDateTime(row.validTill) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status === "active" ? "success" : row.status === "expired" ? "danger" : "default"} label={row.status} /> },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openModal(row)}><Pencil size={14} /></Button>
          {row.status !== "expired" && (
            <Button variant="ghost" size="sm" onClick={() => toggleStatus(row.id)}><ToggleLeft size={14} /></Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader
        title="Promo / Coupons"
        description="Create and manage ride discount codes"
        actions={<Button className="gap-2" onClick={() => openModal()}><Plus size={16} /> Add Coupon</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard title="Total Coupons" value={String(coupons.length)} icon={<Gift size={18} />} />
        <StatCard title="Active" value={String(coupons.filter((c) => c.status === "active").length)} />
        <StatCard title="Total Redemptions" value={String(coupons.reduce((s, c) => s + c.usedCount, 0))} />
      </div>

      <SectionCard flush>
        <div className="p-4 space-y-4">
          <FilterBar
            start={
              <div className="flex flex-wrap gap-2 w-full">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search coupons..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className={selectCls} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Coupon" : "Create Coupon"}</DialogTitle></DialogHeader>
          <div className="px-6 py-4">
            <FormLayout>
              <FormSection title="Coupon Details">
                <FormRow>
                  <FormField label="Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></FormField>
                  <FormField label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField>
                </FormRow>
                <FormRow>
                  <FormField label="Type">
                    <select className={selectCls + " w-full"} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="percent">Percentage</option>
                      <option value="flat">Flat Amount</option>
                    </select>
                  </FormField>
                  <FormField label="Value"><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></FormField>
                </FormRow>
                <FormRow>
                  <FormField label="Max Discount"><Input type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })} /></FormField>
                  <FormField label="Min Fare"><Input type="number" value={form.minFare} onChange={(e) => setForm({ ...form, minFare: Number(e.target.value) })} /></FormField>
                </FormRow>
                <FormRow>
                  <FormField label="Usage Limit / User"><Input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: Number(e.target.value) })} /></FormField>
                  <FormField label="Status">
                    <select className={selectCls + " w-full"} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </FormField>
                </FormRow>
                <FormRow>
                  <FormField label="Valid From"><Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></FormField>
                  <FormField label="Valid Till"><Input type="date" value={form.validTill} onChange={(e) => setForm({ ...form, validTill: e.target.value })} /></FormField>
                </FormRow>
              </FormSection>
            </FormLayout>
          </div>
          <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50/50">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={saveCoupon}>{editing ? "Save Changes" : "Create Coupon"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Coupons;
