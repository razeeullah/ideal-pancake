import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "@/features/auth/schemas";

describe("loginSchema", () => {
  it("normalizes an email and supplies a safe default return path", () => {
    const result = loginSchema.parse({
      credential: " OWNER@Example.COM ",
      password: "secret",
    });
    expect(result).toEqual({
      credential: "owner@example.com",
      password: "secret",
      rememberMe: false,
      returnTo: "/dashboard",
    });
  });

  it("accepts and normalizes a username", () => {
    expect(
      loginSchema.parse({
        credential: " Demo.Cashier ",
        password: "secret",
        rememberMe: true,
      }),
    ).toMatchObject({ credential: "demo.cashier", rememberMe: true });
  });

  it("rejects protocol-relative redirect targets", () => {
    const result = loginSchema.safeParse({
      credential: "owner@example.com",
      password: "secret",
      returnTo: "//malicious.example",
    });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts valid registration input and normalizes email and username", () => {
    const result = registerSchema.parse({
      displayName: "  John Doe  ",
      email: " JOHN@Demo.Local ",
      username: "  John_Doe  ",
      roleCode: "OWNER",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result).toEqual({
      displayName: "John Doe",
      email: "john@demo.local",
      username: "john_doe",
      roleCode: "OWNER",
      password: "password123",
      confirmPassword: "password123",
    });
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      displayName: "John Doe",
      email: "john@demo.local",
      username: "johndoe",
      roleCode: "CASHIER",
      password: "password123",
      confirmPassword: "password456",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined();
    }
  });

  it("rejects invalid characters in username", () => {
    const result = registerSchema.safeParse({
      displayName: "John Doe",
      email: "john@demo.local",
      username: "john doe!",
      roleCode: "MANAGER",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(result.success).toBe(false);
  });
});
