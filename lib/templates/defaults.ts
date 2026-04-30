import { TemplateKind } from "@prisma/client";

export const DEFAULT_TEMPLATES: Array<{
  defaultKey: string;
  kind: TemplateKind;
  name: string;
  content: string;
}> = [
  {
    defaultKey: "new-tenant-welcome",
    kind: TemplateKind.NEW_TENANT_WELCOME,
    name: "New Tenants Welcome Letter",
    content: `Dear {{tenant.fullName}},

Welcome to {{property.name}}.

We are pleased to confirm your tenancy begins on {{tenancy.startDate}}. Your rent payment day is the {{tenancy.paymentDay}} of each month and your current rent is {{tenancy.currentRent}}. Your recorded deposit is {{tenancy.depositAmount}}.

If you need anything before moving in, please contact {{organisation.contactName}} on {{organisation.contactNumber}} or email {{organisation.contactEmail}}.

We hope you settle in smoothly and enjoy your new home.

Kind regards,
{{organisation.name}}`
  },
  {
    defaultKey: "rent-increase",
    kind: TemplateKind.RENT_INCREASE,
    name: "Rent Increase Letter",
    content: `Dear {{tenant.fullName}},

We are writing regarding your tenancy at {{property.name}}.

Following our latest rent review, your rent will change to {{tenancy.currentRent}} from {{tenancy.rentReviewDate}}. Please ensure future payments continue to be made on day {{tenancy.paymentDay}} of each month.

If you have any questions about this change, please contact {{organisation.contactName}} on {{organisation.contactNumber}} or email {{organisation.contactEmail}}.

Yours sincerely,
{{organisation.name}}`
  }
];

export const TEMPLATE_MERGE_FIELDS = [
  { key: "organisation.name", label: "Organisation name" },
  { key: "organisation.contactName", label: "Organisation contact name" },
  { key: "organisation.contactNumber", label: "Organisation contact number" },
  { key: "organisation.contactEmail", label: "Organisation contact email" },
  { key: "organisation.bankName", label: "Organisation bank name" },
  { key: "organisation.bankSortCode", label: "Organisation bank sort code" },
  { key: "organisation.bankAccountNumber", label: "Organisation bank account number" },
  { key: "organisation.bankAccountName", label: "Organisation bank account name" },
  { key: "property.name", label: "Property name" },
  { key: "property.addressLine1", label: "Property address line 1" },
  { key: "property.addressLine2", label: "Property address line 2" },
  { key: "property.city", label: "Property city" },
  { key: "property.postcode", label: "Property postcode" },
  { key: "tenant.firstName", label: "Primary tenant first name" },
  { key: "tenant.surname", label: "Primary tenant surname" },
  { key: "tenant.fullName", label: "Primary tenant full name" },
  { key: "tenant.phoneNumber", label: "Primary tenant phone number" },
  { key: "tenant.email", label: "Primary tenant email" },
  { key: "tenants.fullNames", label: "All tenant full names" },
  { key: "tenancy.startDate", label: "Tenancy start date" },
  { key: "tenancy.endDate", label: "Tenancy end date" },
  { key: "tenancy.paymentDay", label: "Tenancy payment day" },
  { key: "tenancy.depositAmount", label: "Tenancy deposit amount" },
  { key: "tenancy.rentReviewDate", label: "Tenancy rent review date" },
  { key: "tenancy.currentRent", label: "Tenancy current rent" }
] as const;
