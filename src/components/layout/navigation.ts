import type { PermissionKey } from "@/features/auth/permissions";

export const NAVIGATION_ICON_KEYS = [
  "home",
  "sell",
  "products",
  "purchases",
  "customers",
  "expenses",
  "team",
  "settings",
] as const;

export type NavigationIconKey = (typeof NAVIGATION_ICON_KEYS)[number];

export interface NavigationItem {
  href: string;
  label: string;
  icon: NavigationIconKey;
  description: string;
  permissions: readonly PermissionKey[];
  /** Sub-items appear as tabs/links inside the page */
  children?: readonly NavigationChild[];
  /** Visual separator before this item (admin section) */
  separator?: boolean;
}

export interface NavigationChild {
  href: string;
  label: string;
  permissions: readonly PermissionKey[];
}

export const navigationItems = [
  {
    href: "/home",
    label: "Home",
    icon: "home",
    description: "Business overview and analytics",
    permissions: ["dashboard.view"],
    children: [
      {
        href: "/home",
        label: "Overview",
        permissions: ["dashboard.view"],
      },
      {
        href: "/home/analytics",
        label: "Analytics",
        permissions: ["report.sales"],
      },
    ],
  },
  {
    href: "/sell",
    label: "Sell",
    icon: "sell",
    description: "Point-of-sale and sales history",
    permissions: ["sale.create", "sale.view"],
    children: [
      {
        href: "/pos",
        label: "New Sale",
        permissions: ["sale.create"],
      },
      {
        href: "/sales",
        label: "History",
        permissions: ["sale.view"],
      },
    ],
  },
  {
    href: "/products",
    label: "Products",
    icon: "products",
    description: "Products, stock and categories",
    permissions: ["product.view"],
    children: [
      {
        href: "/products",
        label: "All Products",
        permissions: ["product.view"],
      },
      {
        href: "/inventory",
        label: "Stock",
        permissions: ["inventory.view"],
      },
      {
        href: "/inventory/low-stock",
        label: "Low Stock",
        permissions: ["inventory.view"],
      },
      {
        href: "/inventory/adjustments",
        label: "Adjustments",
        permissions: ["inventory.adjust"],
      },
      {
        href: "/products/categories",
        label: "Categories",
        permissions: ["product.view"],
      },
    ],
  },
  {
    href: "/purchases",
    label: "Purchases",
    icon: "purchases",
    description: "Purchase orders and suppliers",
    permissions: ["purchase.view"],
    children: [
      {
        href: "/purchases",
        label: "Orders",
        permissions: ["purchase.view"],
      },
      {
        href: "/suppliers",
        label: "Suppliers",
        permissions: ["supplier.manage"],
      },
    ],
  },
  {
    href: "/customers",
    label: "Customers",
    icon: "customers",
    description: "Customer directory and history",
    permissions: ["sale.view"],
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: "expenses",
    description: "Business expenses",
    permissions: ["expense.view"],
  },
  {
    href: "/team",
    label: "Team",
    icon: "team",
    description: "Users, roles and activity log",
    permissions: ["user.view"],
    separator: true,
    children: [
      {
        href: "/users",
        label: "Members",
        permissions: ["user.view"],
      },
      {
        href: "/users/roles",
        label: "Roles",
        permissions: ["user.view"],
      },
      {
        href: "/audit-logs",
        label: "Activity Log",
        permissions: ["audit.view"],
      },
    ],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "settings",
    description: "Business and application settings",
    permissions: ["settings.manage"],
  },
] as const satisfies readonly NavigationItem[];

export function isNavigationItemActive(
  pathname: string,
  item: NavigationItem,
): boolean {
  // Sell is active when on /pos or /sales or /sell
  if (item.href === "/sell") {
    return (
      pathname === "/sell" ||
      pathname.startsWith("/sell/") ||
      pathname === "/pos" ||
      pathname.startsWith("/pos/") ||
      pathname === "/sales" ||
      pathname.startsWith("/sales/")
    );
  }
  // Products is active when on /products or /inventory
  if (item.href === "/products") {
    return (
      pathname === "/products" ||
      pathname.startsWith("/products/") ||
      pathname === "/inventory" ||
      pathname.startsWith("/inventory/")
    );
  }
  // Purchases is active when on /purchases or /suppliers
  if (item.href === "/purchases") {
    return (
      pathname === "/purchases" ||
      pathname.startsWith("/purchases/") ||
      pathname === "/suppliers" ||
      pathname.startsWith("/suppliers/")
    );
  }
  // Team is active when on /users or /audit-logs
  if (item.href === "/team") {
    return (
      pathname === "/team" ||
      pathname.startsWith("/team/") ||
      pathname === "/users" ||
      pathname.startsWith("/users/") ||
      pathname === "/audit-logs" ||
      pathname.startsWith("/audit-logs/")
    );
  }
  // Home is active for /home and /dashboard (legacy redirect)
  if (item.href === "/home") {
    return (
      pathname === "/home" ||
      pathname.startsWith("/home/") ||
      pathname === "/dashboard"
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function findNavigationItemByPathname(
  pathname: string,
): NavigationItem | undefined {
  return navigationItems.find((item) => isNavigationItemActive(pathname, item));
}

/** Legacy: find by first path segment */
export function findNavigationItemBySegment(
  segment: string,
): NavigationItem | undefined {
  // Map old segments to new items
  const legacyMap: Record<string, string> = {
    dashboard: "/home",
    pos: "/sell",
    sales: "/sell",
    inventory: "/products",
    suppliers: "/purchases",
    "audit-logs": "/team",
    users: "/team",
    reports: "/home",
  };
  const mappedHref = legacyMap[segment];
  if (mappedHref) {
    return navigationItems.find((item) => item.href === mappedHref);
  }
  return navigationItems.find((item) => item.href === `/${segment}`);
}
