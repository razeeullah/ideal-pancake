"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { findNavigationItemByPathname } from "@/components/layout/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** Map sub-paths to breadcrumb labels */
const subPathLabels: Record<string, string> = {
  "/pos": "New Sale",
  "/sales": "History",
  "/inventory": "Stock",
  "/inventory/low-stock": "Low Stock",
  "/inventory/adjustments": "Adjustments",
  "/inventory/movements": "Movements",
  "/inventory/valuation": "Valuation",
  "/suppliers": "Suppliers",
  "/users": "Members",
  "/users/roles": "Roles",
  "/audit-logs": "Activity Log",
  "/home/analytics": "Analytics",
  "/account/change-password": "Change Password",
};

export function AppBreadcrumbs() {
  const pathname = usePathname();

  // Try to find exact sub-path label first
  const subLabel = subPathLabels[pathname];
  const parentItem = findNavigationItemByPathname(pathname);

  // If on a top-level nav page (not a sub-page), just show the section name
  const isTopLevel = parentItem && parentItem.href === pathname;

  if (!parentItem) {
    // Fallback for unknown paths
    return null;
  }

  if (isTopLevel) {
    return (
      <Breadcrumb className="hidden sm:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{parentItem.label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={parentItem.href}>{parentItem.label}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {subLabel && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{subLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
