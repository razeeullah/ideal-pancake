"use server";

import { redirect } from "next/navigation";

import { writeAuditLog } from "@/features/audit/write-audit-log";
import {
  authenticateCredentials,
  revokeSessionByRawToken,
} from "@/features/auth/authentication";
import { hashPassword, verifyPassword } from "@/features/auth/password";
import { getRequestMetadata } from "@/features/auth/request-metadata";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  type ChangePasswordActionResult,
  type ChangePasswordInput,
  type LoginActionResult,
  type LoginInput,
  type RegisterActionResult,
  type RegisterInput,
} from "@/features/auth/schemas";
import {
  clearSessionCookie,
  createRawSessionToken,
  createSessionRecord,
  getCurrentRawSessionToken,
  hashSessionToken,
  requireUser,
  setSessionCookie,
} from "@/features/auth/session";
import { AuditAction, UserStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

export async function loginAction(
  input: LoginInput,
): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = {
      ...(flattened.fieldErrors.credential === undefined
        ? {}
        : { credential: flattened.fieldErrors.credential }),
      ...(flattened.fieldErrors.password === undefined
        ? {}
        : { password: flattened.fieldErrors.password }),
    };
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const result = await authenticateCredentials(
    parsed.data,
    await getRequestMetadata(),
  );
  if (!result.success) {
    return result;
  }

  await setSessionCookie(result.rawToken, result.expiresAt);
  return { success: true };
}

export async function registerAction(
  input: RegisterInput,
): Promise<RegisterActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const fieldErrors = {
      ...(flattened.fieldErrors.displayName === undefined
        ? {}
        : { displayName: flattened.fieldErrors.displayName }),
      ...(flattened.fieldErrors.email === undefined
        ? {}
        : { email: flattened.fieldErrors.email }),
      ...(flattened.fieldErrors.username === undefined
        ? {}
        : { username: flattened.fieldErrors.username }),
      ...(flattened.fieldErrors.roleCode === undefined
        ? {}
        : { roleCode: flattened.fieldErrors.roleCode }),
      ...(flattened.fieldErrors.password === undefined
        ? {}
        : { password: flattened.fieldErrors.password }),
      ...(flattened.fieldErrors.confirmPassword === undefined
        ? {}
        : { confirmPassword: flattened.fieldErrors.confirmPassword }),
    };
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const normalizedUsername = parsed.data.username.trim().toLowerCase();

  const existingUser = await db.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
    },
    select: { email: true, username: true },
  });

  if (existingUser !== null) {
    if (existingUser.email.toLowerCase() === normalizedEmail) {
      return {
        success: false,
        message: "An account with this email address already exists.",
        fieldErrors: { email: ["This email is already registered"] },
      };
    }
    if (existingUser.username.toLowerCase() === normalizedUsername) {
      return {
        success: false,
        message: "This username is already taken.",
        fieldErrors: { username: ["This username is already taken"] },
      };
    }
  }

  const business = await db.business.findFirst({
    where: { archivedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      locations: {
        where: { isActive: true, archivedAt: null },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
      roles: {
        where: { archivedAt: null },
      },
    },
  });

  if (business === null) {
    return {
      success: false,
      message: "No active business was found for account registration.",
    };
  }

  const selectedRole =
    business.roles.find((r) => r.code === parsed.data.roleCode) ??
    business.roles.find((r) => r.code === "OWNER") ??
    business.roles[0];

  if (selectedRole === undefined) {
    return {
      success: false,
      message: "No appropriate role was found for registration.",
    };
  }

  const defaultLocation = business.locations[0] ?? null;

  const [passwordHash, metadata] = await Promise.all([
    hashPassword(parsed.data.password),
    getRequestMetadata(),
  ]);

  const rawToken = createRawSessionToken();

  const session = await db.$transaction(async (transaction) => {
    const newUser = await transaction.user.create({
      data: {
        businessId: business.id,
        defaultLocationId: defaultLocation?.id ?? null,
        email: normalizedEmail,
        username: normalizedUsername,
        displayName: parsed.data.displayName.trim(),
        passwordHash,
        status: UserStatus.ACTIVE,
        failedLoginAttempts: 0,
        roles: {
          create: [{ businessId: business.id, roleId: selectedRole.id }],
        },
        ...(defaultLocation !== null
          ? {
              locations: {
                create: [
                  {
                    businessId: business.id,
                    locationId: defaultLocation.id,
                  },
                ],
              },
            }
          : {}),
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        username: true,
      },
    });

    const newSession = await createSessionRecord(transaction, {
      businessId: business.id,
      userId: newUser.id,
      currentLocationId: defaultLocation?.id ?? null,
      tokenHash: hashSessionToken(rawToken),
      rememberMe: true,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    await writeAuditLog(transaction, {
      businessId: business.id,
      locationId: defaultLocation?.id ?? null,
      actorUserId: newUser.id,
      action: AuditAction.USER_CREATED,
      entityType: "User",
      entityId: newUser.id,
      after: {
        displayName: newUser.displayName,
        email: newUser.email,
        username: newUser.username,
        role: selectedRole.code,
      },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    return newSession;
  });

  await setSessionCookie(rawToken, session.expiresAt);

  return {
    success: true,
    redirectUrl: selectedRole.code === "CASHIER" ? "/pos" : "/dashboard",
  };
}

export async function changePasswordAction(
  input: ChangePasswordInput,
): Promise<ChangePasswordActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: {
        ...(fields.currentPassword === undefined
          ? {}
          : { currentPassword: fields.currentPassword }),
        ...(fields.newPassword === undefined
          ? {}
          : { newPassword: fields.newPassword }),
        ...(fields.confirmPassword === undefined
          ? {}
          : { confirmPassword: fields.confirmPassword }),
      },
    };
  }

  const context = await requireUser();
  const user = await db.user.findUnique({
    where: { id: context.user.id },
    select: { passwordHash: true },
  });
  if (
    user === null ||
    !(await verifyPassword(user.passwordHash, parsed.data.currentPassword))
  ) {
    return {
      success: false,
      message: "The current password is incorrect.",
      fieldErrors: {
        currentPassword: ["The current password is incorrect"],
      },
    };
  }

  const [newPasswordHash, metadata] = await Promise.all([
    hashPassword(parsed.data.newPassword),
    getRequestMetadata(),
  ]);
  const rawToken = createRawSessionToken();
  const now = new Date();
  const rotatedSession = await db.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: context.user.id },
      data: {
        passwordHash: newPasswordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    const revoked = await transaction.session.updateMany({
      where: { userId: context.user.id, revokedAt: null },
      data: { revokedAt: now },
    });
    const session = await createSessionRecord(transaction, {
      businessId: context.business.id,
      userId: context.user.id,
      currentLocationId: context.currentLocation?.id ?? null,
      tokenHash: hashSessionToken(rawToken),
      rememberMe: context.rememberMe,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    await writeAuditLog(transaction, {
      businessId: context.business.id,
      locationId: context.currentLocation?.id ?? null,
      actorUserId: context.user.id,
      action: AuditAction.AUTH_PASSWORD_CHANGED,
      entityType: "User",
      entityId: context.user.id,
      metadata: { revokedSessionCount: revoked.count },
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    return session;
  });

  await setSessionCookie(rawToken, rotatedSession.expiresAt);
  return {
    success: true,
    message: "Password changed. Other sessions have been signed out.",
  };
}

export async function logoutAction(): Promise<never> {
  const rawToken = await getCurrentRawSessionToken();
  if (rawToken !== null) {
    await revokeSessionByRawToken(rawToken, await getRequestMetadata());
  }
  await clearSessionCookie();
  redirect("/login");
}
