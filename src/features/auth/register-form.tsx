"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction } from "@/features/auth/actions";
import {
  registerSchema,
  type RegisterFormInput,
  type RegisterInput,
} from "@/features/auth/schemas";
import { cn } from "@/lib/utils";

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

const ROLE_OPTIONS = [
  {
    code: "OWNER",
    label: "Store Owner",
    description: "Full management & reports",
  },
  {
    code: "MANAGER",
    label: "Manager",
    description: "Sales, stock & staff",
  },
  {
    code: "CASHIER",
    label: "Cashier",
    description: "Point of sale & billing",
  },
] as const;

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterFormInput, unknown, RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      username: "",
      roleCode: "OWNER",
      password: "",
      confirmPassword: "",
    },
  });

  const selectedRole = useWatch({
    control: form.control,
    name: "roleCode",
  });

  const submit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(() => {
      void registerAction(values)
        .then((result) => {
          if (!result.success) {
            setServerError(result.message);
            if (result.fieldErrors?.displayName?.[0] !== undefined) {
              form.setError("displayName", {
                message: result.fieldErrors.displayName[0],
              });
            }
            if (result.fieldErrors?.email?.[0] !== undefined) {
              form.setError("email", {
                message: result.fieldErrors.email[0],
              });
            }
            if (result.fieldErrors?.username?.[0] !== undefined) {
              form.setError("username", {
                message: result.fieldErrors.username[0],
              });
            }
            if (result.fieldErrors?.password?.[0] !== undefined) {
              form.setError("password", {
                message: result.fieldErrors.password[0],
              });
            }
            if (result.fieldErrors?.confirmPassword?.[0] !== undefined) {
              form.setError("confirmPassword", {
                message: result.fieldErrors.confirmPassword[0],
              });
            }
            return;
          }

          router.replace(result.redirectUrl);
          router.refresh();
        })
        .catch(() => {
          setServerError(
            "We could not create your account right now. Please try again.",
          );
        });
    });
  });

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      {serverError !== null ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="size-4" />
          <AlertTitle>Registration failed</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="displayName">Full name</Label>
        <Input
          id="displayName"
          type="text"
          autoComplete="name"
          placeholder="e.g. John Doe"
          disabled={isPending}
          aria-invalid={form.formState.errors.displayName !== undefined}
          {...form.register("displayName")}
        />
        {form.formState.errors.displayName?.message !== undefined ? (
          <p className="text-destructive text-xs" role="alert">
            {form.formState.errors.displayName.message}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="john@example.com"
            disabled={isPending}
            aria-invalid={form.formState.errors.email !== undefined}
            {...form.register("email")}
          />
          {form.formState.errors.email?.message !== undefined ? (
            <p className="text-destructive text-xs" role="alert">
              {form.formState.errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="johndoe"
            disabled={isPending}
            aria-invalid={form.formState.errors.username !== undefined}
            {...form.register("username")}
          />
          {form.formState.errors.username?.message !== undefined ? (
            <p className="text-destructive text-xs" role="alert">
              {form.formState.errors.username.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Select your role</Label>
        <div className="grid grid-cols-3 gap-2">
          {ROLE_OPTIONS.map((role) => {
            const isSelected = selectedRole === role.code;
            return (
              <button
                key={role.code}
                type="button"
                disabled={isPending}
                onClick={() => form.setValue("roleCode", role.code)}
                className={cn(
                  "p-2 text-left rounded-lg border text-xs transition-all flex flex-col justify-between cursor-pointer",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                    : "border-border/70 hover:border-foreground/40 text-muted-foreground",
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-semibold text-foreground">
                    {role.label}
                  </span>
                  {isSelected ? (
                    <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  ) : null}
                </div>
                <span className="text-[10px] leading-tight text-muted-foreground">
                  {role.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 chars"
            disabled={isPending}
            aria-invalid={form.formState.errors.password !== undefined}
            {...form.register("password")}
          />
          {form.formState.errors.password?.message !== undefined ? (
            <p className="text-destructive text-xs" role="alert">
              {form.formState.errors.password.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            disabled={isPending}
            aria-invalid={form.formState.errors.confirmPassword !== undefined}
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword?.message !== undefined ? (
            <p className="text-destructive text-xs" role="alert">
              {form.formState.errors.confirmPassword.message}
            </p>
          ) : null}
        </div>
      </div>

      <Button className="w-full mt-2" size="lg" type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
        {isPending ? "Creating account…" : "Create account & Sign in"}
      </Button>

      {onSwitchToLogin !== undefined ? (
        <div className="text-center pt-1 text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-primary font-semibold hover:underline cursor-pointer"
          >
            Sign in
          </button>
        </div>
      ) : null}
    </form>
  );
}
