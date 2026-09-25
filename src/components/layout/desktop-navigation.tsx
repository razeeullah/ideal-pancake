"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavigationItem } from "@/components/layout/navigation";
import { isNavigationItemActive } from "@/components/layout/navigation";
import { NavigationIcon } from "@/components/layout/navigation-icon";
import { cn } from "@/lib/utils";

export function DesktopNavigation({
  items,
}: Readonly<{ items: readonly NavigationItem[] }>) {
  const pathname = usePathname();

  return (
    <nav
      className="flex-1 space-y-1 overflow-y-auto p-3"
      aria-label="Primary navigation"
    >
      {items.map((item, idx) => {
        const isActive = isNavigationItemActive(pathname, item);

        return (
          <div key={item.href} className="space-y-0.5">
            {/* Visual separator before admin section */}
            {item.separator && idx > 0 && (
              <div className="my-2 border-t border-sidebar-border/60" />
            )}

            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <NavigationIcon icon={item.icon} className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>

            {/* Sub-navigation items shown when parent is active */}
            {isActive && item.children && item.children.length > 0 && (
              <div className="ml-5 mt-1 space-y-0.5 border-l-2 border-sidebar-border/80 pl-2.5">
                {item.children.map((child) => {
                  const isChildActive =
                    pathname === child.href ||
                    (child.href !== item.href && pathname.startsWith(child.href));

                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "block rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        isChildActive
                          ? "bg-sidebar-accent/90 text-sidebar-accent-foreground font-semibold"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
