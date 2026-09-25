import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export interface PageTab {
  href: string;
  label: string;
  active?: boolean;
}

export function PageTitle({
  title,
  description,
  eyebrow,
  actions,
  tabs,
  className,
}: Readonly<{
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  tabs?: readonly PageTab[];
  className?: string;
}>) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-primary text-sm font-medium">{eyebrow}</p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {tabs && tabs.length > 0 && (
        <div className="flex items-center gap-1 border-b border-border/60 pb-px">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative -mb-px px-3.5 py-2 text-sm font-medium transition-colors border-b-2",
                tab.active
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
