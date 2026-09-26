import { cache } from "react";
import { revalidateTag } from "next/cache";

import { writeAuditLog } from "@/features/audit/write-audit-log";
import type { RequestMetadata } from "@/features/auth/request-metadata";
import type { AuthContext } from "@/features/auth/session";
import type { BusinessSettingsInput } from "@/features/settings/schemas";
import { AuditAction } from "@/generated/prisma/enums";
import { withCache, CacheTags } from "@/lib/cache";
import { db } from "@/lib/db";

export interface ThemeSettings {
  themeMode: "light" | "dark";
  accentColor: string;
}

export const getThemeSettings = cache(async (businessId: string): Promise<ThemeSettings> => {
  return withCache(
    async (): Promise<ThemeSettings> => {
      const setting = await db.businessSetting.findUnique({
        where: { businessId_key: { businessId, key: "pos" } },
        select: { value: true },
      });
      const pos = (setting?.value ?? {}) as Record<string, unknown>;
      const themeMode: "light" | "dark" = pos.themeMode === "dark" ? "dark" : "light";
      return {
        themeMode,
        accentColor: typeof pos.accentColor === "string" ? pos.accentColor : "blue",
      };
    },
    [`theme-settings-${businessId}`],
    {
      tags: [CacheTags.settings(businessId)],
      revalidate: 3600,
    },
  )();
});

export const getBusinessSettings = cache(async (businessId: string) => {
  return withCache(
    async () => {
      const [business, settings, locations, registers, sequences] =
        await Promise.all([
          db.business.findUniqueOrThrow({ where: { id: businessId } }),
          db.businessSetting.findMany({ where: { businessId } }),
          db.location.findMany({
            where: { businessId, isActive: true, archivedAt: null },
            select: {
              id: true,
              name: true,
              code: true,
              phone: true,
              isActive: true,
            },
          }),
          db.register.findMany({
            where: { businessId, isActive: true, archivedAt: null },
            select: { id: true, name: true, locationId: true },
          }),
          db.numberSequence.findMany({
            where: { businessId },
            select: { key: true, prefix: true, padding: true },
          }),
        ]);
      return {
        business,
        settings: Object.fromEntries(
          settings.map((item) => [item.key, item.value]),
        ),
        locations,
        registers,
        sequences,
      };
    },
    [`business-settings-${businessId}`],
    {
      tags: [CacheTags.settings(businessId)],
      revalidate: 3600,
    },
  )();
});

export async function saveBusinessSettings(
  context: AuthContext,
  input: BusinessSettingsInput,
  metadata: RequestMetadata,
) {
  const before = await getBusinessSettings(context.business.id);
  return db.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: context.business.id },
      data: {
        name: input.name,
        legalName: input.legalName?.trim() || null,
        taxRegistrationNumber: input.taxRegistrationNumber?.trim() || null,
        currencyCode: input.currencyCode,
        timezone: input.timezone,
        locale: input.locale,
      },
    });
    const values = {
      pos: {
        defaultLocationId: input.defaultLocationId ?? null,
        defaultRegisterId: input.defaultRegisterId ?? null,
        receiptFooter: input.receiptFooter ?? "",
        cashierDiscountLimitPercent: input.cashierDiscountLimitPercent,
        allowNegativeInventory: input.allowNegativeInventory,
        allowPriceOverride: input.allowPriceOverride,
        requireCustomerForCredit: input.requireCustomerForCredit,
        autoPrintReceipt: input.autoPrintReceipt,
        taxInclusive: input.taxInclusive,
        acceptedPaymentMethods: input.acceptedPaymentMethods,
        whatsappNumber: input.whatsappNumber ?? "",
        whatsappMessageTemplate: input.whatsappMessageTemplate ?? "",
        whatsappProvider: input.whatsappProvider,
        notificationPreferences: input.notificationPreferences,
        themeMode: input.themeMode,
        accentColor: input.accentColor,
      },
      profile: {
        address: input.address ?? "",
        phone: input.phone ?? "",
        email: input.email ?? "",
      },
    };
    for (const [key, value] of Object.entries(values))
      await tx.businessSetting.upsert({
        where: { businessId_key: { businessId: context.business.id, key } },
        update: { value },
        create: { businessId: context.business.id, key, value },
      });
    await writeAuditLog(tx, {
      businessId: context.business.id,
      actorUserId: context.user.id,
      action: AuditAction.UPDATE,
      entityType: "BusinessSetting",
      entityId: context.business.id,
      before: {
        business: { name: before.business.name },
        settings: before.settings,
      },
      after: { business: { name: input.name }, settings: values },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
  });
  revalidateTag(CacheTags.settings(context.business.id), "max");
}

export async function createBusinessLocation(
  context: AuthContext,
  input: { name: string; code: string; phone?: string | undefined },
  metadata: RequestMetadata,
) {
  const location = await db.$transaction(async (tx) => {
    const created = await tx.location.create({
      data: {
        businessId: context.business.id,
        name: input.name,
        code: input.code.trim().toUpperCase(),
        phone: input.phone?.trim() || null,
      },
      select: { id: true, name: true, code: true },
    });
    await writeAuditLog(tx, {
      businessId: context.business.id,
      actorUserId: context.user.id,
      action: AuditAction.CREATE,
      entityType: "Location",
      entityId: created.id,
      after: created,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    return created;
  });
  revalidateTag(CacheTags.settings(context.business.id), "max");
  return location;
}
