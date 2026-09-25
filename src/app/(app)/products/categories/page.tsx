import Link from "next/link";

import { PageTitle } from "@/components/layout/page-title";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/features/auth/session";
import { listCategories } from "@/features/products/queries";
import { ReferenceManager } from "@/features/products/reference-manager";

export default async function CategoriesPage() {
  const context = await requirePermission("category.manage");
  const records = await listCategories(context.business.id);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageTitle
        title="Categories"
        description="Manage business-scoped product categories."
        tabs={[
          { href: "/products", label: "All Products" },
          { href: "/inventory", label: "Stock" },
          { href: "/inventory/low-stock", label: "Low Stock" },
          { href: "/inventory/adjustments", label: "Adjustments" },
          { href: "/products/categories", label: "Categories", active: true },
        ]}
        actions={<ReferenceNavigation current="categories" />}
      />
      <ReferenceManager
        kind="category"
        records={records.map((record) => ({
          id: record.id,
          name: record.name,
          description: record.description,
          isActive: record.isActive,
          productCount: record._count.products,
        }))}
      />
    </div>
  );
}

function ReferenceNavigation({ current }: Readonly<{ current: string }>) {
  return (
    <div className="flex gap-2">
      <Button
        asChild
        variant={current === "categories" ? "default" : "outline"}
      >
        <Link href="/products/categories">Categories</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/products/brands">Brands</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/products/units">Units</Link>
      </Button>
    </div>
  );
}
