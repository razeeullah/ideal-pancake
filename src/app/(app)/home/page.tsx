import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/features/auth/session";
import { DashboardExperience } from "@/features/dashboard/dashboard-experience";

export const metadata: Metadata = { title: "Home — Overview" };

export default async function HomePage() {
  await requirePermission("dashboard.view");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-border/60 pb-px">
        <Link
          href="/home"
          className="relative -mb-px border-b-2 border-primary px-3.5 py-2 text-sm font-semibold text-foreground"
        >
          Overview
        </Link>
        <Link
          href="/home/analytics"
          className="relative -mb-px border-b-2 border-transparent px-3.5 py-2 text-sm font-medium text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground transition-colors"
        >
          Analytics & Reports
        </Link>
      </div>
      <DashboardExperience />
    </div>
  );
}
