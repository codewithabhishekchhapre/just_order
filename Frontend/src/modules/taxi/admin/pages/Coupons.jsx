import React from "react";
import { Gift } from "lucide-react";
import { PageHeader, SectionCard } from "@/shared/components/admin";

const Coupons = () => (
  <div className="just-order-theme-scope space-y-6 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
    <PageHeader
      title="Coupons"
      description="Taxi promo codes and fare discounts"
    />
    <SectionCard>
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
          <Gift size={22} />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Coupons not configured yet</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          There is no taxi coupon API in the backend yet. Dummy coupons have been removed —
          this screen will light up when promo APIs are added.
        </p>
      </div>
    </SectionCard>
  </div>
);

export default Coupons;
