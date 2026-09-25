"use client";

import { Menu, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { NavigationItem } from "@/components/layout/navigation";
import { isNavigationItemActive } from "@/components/layout/navigation";
import { NavigationIcon } from "@/components/layout/navigation-icon";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNavigation({
  items,
}: Readonly<{ items: readonly NavigationItem[] }>) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b p-5 text-left">
          <SheetTitle className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg">
              <Store className="size-4" />
            </span>
            Friends Distributors
          </SheetTitle>
        </SheetHeader>
        <nav className="space-y-0.5 p-3 overflow-y-auto" aria-label="Mobile navigation">
          {items.map((item, idx) => {
            const isActive = isNavigationItemActive(pathname, item);

            return (
              <div key={item.href} className="space-y-0.5">
                {item.separator && idx > 0 && (
                  <div className="my-2 border-t" />
                )}
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <NavigationIcon icon={item.icon} className="size-4 shrink-0" />
                  {item.label}
                </Link>

                {isActive && item.children && item.children.length > 0 && (
                  <div className="ml-5 mt-1 space-y-0.5 border-l-2 pl-2.5">
                    {item.children.map((child) => {
                      const isChildActive =
                        pathname === child.href ||
                        (child.href !== item.href && pathname.startsWith(child.href));

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "block rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                            isChildActive
                              ? "bg-accent text-accent-foreground font-semibold"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
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
      </SheetContent>
    </Sheet>
  );
}
