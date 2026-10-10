"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import AmbassadorStats from "@/components/admin/AmbassadorStats";
import AmbassadorFilters from "@/components/admin/AmbassadorFilters";
import AmbassadorTable from "@/components/admin/AmbassadorTable";

interface Stats {
  total: number;
  New: number;
  Reviewing: number;
  Shortlisted: number;
  Selected: number;
  Rejected: number;
}

interface Filters {
  status: string;
  university: string;
  city: string;
  usedAptivo: string;
  weeklyAvailability: string;
}

const defaultStats: Stats = {
  total: 0,
  New: 0,
  Reviewing: 0,
  Shortlisted: 0,
  Selected: 0,
  Rejected: 0,
};

export default function AdminAmbassadorsPage() {
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({
    status: "",
    university: "",
    city: "",
    usedAptivo: "",
    weeklyAvailability: "",
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/ambassadors/stats");
      const data = await res.json();
      if (res.ok) setStats(data.stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (filters.status) params.set("status", filters.status);
      if (filters.university) params.set("university", filters.university);
      if (filters.city) params.set("city", filters.city);
      if (filters.usedAptivo) params.set("usedAptivo", filters.usedAptivo);
      if (filters.weeklyAvailability)
        params.set("weeklyAvailability", filters.weeklyAvailability);

      const res = await fetch(`/api/ambassadors?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setApplications(data.applications);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchApplications();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [fetchApplications]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filters.status) params.set("status", filters.status);
    if (filters.university) params.set("university", filters.university);
    if (filters.city) params.set("city", filters.city);
    if (filters.usedAptivo) params.set("usedAptivo", filters.usedAptivo);
    if (filters.weeklyAvailability)
      params.set("weeklyAvailability", filters.weeklyAvailability);

    window.open(`/api/ambassadors/export?${params.toString()}`, "_blank");
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-heading">
              Ambassador Applications
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and manage Aptivo Ambassador applications.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <AmbassadorStats stats={stats} loading={statsLoading} />
        </div>

        {/* Filters */}
        <div className="mb-4">
          <AmbassadorFilters
            filters={filters}
            onFilterChange={setFilters}
            search={search}
            onSearchChange={setSearch}
          />
        </div>

        {/* Table */}
        <AmbassadorTable applications={applications} loading={loading} />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-gray-500">
              Showing{" "}
              {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(
                pagination.page * pagination.limit,
                pagination.total
              )}{" "}
              of {pagination.total} applications
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  page === 1
                    ? "border-gray-100 text-gray-300 cursor-not-allowed"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-gray-700">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) =>
                    Math.min(pagination.totalPages, p + 1)
                  )
                }
                disabled={page === pagination.totalPages}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  page === pagination.totalPages
                    ? "border-gray-100 text-gray-300 cursor-not-allowed"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
