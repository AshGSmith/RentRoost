import { z } from "zod";

const moneyPattern = /^\d+(\.\d{1,2})?$/;

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)
  .refine((value) => !value || z.email().safeParse(value).success, "Enter a valid email address.");

export const landlordSchema = z.object({
  name: z.string().trim().min(1, "Landlord name is required."),
  email: optionalEmail,
  phoneNumber: z.string().trim().optional().transform((value) => value || undefined),
  notes: z.string().trim().optional().transform((value) => value || undefined)
});

export const propertySchema = z.object({
  landlordId: z.string().trim().optional().transform((value) => value || undefined),
  name: z.string().trim().min(1, "Property name is required."),
  addressLine1: z.string().trim().min(1, "Address line 1 is required."),
  addressLine2: z.string().trim().optional().transform((value) => value || undefined),
  city: z.string().trim().min(1, "Town or city is required."),
  postcode: z.string().trim().min(1, "Postcode is required."),
  notes: z.string().trim().optional().transform((value) => value || undefined)
});

export const tenantSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  surname: z.string().trim().min(1, "Surname is required."),
  phoneNumber: z.string().trim().min(1, "Phone number is required."),
  email: optionalEmail
});

const inlineTenantSchema = z
  .object({
    firstName: z.string().trim().optional().transform((value) => value || ""),
    surname: z.string().trim().optional().transform((value) => value || ""),
    phoneNumber: z.string().trim().optional().transform((value) => value || ""),
    email: z.string().trim().optional().transform((value) => value || "")
  })
  .superRefine((value, ctx) => {
    const hasAnyValue = Boolean(value.firstName || value.surname || value.phoneNumber || value.email);

    if (!hasAnyValue) {
      return;
    }

    if (!value.firstName) {
      ctx.addIssue({ code: "custom", message: "Inline tenant first name is required.", path: ["firstName"] });
    }
    if (!value.surname) {
      ctx.addIssue({ code: "custom", message: "Inline tenant surname is required.", path: ["surname"] });
    }
    if (!value.phoneNumber) {
      ctx.addIssue({ code: "custom", message: "Inline tenant phone number is required.", path: ["phoneNumber"] });
    }
    if (value.email && !z.email().safeParse(value.email).success) {
      ctx.addIssue({ code: "custom", message: "Inline tenant email must be valid.", path: ["email"] });
    }
  });

export const tenancySchema = z
  .object({
    propertyId: z.string().trim().min(1, "Property is required."),
    landlordId: z.string().trim().optional().transform((value) => value || undefined),
    startDate: z.string().trim().min(1, "Start date is required."),
    endDate: z.string().trim().optional().transform((value) => value || undefined),
    paymentDay: z.coerce.number().int().min(1, "Payment day must be between 1 and 31.").max(31, "Payment day must be between 1 and 31."),
    depositAmount: z.string().trim().regex(moneyPattern, "Enter a valid deposit amount."),
    rentReviewDate: z.string().trim().optional().transform((value) => value || undefined),
    selectedTenantIds: z.array(z.string().trim()).default([]),
    inlineTenant: inlineTenantSchema,
    initialRentAmount: z.string().trim().regex(moneyPattern, "Enter a valid rent amount."),
    initialRentEffectiveDate: z.string().trim().optional().transform((value) => value || undefined)
  })
  .superRefine((value, ctx) => {
    const startDate = new Date(value.startDate);

    if (Number.isNaN(startDate.valueOf())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid start date.", path: ["startDate"] });
    }

    if (value.endDate) {
      const endDate = new Date(value.endDate);

      if (Number.isNaN(endDate.valueOf())) {
        ctx.addIssue({ code: "custom", message: "Enter a valid end date.", path: ["endDate"] });
      } else if (!Number.isNaN(startDate.valueOf()) && endDate < startDate) {
        ctx.addIssue({ code: "custom", message: "End date cannot be before the start date.", path: ["endDate"] });
      }
    }

    if (value.rentReviewDate) {
      const rentReviewDate = new Date(value.rentReviewDate);
      if (Number.isNaN(rentReviewDate.valueOf())) {
        ctx.addIssue({ code: "custom", message: "Enter a valid rent review date.", path: ["rentReviewDate"] });
      }
    }

    if (value.initialRentEffectiveDate) {
      const effectiveDate = new Date(value.initialRentEffectiveDate);
      if (Number.isNaN(effectiveDate.valueOf())) {
        ctx.addIssue({ code: "custom", message: "Enter a valid effective date.", path: ["initialRentEffectiveDate"] });
      }
    }

    const hasInlineTenant =
      Boolean(value.inlineTenant.firstName) ||
      Boolean(value.inlineTenant.surname) ||
      Boolean(value.inlineTenant.phoneNumber) ||
      Boolean(value.inlineTenant.email);

    if (value.selectedTenantIds.length === 0 && !hasInlineTenant) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one tenant or create one inline.",
        path: ["selectedTenantIds"]
      });
    }
  });

export const rentChangeSchema = z.object({
  tenancyAgreementId: z.string().trim().min(1, "Tenancy is required."),
  amount: z.string().trim().regex(moneyPattern, "Enter a valid rent amount."),
  effectiveDate: z.string().trim().min(1, "Effective date is required.")
});

export const reminderSchema = z
  .object({
    description: z.string().trim().min(1, "Description is required."),
    propertyId: z.string().trim().optional().transform((value) => value || undefined),
    tenancyAgreementId: z.string().trim().optional().transform((value) => value || undefined),
    dueDate: z.string().trim().min(1, "Due date is required."),
    reminderAt: z.string().trim().min(1, "Reminder date and time is required."),
    critical: z.boolean().default(false),
    recurring: z.boolean().default(false),
    recurringFrequency: z.enum(["WEEKLY", "MONTHLY", "ANNUAL"]).optional()
  })
  .superRefine((value, ctx) => {
    if (value.propertyId && value.tenancyAgreementId) {
      ctx.addIssue({
        code: "custom",
        message: "Link the reminder to either a property or a tenancy, not both.",
        path: ["propertyId"]
      });
    }

    if (value.recurring && !value.recurringFrequency) {
      ctx.addIssue({
        code: "custom",
        message: "Choose a recurring frequency.",
        path: ["recurringFrequency"]
      });
    }
  });

export type LandlordInput = z.infer<typeof landlordSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type TenantInput = z.infer<typeof tenantSchema>;
export type TenancyInput = z.infer<typeof tenancySchema>;
export type RentChangeInput = z.infer<typeof rentChangeSchema>;
export type ReminderInput = z.infer<typeof reminderSchema>;
