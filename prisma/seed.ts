import { PrismaClient, Role, TemplateKind, ThemePreference } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_INCOME_CATEGORIES = ["Rent", "Tax Rebate", "Deposit", "Damage"] as const;
const DEFAULT_EXPENSE_CATEGORIES = [
  "Accountancy",
  "Certifications",
  "Insurance",
  "Other Allowable Expense",
  "Personal Withdrawal",
  "Repairs/Maintenance",
  "Tax"
] as const;

const DEFAULT_TEMPLATES = [
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
] as const;

async function ensureDefaultCashflowCategories(userId: string) {
  await Promise.all(
    DEFAULT_INCOME_CATEGORIES.map((name) =>
      prisma.cashflowCategory.upsert({
        where: {
          userId_type_name: {
            userId,
            type: "INCOME",
            name
          }
        },
        update: {
          isDefault: true
        },
        create: {
          userId,
          type: "INCOME",
          name,
          isDefault: true
        }
      })
    )
  );

  await Promise.all(
    DEFAULT_EXPENSE_CATEGORIES.map((name) =>
      prisma.cashflowCategory.upsert({
        where: {
          userId_type_name: {
            userId,
            type: "EXPENSE",
            name
          }
        },
        update: {
          isDefault: true
        },
        create: {
          userId,
          type: "EXPENSE",
          name,
          isDefault: true
        }
      })
    )
  );
}

async function ensureDefaultTemplates(userId: string) {
  await Promise.all(
    DEFAULT_TEMPLATES.map((template) =>
      prisma.documentTemplate.upsert({
        where: {
          userId_defaultKey: {
            userId,
            defaultKey: template.defaultKey
          }
        },
        update: {
          name: template.name,
          content: template.content,
          isDefault: true
        },
        create: {
          userId,
          defaultKey: template.defaultKey,
          kind: template.kind,
          name: template.name,
          content: template.content,
          isDefault: true
        }
      })
    )
  );
}

async function upsertUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  password: string;
  organisationName: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.user.upsert({
    where: { email: input.email.toLowerCase() },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      isActive: true,
      passwordHash
    },
    create: {
      email: input.email.toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      passwordHash,
      settings: {
        create: {
          theme: ThemePreference.LIGHT,
          currencyDesignator: "£"
        }
      },
      organisation: {
        create: {
          organisationName: input.organisationName,
          contactName: `${input.firstName} ${input.lastName}`,
          contactEmail: input.email.toLowerCase()
        }
      }
    }
  });
}

async function ensureDemoPortfolio(userId: string) {
  const existingProperty = await prisma.property.findFirst({
    where: { userId }
  });

  if (existingProperty) {
    return;
  }

  const landlord = await prisma.landlord.create({
    data: {
      userId,
      name: "Bluebird Property Holdings",
      email: "hello@bluebird.test",
      phoneNumber: "02070001111"
    }
  });

  const property = await prisma.property.create({
    data: {
      userId,
      landlordId: landlord.id,
      name: "24 Harbour View",
      addressLine1: "24 Harbour View",
      city: "Brighton",
      postcode: "BN1 4AA"
    }
  });

  const tenant = await prisma.tenant.create({
    data: {
      userId,
      firstName: "Ava",
      surname: "Collins",
      phoneNumber: "07123456789",
      email: "ava.collins@example.com"
    }
  });

  const tenancy = await prisma.tenancyAgreement.create({
    data: {
      userId,
      propertyId: property.id,
      landlordId: landlord.id,
      startDate: new Date("2025-05-01"),
      paymentDay: 1,
      depositAmount: "1500.00",
      rentReviewDate: new Date("2026-05-01")
    }
  });

  await prisma.tenancyParticipant.create({
    data: {
      userId,
      tenancyAgreementId: tenancy.id,
      tenantId: tenant.id
    }
  });

  await prisma.rentChange.create({
    data: {
      userId,
      tenancyAgreementId: tenancy.id,
      amount: "1250.00",
      effectiveDate: new Date("2025-05-01")
    }
  });

  const rentCategory = await prisma.cashflowCategory.findFirst({
    where: { userId, type: "INCOME", name: "Rent" }
  });
  const repairsCategory = await prisma.cashflowCategory.findFirst({
    where: { userId, type: "EXPENSE", name: "Repairs/Maintenance" }
  });

  if (rentCategory) {
    await prisma.incomeEntry.create({
      data: {
        userId,
        categoryId: rentCategory.id,
        tenancyAgreementId: tenancy.id,
        amount: "1250.00",
        paymentDate: new Date("2026-04-01"),
        notes: "April rent received"
      }
    });
  }

  if (repairsCategory) {
    await prisma.expenseEntry.create({
      data: {
        userId,
        categoryId: repairsCategory.id,
        tenancyAgreementId: tenancy.id,
        grossAmount: "185.00",
        netAmount: "154.17",
        vatAmount: "30.83",
        removeVat: true,
        description: "Boiler service",
        dueDate: new Date("2026-04-12"),
        supplier: "Harbour Heating Ltd",
        paid: true,
        organisationExpense: false
      }
    });
  }

  await prisma.reminder.create({
    data: {
      userId,
      tenancyAgreementId: tenancy.id,
      propertyId: property.id,
      description: "Gas safety renewal due",
      dueDate: new Date("2026-05-10"),
      reminderAt: new Date("2026-04-25T12:00:00Z"),
      critical: true,
      recurring: true,
      recurringFrequency: "ANNUAL"
    }
  });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@rentroost.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const userEmail = process.env.SEED_USER_EMAIL ?? "user@rentroost.local";
  const userPassword = process.env.SEED_USER_PASSWORD ?? "ChangeMe123!";

  const admin = await upsertUser({
    email: adminEmail,
    firstName: "RentRoost",
    lastName: "Admin",
    role: Role.ADMIN,
    password: adminPassword,
    organisationName: "RentRoost HQ"
  });

  const user = await upsertUser({
    email: userEmail,
    firstName: "Demo",
    lastName: "User",
    role: Role.USER,
    password: userPassword,
    organisationName: "Demo Lets Ltd"
  });

  await ensureDefaultCashflowCategories(admin.id);
  await ensureDefaultCashflowCategories(user.id);
  await ensureDefaultTemplates(admin.id);
  await ensureDefaultTemplates(user.id);
  await ensureDemoPortfolio(user.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
