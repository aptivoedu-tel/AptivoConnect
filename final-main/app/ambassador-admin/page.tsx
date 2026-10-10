'use client';

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ShieldCheck,
  Lock,
  LogOut,
  Download,
  Search,
  RotateCcw,
  Users,
  Eye,
  ArrowUpRight
} from "lucide-react";

import AmbassadorStats from "@/components/admin/AmbassadorStats";
import AmbassadorFilters from "@/components/admin/AmbassadorFilters";
import AmbassadorTable from "@/components/admin/AmbassadorTable";
import AmbassadorDetail from "@/components/admin/AmbassadorDetail";

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

export default function AmbassadorAdminPortal() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard Data State
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({
    status: "",
    university: "",
    city: "",
    usedAptivo: "",
    weeklyAvailability: "",
  });
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [applicationsClosed, setApplicationsClosed] = useState<boolean>(false);
  const [togglingSettings, setTogglingSettings] = useState<boolean>(false);

  // Check initial session
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/ambassadors/stats");
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  // Fetch Ambassador Settings (Application Closed status)
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/ambassadors/settings");
      if (res.ok) {
        const data = await res.json();
        setApplicationsClosed(!!data.applicationsClosed);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  }, []);

  const handleToggleApplicationsClosed = async (newValue: boolean) => {
    setTogglingSettings(true);
    try {
      const res = await fetch("/api/ambassadors/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationsClosed: newValue }),
      });
      if (res.ok) {
        const data = await res.json();
        setApplicationsClosed(!!data.applicationsClosed);
      } else {
        alert("Failed to update application status.");
      }
    } catch (error) {
      console.error("Error toggling application status:", error);
      alert("Error updating application status.");
    } finally {
      setTogglingSettings(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Invalid credentials.");
        return;
      }

      setIsAuthenticated(true);
    } catch {
      setLoginError("Failed to connect to authentication service.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
  };

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/ambassadors/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || defaultStats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  // Fetch Applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "15");
      if (search) params.set("search", search);
      if (filters.status) params.set("status", filters.status);
      if (filters.university) params.set("university", filters.university);
      if (filters.city) params.set("city", filters.city);
      if (filters.usedAptivo) params.set("usedAptivo", filters.usedAptivo);
      if (filters.weeklyAvailability) params.set("weeklyAvailability", filters.weeklyAvailability);

      const res = await fetch(`/api/ambassadors?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchApplications();
      fetchSettings();
    }
  }, [isAuthenticated, fetchStats, fetchApplications, fetchSettings]);

  // Export CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      const res = await fetch(`/api/ambassadors/export?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `aptivo-ambassadors-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setExporting(false);
    }
  };

  // Loading Session check state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // 1. LOGIN SCREEN (When not signed in as Ambassador Admin)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 font-sans text-slate-900">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 group mb-4">
              <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-600/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="text-2xl font-black text-slate-900 tracking-tight">Aptivo</span>
            </Link>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Ambassador Admin Portal
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Sign in to manage and review ambassador submissions
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-7 sm:p-9">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@aptivo.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 transition-all"
                />
              </div>

              {loginError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 rounded-full bg-[#042f2e] hover:bg-teal-900 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-[#042f2e]/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loginLoading ? "Verifying..." : "Sign In to Portal"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <Link href="/ambassador" className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1">
                <span>View Public Ambassador Form</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. DASHBOARD VIEW (When Authenticated)
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900">
      {/* Admin Top Navigation */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-teal-600/20">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="text-lg font-black text-slate-900 tracking-tight">Aptivo</span>
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/60">
              Ambassador Management
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/ambassador"
              target="_blank"
              className="text-xs font-bold text-slate-600 hover:text-teal-600 transition-colors hidden sm:inline-flex items-center gap-1"
            >
              <span>Public Form</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-teal-600" />
              <span>{exporting ? "Exporting..." : "Export CSV"}</span>
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Application Status Toggle Banner */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md transition-all ${applicationsClosed ? "bg-rose-500 shadow-rose-500/20" : "bg-emerald-600 shadow-emerald-600/20"}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-black text-base text-slate-900">
                  Ambassador Application Status
                </h3>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border transition-all ${applicationsClosed ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  {applicationsClosed ? "Applications Closed" : "Applications Open"}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-1 max-w-xl">
                {applicationsClosed
                  ? "Applications are currently CLOSED. Public form shows 'Application Closed' and new submissions are blocked."
                  : "Applications are currently OPEN. Candidates can access the form at /ambassador and submit applications."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleToggleApplicationsClosed(!applicationsClosed)}
            disabled={togglingSettings}
            className={`w-full sm:w-auto px-6 py-3 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer shrink-0 ${
              applicationsClosed
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20"
            }`}
          >
            {togglingSettings ? "Updating..." : applicationsClosed ? "Open Applications" : "Close Applications"}
          </button>
        </div>

        {/* KPI Stats */}
        <AmbassadorStats stats={stats} />

        {/* Filter Controls & Search */}
        <AmbassadorFilters
          filters={filters}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            setPage(1);
          }}
          search={search}
          onSearchChange={(newSearch) => {
            setSearch(newSearch);
            setPage(1);
          }}
          onReset={() => {
            setSearch("");
            setFilters({
              status: "",
              university: "",
              city: "",
              usedAptivo: "",
              weeklyAvailability: "",
            });
            setPage(1);
          }}
        />

        {/* Applications Data Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <AmbassadorTable
            applications={applications}
            loading={loading}
            onSelectApplication={(id) => setSelectedApplicationId(id)}
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={(p) => setPage(p)}
          />
        </div>

        {/* Detail Modal */}
        {selectedApplicationId && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8">
              <AmbassadorDetail
                applicationId={selectedApplicationId}
                onClose={() => setSelectedApplicationId(null)}
                onUpdate={() => {
                  fetchStats();
                  fetchApplications();
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
