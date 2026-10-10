"use client";

import React from "react";

interface Stats {
  total: number;
  New: number;
  Reviewing: number;
  Shortlisted: number;
  Selected: number;
  Rejected: number;
}

interface AmbassadorStatsProps {
  stats: Stats;
  loading?: boolean;
}

const statCards = [
  { key: "total", label: "Total", color: "bg-gray-900", text: "text-white" },
  { key: "New", label: "New", color: "bg-blue-50", text: "text-blue-700" },
  { key: "Reviewing", label: "Reviewing", color: "bg-amber-50", text: "text-amber-700" },
  { key: "Shortlisted", label: "Shortlisted", color: "bg-purple-50", text: "text-purple-700" },
  { key: "Selected", label: "Selected", color: "bg-emerald-50", text: "text-emerald-700" },
  { key: "Rejected", label: "Rejected", color: "bg-red-50", text: "text-red-700" },
];

export default function AmbassadorStats({
  stats,
  loading,
}: AmbassadorStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((card) => (
        <div
          key={card.key}
          className={`rounded-xl p-4 ${card.color} transition-all`}
        >
          <div className={`text-2xl font-bold ${card.text} font-heading`}>
            {loading ? (
              <div className="h-8 w-12 bg-gray-200/50 rounded animate-pulse" />
            ) : (
              stats[card.key as keyof Stats]
            )}
          </div>
          <div
            className={`text-xs font-medium mt-1 ${
              card.key === "total" ? "text-gray-400" : card.text
            } opacity-80`}
          >
            {card.label}
          </div>
        </div>
      ))}
    </div>
  );
}
