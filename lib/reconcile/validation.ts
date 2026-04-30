import { z } from "zod";

const moneyPattern = /^-?\d+(\.\d{1,2})?$/;

export const bankAccountSchema = z.object({
  name: z.string().trim().min(1, "Account name is required."),
  institutionName: z.string().trim().optional().transform((value) => value || undefined),
  accountMask: z.string().trim().optional().transform((value) => value || undefined),
  currency: z.string().trim().min(1, "Currency is required."),
  provider: z.string().trim().min(1).default("manual"),
  autoReconciliationEnabled: z.boolean().optional(),
  autoReconciliationMinConfidence: z.coerce.number().int().min(0).max(100).optional()
});

export const manualTransactionSchema = z.object({
  bookedAt: z.string().trim().min(1, "Transaction date is required."),
  valueDate: z.string().trim().optional().transform((value) => value || undefined),
  amount: z.string().trim().regex(moneyPattern, "Enter a valid signed amount."),
  currency: z.string().trim().min(1, "Currency is required."),
  description: z.string().trim().min(1, "Description is required."),
  counterparty: z.string().trim().optional().transform((value) => value || undefined),
  reference: z.string().trim().optional().transform((value) => value || undefined),
  externalTransactionId: z.string().trim().optional().transform((value) => value || undefined)
});

export const userAutoReconcileSchema = z.object({
  autoReconciliationEnabled: z.boolean(),
  autoReconciliationMinConfidence: z.coerce.number().int().min(0).max(100)
});

export const reconciliationRuleSchema = z.object({
  name: z.string().trim().min(1, "Rule name is required."),
  type: z.enum(["INCOME", "EXPENSE"]),
  normalizedDescription: z.string().trim().min(1, "Description pattern is required."),
  amount: z.string().trim().optional().transform((value) => value || undefined),
  counterparty: z.string().trim().optional().transform((value) => value || undefined),
  categoryId: z.string().trim().min(1, "Category is required."),
  tenancyAgreementId: z.string().trim().optional().transform((value) => value || undefined),
  organisationExpense: z.boolean().optional(),
  supplier: z.string().trim().optional().transform((value) => value || undefined),
  expenseDescription: z.string().trim().optional().transform((value) => value || undefined),
  incomeNotes: z.string().trim().optional().transform((value) => value || undefined),
  removeVat: z.boolean().optional(),
  paid: z.boolean().optional(),
  enabled: z.boolean().optional(),
  autoApply: z.boolean().optional()
});

export const reconcileIncomeSchema = z.object({
  categoryId: z.string().trim().min(1, "Category is required."),
  tenancyAgreementId: z.string().trim().optional().transform((value) => value || undefined),
  amount: z.string().trim().min(1, "Amount is required."),
  paymentDate: z.string().trim().min(1, "Payment date is required."),
  notes: z.string().trim().optional().transform((value) => value || undefined),
  saveRule: z.boolean().optional(),
  ruleAutoApply: z.boolean().optional()
});

export const reconcileExpenseSchema = z.object({
  categoryId: z.string().trim().min(1, "Category is required."),
  tenancyAgreementId: z.string().trim().optional().transform((value) => value || undefined),
  grossAmount: z.string().trim().min(1, "Amount is required."),
  removeVat: z.boolean().optional(),
  description: z.string().trim().min(1, "Description is required."),
  invoiceNumber: z.string().trim().optional().transform((value) => value || undefined),
  dueDate: z.string().trim().min(1, "Due date is required."),
  supplier: z.string().trim().min(1, "Supplier is required."),
  paid: z.boolean().optional(),
  organisationExpense: z.boolean().optional(),
  saveRule: z.boolean().optional(),
  ruleAutoApply: z.boolean().optional()
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;
export type ManualTransactionInput = z.infer<typeof manualTransactionSchema>;
export type UserAutoReconcileInput = z.infer<typeof userAutoReconcileSchema>;
export type ReconciliationRuleInput = z.infer<typeof reconciliationRuleSchema>;
export type ReconcileIncomeInput = z.infer<typeof reconcileIncomeSchema>;
export type ReconcileExpenseInput = z.infer<typeof reconcileExpenseSchema>;
