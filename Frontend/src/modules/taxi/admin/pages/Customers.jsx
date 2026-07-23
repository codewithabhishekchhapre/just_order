import React, { useMemo, useState } from "react";
import { Search, Eye, Users, Ban, CheckCircle2, IndianRupee } from "lucide-react";
import {
  PageHeader, SectionCard, StatCard, AdminTable, FilterBar, StatusBadge,
  FormLayout, FormSection, FormRow, FormField,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MOCK_TAXI_CUSTOMERS } from "../utils/mock/customers";
import { filterBySearch, sortItems, paginateItems, formatCurrency, formatDateTime } from "../utils/taxiTableHelpers";

const selectCls = "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

const Customers = () => {
  const [customers, setCustomers] = useState(MOCK_TAXI_CUSTOMERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    let rows = filterBySearch(customers, search, ["id", "name", "phone", "email", "zone"]);
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    return sortItems(rows, "totalRides", "desc");
  }, [customers, search, statusFilter]);

  const { items: pageItems, total, totalPages } = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter((c) => c.status === "active").length,
    blocked: customers.filter((c) => c.status === "blocked").length,
    spend: customers.reduce((s, c) => s + c.totalSpend, 0),
  }), [customers]);

  const toggleBlock = (id) => {
    setCustomers((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const next = c.status === "active" ? "blocked" : "active";
      toast.success(`${c.name} ${next === "blocked" ? "blocked" : "unblocked"}`);
      return { ...c, status: next };
    }));
    setDetailOpen(false);
  };

  const columns = [
    {
      key: "name", header: "Customer",
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
    { key: "zone", header: "Zone" },
    { key: "totalRides", header: "Rides" },
    { key: "totalSpend", header: "Spend", cell: (row) => formatCurrency(row.totalSpend) },
    { key: "avgRating", header: "Rating", cell: (row) => <span className="text-yellow-600 font-medium">★ {row.avgRating}</span> },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status === "active" ? "success" : "danger"} label={row.status} /> },
    {
      key: "actions", header: "Actions", align: "right",
      cell: (row) => <Button variant="ghost" size="sm" onClick={() => { setSelected(row); setDetailOpen(true); }}><Eye size={14} /></Button>,
    },
  ];

  return (
    <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader title="Customers" description="Taxi riders and their trip history overview" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Customers" value={String(stats.total)} icon={<Users size={18} />} />
        <StatCard title="Active" value={String(stats.active)} icon={<CheckCircle2 size={18} />} />
        <StatCard title="Blocked" value={String(stats.blocked)} icon={<Ban size={18} />} />
        <StatCard title="Lifetime Spend" value={formatCurrency(stats.spend)} icon={<IndianRupee size={18} />} />
      </div>

      <SectionCard flush>
        <div className="p-4 space-y-4">
          <FilterBar
            start={
              <div className="flex flex-wrap gap-2 w-full">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search customers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className={selectCls} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
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
          <DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
          {selected && (
            <>
              <div className="px-6 py-4">
                <div className="flex items-center gap-4 mb-5">
                  <img src={selected.photo} alt={selected.name} className="w-14 h-14 rounded-2xl bg-gray-100" />
                  <div>
                    <h3 className="text-lg font-bold">{selected.name}</h3>
                    <p className="text-sm text-gray-500">{selected.id}</p>
                    <StatusBadge status={selected.status === "active" ? "success" : "danger"} label={selected.status} />
                  </div>
                </div>
                <FormLayout>
                  <FormSection title="Profile">
                    <FormRow>
                      <FormField label="Phone"><div className="text-sm font-medium">{selected.phone}</div></FormField>
                      <FormField label="Email"><div className="text-sm font-medium">{selected.email}</div></FormField>
                    </FormRow>
                    <FormRow>
                      <FormField label="Zone"><div className="text-sm font-medium">{selected.zone}</div></FormField>
                      <FormField label="Joined"><div className="text-sm font-medium">{formatDateTime(selected.joinedAt)}</div></FormField>
                    </FormRow>
                  </FormSection>
                  <FormSection title="Usage">
                    <FormRow>
                      <FormField label="Total Rides"><div className="text-sm font-medium">{selected.totalRides}</div></FormField>
                      <FormField label="Total Spend"><div className="text-sm font-medium">{formatCurrency(selected.totalSpend)}</div></FormField>
                    </FormRow>
                    <FormRow>
                      <FormField label="Avg Rating"><div className="text-sm font-medium text-yellow-600">★ {selected.avgRating}</div></FormField>
                      <FormField label="Wallet"><div className="text-sm font-medium">{formatCurrency(selected.walletBalance)}</div></FormField>
                    </FormRow>
                  </FormSection>
                </FormLayout>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50/50">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                <Button
                  variant={selected.status === "active" ? "outline" : "default"}
                  className={selected.status === "active" ? "text-red-600" : ""}
                  onClick={() => toggleBlock(selected.id)}
                >
                  {selected.status === "active" ? "Block Customer" : "Unblock Customer"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
