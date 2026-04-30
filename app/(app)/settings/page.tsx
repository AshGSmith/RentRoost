import Image from "next/image";

import { updateOrganisationAction, updatePreferencesAction } from "@/app/(app)/settings/settings-actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { getTenantContext, getTenantSettings } from "@/lib/auth/tenant";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const params = await searchParams;
  const { viewer } = await getTenantContext();
  const { settings, organisation } = await getTenantSettings();

  return (
    <div className="space-y-8">
      <PageHeader
        description="Manage user preferences and organisation data stored securely against your account."
        title="Settings"
      />

      {params.updated ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {params.updated === "preferences" ? "Preferences updated." : "Organisation details updated."}
        </p>
      ) : null}

      <Tabs
        defaultValue="preferences"
        tabs={[
          {
            value: "preferences",
            label: "Preferences",
            content: (
              <Card className="max-w-3xl">
                <form action={updatePreferencesAction} className="grid gap-5">
                  <FormField hint="Applied from the database on your next render." htmlFor="theme" label="Theme">
                    <Select defaultValue={settings?.theme ?? "LIGHT"} id="theme" name="theme">
                      <option value="LIGHT">Light</option>
                      <option value="DARK">Dark</option>
                    </Select>
                  </FormField>
                  <FormField htmlFor="currencyDesignator" label="Currency designator">
                    <Input
                      defaultValue={settings?.currencyDesignator ?? "£"}
                      id="currencyDesignator"
                      maxLength={8}
                      name="currencyDesignator"
                      required
                    />
                  </FormField>
                  <SubmitButton pendingLabel="Saving preferences...">Save preferences</SubmitButton>
                </form>
              </Card>
            )
          },
          {
            value: "organisation",
            label: "Organisation",
            content: (
              <Card className="max-w-4xl">
                <form action={updateOrganisationAction} className="grid gap-5" encType="multipart/form-data">
                  <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center">
                    {organisation?.logoData ? (
                      <Image
                        alt={organisation.organisationName}
                        className="h-20 w-20 rounded-2xl object-cover"
                        height={80}
                        src="/api/organisation-logo"
                        width={80}
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-200">
                        {viewer.firstName.charAt(0)}
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">Organisation logo</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Stored in PostgreSQL so it can be reused in reports and template outputs later.
                      </p>
                    </div>
                  </div>

                  <FormField htmlFor="logo" label="Upload logo">
                    <Input accept="image/*" id="logo" name="logo" type="file" />
                  </FormField>
                  <FormField htmlFor="organisationName" label="Organisation name">
                    <Input
                      defaultValue={organisation?.organisationName ?? ""}
                      id="organisationName"
                      name="organisationName"
                      required
                    />
                  </FormField>
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField htmlFor="contactName" label="Contact name">
                      <Input defaultValue={organisation?.contactName ?? ""} id="contactName" name="contactName" />
                    </FormField>
                    <FormField htmlFor="contactNumber" label="Contact number">
                      <Input defaultValue={organisation?.contactNumber ?? ""} id="contactNumber" name="contactNumber" />
                    </FormField>
                  </div>
                  <FormField htmlFor="contactEmail" label="Contact email">
                    <Input
                      defaultValue={organisation?.contactEmail ?? ""}
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                    />
                  </FormField>
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField htmlFor="bankName" label="Bank name">
                      <Input defaultValue={organisation?.bankName ?? ""} id="bankName" name="bankName" />
                    </FormField>
                    <FormField htmlFor="bankAccountName" label="Account name">
                      <Input
                        defaultValue={organisation?.bankAccountName ?? ""}
                        id="bankAccountName"
                        name="bankAccountName"
                      />
                    </FormField>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField htmlFor="bankSortCode" label="Sort code">
                      <Input defaultValue={organisation?.bankSortCode ?? ""} id="bankSortCode" name="bankSortCode" />
                    </FormField>
                    <FormField htmlFor="bankAccountNumber" label="Account number">
                      <Input
                        defaultValue={organisation?.bankAccountNumber ?? ""}
                        id="bankAccountNumber"
                        name="bankAccountNumber"
                      />
                    </FormField>
                  </div>
                  <SubmitButton pendingLabel="Saving organisation...">Save organisation</SubmitButton>
                </form>
              </Card>
            )
          }
        ]}
      />
    </div>
  );
}
