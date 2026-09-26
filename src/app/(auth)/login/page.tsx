import { LockKeyhole, Store } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/features/auth/auth-card";
import { getAuthContext } from "@/features/auth/session";

export const metadata: Metadata = { title: "Sign in & Registration" };

interface LoginPageProps {
  searchParams: Promise<{
    returnTo?: string | string[];
    tab?: string | string[];
  }>;
}

function safeReturnPath(value: string | string[] | undefined): string {
  const path = Array.isArray(value) ? value[0] : value;
  return path !== undefined && path.startsWith("/") && !path.startsWith("//")
    ? path.slice(0, 500)
    : "/dashboard";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [context, query] = await Promise.all([getAuthContext(), searchParams]);
  if (context !== null) {
    redirect("/dashboard");
  }

  const initialTab =
    (Array.isArray(query.tab) ? query.tab[0] : query.tab) === "register"
      ? "register"
      : "login";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3">
        <div className="bg-primary text-primary-foreground grid size-11 place-items-center rounded-xl shadow-lg shadow-black/20">
          <Store className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold tracking-tight">Retail POS</p>
          <p className="text-muted-foreground text-xs">
            Secure business operations
          </p>
        </div>
      </div>

      <AuthCard
        returnTo={safeReturnPath(query.returnTo)}
        initialMode={initialTab}
      />

      <p className="text-muted-foreground flex items-center justify-center gap-2 text-center text-xs">
        <LockKeyhole className="size-3.5" aria-hidden="true" />
        Sessions expire automatically and all sign-in activity is audited.
      </p>
    </div>
  );
}
