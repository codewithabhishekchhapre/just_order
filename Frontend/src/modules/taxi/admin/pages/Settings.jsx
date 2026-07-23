import React, { useState } from "react";
import { Save, Settings as SettingsIcon } from "lucide-react";
import {
  PageHeader, SectionCard, FormLayout, FormSection, FormRow, FormField,
} from "@/shared/components/admin";
import Button from "@/shared/components/ui/Button";
import Input from "@/shared/components/ui/Input";
import { toast } from "sonner";

const selectCls = "h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10";

const Settings = () => {
  const [settings, setSettings] = useState({
    moduleName: "Taxi",
    supportPhone: "+91 98765 43210",
    supportEmail: "taxi-support@appzeto.com",
    maxSearchRadiusKm: 8,
    driverAcceptTimeoutSec: 30,
    customerCancelGraceMin: 3,
    allowScheduledRides: true,
    allowCashPayments: true,
    allowWalletPayments: true,
    requireOtpOnStart: true,
    nightStart: "22:00",
    nightEnd: "06:00",
    termsUrl: "/profile/terms",
    privacyUrl: "/profile/privacy",
  });

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    toast.success("Taxi settings saved");
  };

  return (
    <div className="just-order-theme-scope space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <PageHeader
        title="Taxi Settings"
        description="Operational defaults for the taxi module"
        actions={
          <Button className="gap-2" onClick={handleSave}>
            <Save size={16} /> Save Settings
          </Button>
        }
      />

      <SectionCard title="General" action={<SettingsIcon size={16} className="text-muted-foreground" />}>
        <FormLayout>
          <FormSection title="Branding & Support">
            <FormRow>
              <FormField label="Module Display Name">
                <Input value={settings.moduleName} onChange={(e) => update("moduleName", e.target.value)} />
              </FormField>
              <FormField label="Support Phone">
                <Input value={settings.supportPhone} onChange={(e) => update("supportPhone", e.target.value)} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Support Email">
                <Input value={settings.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} />
              </FormField>
            </FormRow>
          </FormSection>
        </FormLayout>
      </SectionCard>

      <SectionCard title="Ride Operations">
        <FormLayout>
          <FormSection title="Matching & Timing">
            <FormRow>
              <FormField label="Max Driver Search Radius (km)">
                <Input type="number" value={settings.maxSearchRadiusKm} onChange={(e) => update("maxSearchRadiusKm", Number(e.target.value))} />
              </FormField>
              <FormField label="Driver Accept Timeout (sec)">
                <Input type="number" value={settings.driverAcceptTimeoutSec} onChange={(e) => update("driverAcceptTimeoutSec", Number(e.target.value))} />
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Customer Cancel Grace (min)">
                <Input type="number" value={settings.customerCancelGraceMin} onChange={(e) => update("customerCancelGraceMin", Number(e.target.value))} />
              </FormField>
              <FormField label="Require OTP to Start Trip">
                <select className={selectCls + " w-full"} value={settings.requireOtpOnStart ? "yes" : "no"} onChange={(e) => update("requireOtpOnStart", e.target.value === "yes")}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Allow Scheduled Rides">
                <select className={selectCls + " w-full"} value={settings.allowScheduledRides ? "yes" : "no"} onChange={(e) => update("allowScheduledRides", e.target.value === "yes")}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </FormField>
            </FormRow>
          </FormSection>
        </FormLayout>
      </SectionCard>

      <SectionCard title="Payments & Night Hours">
        <FormLayout>
          <FormSection title="Accepted Payments">
            <FormRow>
              <FormField label="Cash">
                <select className={selectCls + " w-full"} value={settings.allowCashPayments ? "yes" : "no"} onChange={(e) => update("allowCashPayments", e.target.value === "yes")}>
                  <option value="yes">Enabled</option>
                  <option value="no">Disabled</option>
                </select>
              </FormField>
              <FormField label="Wallet">
                <select className={selectCls + " w-full"} value={settings.allowWalletPayments ? "yes" : "no"} onChange={(e) => update("allowWalletPayments", e.target.value === "yes")}>
                  <option value="yes">Enabled</option>
                  <option value="no">Disabled</option>
                </select>
              </FormField>
            </FormRow>
            <FormRow>
              <FormField label="Night Hours Start">
                <Input type="time" value={settings.nightStart} onChange={(e) => update("nightStart", e.target.value)} />
              </FormField>
              <FormField label="Night Hours End">
                <Input type="time" value={settings.nightEnd} onChange={(e) => update("nightEnd", e.target.value)} />
              </FormField>
            </FormRow>
          </FormSection>
        </FormLayout>
      </SectionCard>

      <SectionCard title="Legal Links">
        <FormLayout>
          <FormSection title="Policies">
            <FormRow>
              <FormField label="Terms URL">
                <Input value={settings.termsUrl} onChange={(e) => update("termsUrl", e.target.value)} />
              </FormField>
              <FormField label="Privacy URL">
                <Input value={settings.privacyUrl} onChange={(e) => update("privacyUrl", e.target.value)} />
              </FormField>
            </FormRow>
          </FormSection>
        </FormLayout>
      </SectionCard>

      <div className="flex justify-end">
        <Button className="gap-2" onClick={handleSave}>
          <Save size={16} /> Save Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
