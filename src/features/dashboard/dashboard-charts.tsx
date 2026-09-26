"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { REVENUE_DATA, SALES_TREND_DATA } from "@/features/dashboard/mock-data";

const inr = (minor: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 2,
  }).format(minor / 100);

const abbreviated = (value: number) =>
  value === 0 ? "0" : `${Math.round(value / 1000)}K`;

export function RevenueBarChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={REVENUE_DATA} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={abbreviated} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value) => inr(Number(value) * 100)} cursor={{ fill: "#f8fafc" }} />
        <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
        <Bar dataKey="cost" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SalesTrendLineChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={SALES_TREND_DATA} margin={{ left: -18, right: -8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="sales" tickFormatter={abbreviated} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="orders" orientation="right" domain={[0, 50]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value, key) => (key === "sales" ? inr(Number(value) * 100) : Number(value))} />
        <Line yAxisId="sales" type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
