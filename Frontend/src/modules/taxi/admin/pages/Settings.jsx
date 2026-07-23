import React from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { PageHeader, SectionCard } from "@/shared/components/admin";

const Settings = () => (
  <div className="just-order-theme-scope space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
    <PageHeader
      title="Taxi Settings"
      description="Operational defaults for the taxi module"
    />
    <SectionCard>
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 mb-4">
          <SettingsIcon size={22} />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Module settings API not available</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Taxi-specific settings (search radius, accept timeout, payment toggles) are not exposed
          by a dedicated backend endpoint yet. Fake “save” settings have been removed.
          Use platform Module Settings / kill switch for enabling or disabling Taxi.
        </p>
      </div>
    </SectionCard>
  </div>
);

export default Settings;
