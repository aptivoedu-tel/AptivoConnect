"use client";

import React from "react";
import { STATUS_OPTIONS, WEEKLY_AVAILABILITY_OPTIONS } from "@/lib/validation";

interface Filters {
  status: string;
  university: string;
  city: string;
  usedAptivo: string;
  weeklyAvailability: string;
}

interface AmbassadorFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onReset?: () => void;
}

export default function AmbassadorFilters({
  filters,
  onFilterChange,
  search,
  onSearchChange,
  onReset,
}: AmbassadorFiltersProps) {
  const updateFilter = (key: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const selectClasses =
    "px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-aptivo-500/20 focus:border-aptivo-500 transition-all";

  const hasActiveFilters = Object.values(filters).some((v) => v !== "") || search !== "";

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onFilterChange({
        status: "",
        university: "",
        city: "",
        usedAptivo: "",
        weeklyAvailability: "",
      });
      onSearchChange("");
    }
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, email, university, or city..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-aptivo-500/20 focus:border-aptivo-500 transition-all placeholder-gray-400"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className={selectClasses}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filters.usedAptivo}
          onChange={(e) => updateFilter("usedAptivo", e.target.value)}
          className={selectClasses}
        >
          <option value="">Aptivo Usage</option>
          <option value="true">Used Aptivo</option>
          <option value="false">Never Used</option>
        </select>

        <select
          value={filters.weeklyAvailability}
          onChange={(e) =>
            updateFilter("weeklyAvailability", e.target.value)
          }
          className={selectClasses}
        >
          <option value="">All Availability</option>
          {WEEKLY_AVAILABILITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={filters.university}
          onChange={(e) => updateFilter("university", e.target.value)}
          placeholder="University..."
          className={`${selectClasses} w-36`}
        />

        <input
          type="text"
          value={filters.city}
          onChange={(e) => updateFilter("city", e.target.value)}
          placeholder="City..."
          className={`${selectClasses} w-28`}
        />

        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
