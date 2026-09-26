"use client";

import { useState } from "react";
import { ShieldCheck, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/login-form";
import { RegisterForm } from "@/features/auth/register-form";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  returnTo: string;
  initialMode?: "login" | "register";
}

export function AuthCard({ returnTo, initialMode = "login" }: AuthCardProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  return (
    <Card className="border-border/80 shadow-2xl shadow-black/20 transition-all">
      <CardHeader className="space-y-3 text-center pb-4">
        {/* Tab switchers */}
        <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={cn(
              "py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer select-none",
              mode === "login"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={cn(
              "py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer select-none",
              mode === "register"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Create account
          </button>
        </div>

        <div className="flex justify-center pt-1">
          {mode === "login" ? (
            <Badge variant="secondary" className="gap-1.5">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Protected access
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5">
              <UserPlus className="size-3.5" aria-hidden="true" />
              Self-service registration
            </Badge>
          )}
        </div>

        <CardTitle className="text-2xl">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Sign in with your staff email or username to continue."
            : "Fill in your details below to create an account for yourself."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {mode === "login" ? (
          <LoginForm
            returnTo={returnTo}
            onSwitchToRegister={() => setMode("register")}
          />
        ) : (
          <RegisterForm onSwitchToLogin={() => setMode("login")} />
        )}
      </CardContent>
    </Card>
  );
}
