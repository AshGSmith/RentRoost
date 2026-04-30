import { DocumentCategory, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { addYears, computeNextPaymentDate } from "@/lib/domain/utils";

const tenancyInclude = {
  property: {
    include: {
      landlord: true
    }
  },
  landlord: true,
  tenancyParticipants: {
    include: {
      tenant: true
    },
    orderBy: {
      createdAt: "asc" as const
    }
  },
  rentChanges: {
    orderBy: [{ effectiveDate: "desc" as const }, { createdAt: "desc" as const }]
  },
  documents: {
    where: {
      category: DocumentCategory.TENANCY_AGREEMENT
    },
    orderBy: {
      createdAt: "desc" as const
    }
  }
} satisfies Prisma.TenancyAgreementInclude;

export async function getLandlordForUser(userId: string, id: string) {
  return prisma.landlord.findFirst({
    where: {
      id,
      userId
    },
    include: {
      properties: {
        orderBy: {
          name: "asc"
        }
      },
      tenancyAgreements: {
        include: {
          property: true
        },
        orderBy: {
          startDate: "desc"
        }
      }
    }
  });
}

export async function listLandlordsForUser(userId: string) {
  return prisma.landlord.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          properties: true,
          tenancyAgreements: true
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });
}

export async function getPropertyForUser(userId: string, id: string) {
  return prisma.property.findFirst({
    where: {
      id,
      userId
    },
    include: {
      landlord: true,
      tenancyAgreements: {
        include: {
          tenancyParticipants: {
            include: {
              tenant: true
            }
          },
          rentChanges: {
            orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }]
          }
        },
        orderBy: {
          startDate: "desc"
        }
      }
    }
  });
}

export async function listPropertiesForUser(userId: string) {
  return prisma.property.findMany({
    where: { userId },
    include: {
      landlord: true,
      _count: {
        select: {
          tenancyAgreements: true
        }
      }
    },
    orderBy: {
      name: "asc"
    }
  });
}

export async function getTenantForUser(userId: string, id: string) {
  return prisma.tenant.findFirst({
    where: {
      id,
      userId
    },
    include: {
      tenancyParticipants: {
        include: {
          tenancyAgreement: {
            include: {
              property: true,
              rentChanges: {
                orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }]
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });
}

export async function listTenantsForUser(userId: string) {
  return prisma.tenant.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          tenancyParticipants: true
        }
      }
    },
    orderBy: [{ surname: "asc" }, { firstName: "asc" }]
  });
}

export async function getTenancyForUser(userId: string, id: string) {
  return prisma.tenancyAgreement.findFirst({
    where: {
      id,
      userId
    },
    include: tenancyInclude
  });
}

export async function listTenanciesForUser(userId: string) {
  return prisma.tenancyAgreement.findMany({
    where: { userId },
    include: tenancyInclude,
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }]
  });
}

export async function getTenancyReferenceData(userId: string) {
  const [landlords, properties, tenants] = await Promise.all([
    prisma.landlord.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    }),
    prisma.property.findMany({
      where: { userId },
      include: { landlord: true },
      orderBy: { name: "asc" }
    }),
    prisma.tenant.findMany({
      where: { userId },
      orderBy: [{ surname: "asc" }, { firstName: "asc" }]
    })
  ]);

  return { landlords, properties, tenants };
}

export async function listReminderReferences(userId: string) {
  const [properties, tenancies] = await Promise.all([
    prisma.property.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    }),
    prisma.tenancyAgreement.findMany({
      where: { userId },
      include: {
        property: true
      },
      orderBy: [{ startDate: "desc" }]
    })
  ]);

  return { properties, tenancies };
}

export async function listRemindersForUser(
  userId: string,
  filter: "incomplete" | "complete" | "critical" | "overdue" = "incomplete"
) {
  const now = new Date();

  return prisma.reminder.findMany({
    where: {
      userId,
      ...(filter === "incomplete" ? { isComplete: false } : {}),
      ...(filter === "complete" ? { isComplete: true } : {}),
      ...(filter === "critical" ? { critical: true, isComplete: false } : {}),
      ...(filter === "overdue" ? { isComplete: false, dueDate: { lt: now } } : {})
    },
    include: {
      property: true,
      tenancyAgreement: {
        include: {
          property: true
        }
      }
    },
    orderBy: [{ isComplete: "asc" }, { dueDate: "asc" }, { reminderAt: "asc" }]
  });
}

export async function getReminderForUser(userId: string, id: string) {
  return prisma.reminder.findFirst({
    where: {
      id,
      userId
    },
    include: {
      property: true,
      tenancyAgreement: {
        include: {
          property: true
        }
      }
    }
  });
}

export async function listDashboardReminders(userId: string, limit = 5) {
  return prisma.reminder.findMany({
    where: {
      userId,
      isComplete: false
    },
    include: {
      property: true,
      tenancyAgreement: {
        include: {
          property: true
        }
      }
    },
    orderBy: [{ critical: "desc" }, { dueDate: "asc" }, { reminderAt: "asc" }],
    take: limit
  });
}

export function getCurrentRent(tenancy: {
  rentChanges: { amount: Prisma.Decimal; effectiveDate: Date }[];
}) {
  const today = new Date();
  const effectiveRent =
    tenancy.rentChanges.find((change) => change.effectiveDate <= today) ?? tenancy.rentChanges[0] ?? null;

  return effectiveRent;
}

export function getTenancyDocument(tenancy: {
  documents: { id: string; fileName: string; mimeType: string; createdAt: Date }[];
}) {
  return tenancy.documents[0] ?? null;
}

export function getDefaultRentReviewDate(startDate: Date | string) {
  return addYears(typeof startDate === "string" ? new Date(startDate) : startDate, 1);
}

export function getTenancySummary(tenancy: {
  paymentDay: number;
  rentChanges: { amount: Prisma.Decimal; effectiveDate: Date }[];
  tenancyParticipants: { tenant: { firstName: string; surname: string } }[];
  depositAmount: Prisma.Decimal;
}) {
  return {
    currentRent: getCurrentRent(tenancy),
    nextPaymentDate: computeNextPaymentDate(tenancy.paymentDay),
    linkedTenants: tenancy.tenancyParticipants.map((participant) => participant.tenant),
    depositAmount: tenancy.depositAmount
  };
}
