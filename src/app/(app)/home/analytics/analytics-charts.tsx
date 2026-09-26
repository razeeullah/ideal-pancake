"use client";

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

export interface FormattedRevenueItem {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface CategoryShareItem {
  name: string;
  value: number;
  color: string;
}

export function RevenueBarChartSection({
  data,
}: Readonly<{ data: FormattedRevenueItem[] }>) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
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
  );
}

export function CategoryPieChartSection({
  data,
}: Readonly<{ data: CategoryShareItem[] }>) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v: unknown) => [`${String(v)}%`, "Share"]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
