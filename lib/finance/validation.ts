import { z } from "zod";

const moneyPattern = /^\d+(\.\d{1,2})?$/;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required."),
  type: z.enum(["INCOME", "EXPENSE"])
});

export const incomeSchema = z.object({
  categoryId: z.string().trim().min(1, "Category is required."),
  tenancyAgreementId: z.string().trim().optional().transform((value) => value || undefined),
  amount: z.string().trim().regex(moneyPattern, "Enter a valid amount."),
  paymentDate: z.string().trim().min(1, "Payment date is required."),
  notes: z.string().trim().optional().transform((value) => value || undefined)
});

export const expenseSchema = z
  .object({
    categoryId: z.string().trim().min(1, "Category is required."),
    tenancyAgreementId: z.string().trim().optional().transform((value) => value || undefined),
    grossAmount: z.string().trim().regex(moneyPattern, "Enter a valid amount."),
    removeVat: z.boolean().default(false),
    description: z.string().trim().min(1, "Description is required."),
    invoiceNumber: z.string().trim().optional().transform((value) => value || undefined),
    dueDate: z.string().trim().min(1, "Due date is required."),
    supplier: z.string().trim().min(1, "Supplier is required."),
    paid: z.boolean().default(false),
    organisationExpense: z.boolean().default(false)
  })
  .superRefine((value, ctx) => {
    if (!value.organisationExpense && !value.tenancyAgreementId) {
      ctx.addIssue({
        code: "custom",
        message: "Link the expense to a tenancy or mark it as an organisation expense.",
        path: ["tenancyAgreementId"]
      });
    }
  });

export type CategoryInput = z.infer<typeof categorySchema>;
export type IncomeInput = z.infer<typeof incomeSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
