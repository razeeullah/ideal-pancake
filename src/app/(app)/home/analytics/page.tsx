"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  DollarSign,
  Download,
  Percent,
  Receipt,
  ShoppingBag,
} from "lucide-react";

import { PageTitle } from "@/components/layout/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REVENUE_DATA, TOP_SELLING_PRODUCTS } from "@/features/dashboard/mock-data";

const CATEGORY_SHARE = [
  { name: "Beverages", value: 38, color: "#2563eb" },
  { name: "Snacks & Confectionery", value: 27, color: "#10b981" },
  { name: "Personal Care", value: 20, color: "#f59e0b" },
  { name: "Household Essentials", value: 15, color: "#8b5cf6" },
];

export default function AnalyticsPage() {
  const [range, setRange] = useState("7d");

  const formattedRevenue = useMemo(() => {
    return REVENUE_DATA.map((item) => ({
      date: item.date,
      revenue: item.revenue,
      cost: item.cost,
      profit: item.revenue - item.cost,
    }));
  }, []);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Analytics & Reports"
        description="Comprehensive insights into sales performance, revenue margins, and inventory velocity."
        tabs={[
          { href: "/home", label: "Overview", active: false },
          { href: "/home/analytics", label: "Analytics", active: true },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Revenue (7d)
            </CardTitle>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <DollarSign className="size-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">Rs. 1,288,000</div>
            <p className="mt-1 flex items-center text-xs font-medium text-emerald-600">
              <ArrowUpRight className="mr-1 size-3" />
              +14.2% vs previous period
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Average Order Value
            </CardTitle>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Receipt className="size-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">Rs. 7,665</div>
            <p className="mt-1 flex items-center text-xs font-medium text-emerald-600">
              <ArrowUpRight className="mr-1 size-3" />
              +4.8% vs last week
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Gross Profit Margin
            </CardTitle>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Percent className="size-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">46.5%</div>
            <p className="mt-1 flex items-center text-xs font-medium text-emerald-600">
              <ArrowUpRight className="mr-1 size-3" />
              +2.1% margin expansion
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Completed Sales
            </CardTitle>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <ShoppingBag className="size-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">168 orders</div>
            <p className="mt-1 flex items-center text-xs font-medium text-emerald-600">
              <ArrowUpRight className="mr-1 size-3" />
              +18 orders vs last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="col-span-4 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Revenue vs Cost of Goods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(v: unknown) => [`Rs. ${Number(v).toLocaleString()}`, ""]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="Cost" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Revenue by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CATEGORY_SHARE}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {CATEGORY_SHARE.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => [`${String(v)}%`, "Share"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-2">
              {CATEGORY_SHARE.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-muted-foreground">{cat.name}</span>
                  </div>
                  <span className="font-semibold">{cat.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Table */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Top Performing Products
          </CardTitle>
          <Badge variant="outline" className="font-normal text-xs">
            Past 7 Days
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Category / Variant</th>
                  <th className="pb-3 font-medium text-right">Units Sold</th>
                  <th className="pb-3 font-medium text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {TOP_SELLING_PRODUCTS.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/30">
                    <td className="py-3 font-medium">{product.name}</td>
                    <td className="py-3 text-muted-foreground text-xs">{product.finish}</td>
                    <td className="py-3 text-right font-medium">{product.soldSqFt} units</td>
                    <td className="py-3 text-right font-semibold">
                      Rs. {(product.salesAmount / 100).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
