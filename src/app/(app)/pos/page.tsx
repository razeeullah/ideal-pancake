import { requirePermission } from "@/features/auth/session";
import { PointOfSaleDemo } from "@/features/point-of-sale/point-of-sale-demo";
import { getPosData } from "@/features/sales/queries";

export default async function PosPage() {
  const context = await requirePermission("sale.create");
  const posData = await getPosData(
    context.business.id,
    context.locations[0]?.id ?? null,
  );

  const realProducts = posData.products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.categoryId ?? "General",
    brand: "General",
    dimensions: "",
    finish: "",
    imageClass: "tile-marble-white",
    pricePaise: Math.round(Number(p.sellingPrice) * 100),
    stockSqFt: 0,
    status: "IN_STOCK" as const,
  }));

  const realCategories = [
    "All Products",
    ...posData.categories.map((c) => c.name),
  ];

  const realCustomers = posData.customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone ?? "",
    type: "RETAIL" as const,
  }));

  return (
    <PointOfSaleDemo
      initialProducts={realProducts}
      initialCategories={realCategories}
      initialCustomers={realCustomers}
    />
  );
}
