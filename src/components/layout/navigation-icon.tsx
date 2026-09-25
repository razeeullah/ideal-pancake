import {
  BadgeDollarSign,
  ClipboardList,
  Home,
  Package,
  Settings,
  ShoppingCart,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { NavigationIconKey } from "@/components/layout/navigation";

const navigationIcons = {
  home: Home,
  sell: ShoppingCart,
  products: Package,
  purchases: ClipboardList,
  customers: UsersRound,
  expenses: BadgeDollarSign,
  team: Users,
  settings: Settings,
} satisfies Record<NavigationIconKey, LucideIcon>;

export function NavigationIcon({
  icon,
  className = "size-4",
}: Readonly<{ icon: NavigationIconKey; className?: string }>) {
  const Icon = navigationIcons[icon];
  return <Icon className={className} aria-hidden="true" />;
}
