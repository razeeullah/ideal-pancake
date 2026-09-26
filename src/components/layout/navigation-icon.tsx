import {
  ClipboardList,
  Home,
  LayoutDashboard,
  Package,
  Receipt,
  ReceiptText,
  ScrollText,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  UsersRound,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import type { NavigationIconKey } from "@/components/layout/navigation";

const navigationIcons: Record<string, LucideIcon> = {
  // Primary 8-section navigation
  home: Home,
  sell: ShoppingCart,
  products: Package,
  purchases: ClipboardList,
  customers: UsersRound,
  expenses: Receipt,
  team: UserCog,
  settings: Settings,

  // Backward-compatibility aliases
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  sales: ReceiptText,
  inventory: Warehouse,
  suppliers: Truck,
  users: UserCog,
  reports: Receipt,
  audit: ScrollText,
};

export function NavigationIcon({
  icon,
  className = "size-4",
}: Readonly<{ icon: NavigationIconKey; className?: string }>) {
  // Safe fallback to Package icon if key is missing or undefined
  const Icon = navigationIcons[icon] ?? Package;
  return <Icon className={className} aria-hidden="true" />;
}
