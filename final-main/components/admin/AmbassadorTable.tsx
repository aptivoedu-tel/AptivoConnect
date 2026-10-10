"use client";

import React from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import type { StatusType } from "./StatusBadge";

interface Application {
  _id: string;
  name: string;
  email: string;
  whatsapp: string;
  university: string;
  degreeYear: string;
  city: string;
  usedAptivo: boolean;
  weeklyAvailability: string;
  status: StatusType;
  createdAt: string;
}

interface AmbassadorTableProps {
  applications: Application[];
  loading?: boolean;
  onSelectApplication?: (id: string) => void;
  page?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
}

export default function AmbassadorTable({
  applications,
  loading,
  onSelectApplication,
  page = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
}: AmbassadorTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-8 text-center text-gray-400">
          <div className="animate-spin w-6 h-6 border-2 border-aptivo-600 border-t-transparent rounded-full mx-auto mb-3" />
          Loading applications...
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-gray-900 font-medium mb-1">
          No applications yet.
        </h3>
        <p className="text-sm text-gray-500">
          Applications will appear here once students start applying.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Name
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                University
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                City
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Degree/Year
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Aptivo
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Availability
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Applied
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {applications.map((app) => (
              <tr
                key={app._id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{app.name}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{app.university}</td>
                <td className="px-4 py-3 text-gray-600">{app.city}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {app.degreeYear}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {app.email}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium ${
                      app.usedAptivo ? "text-emerald-600" : "text-gray-400"
                    }`}
                  >
                    {app.usedAptivo ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {app.weeklyAvailability}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(app.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onSelectApplication?.(app._id)}
                    className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition-all cursor-pointer border border-teal-200/60"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-gray-100">
        {applications.map((app) => (
          <div key={app._id} onClick={() => onSelectApplication?.(app._id)}
            className="block p-4 hover:bg-gray-50/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-medium text-gray-900">{app.name}</div>
                <div className="text-xs text-gray-500">{app.email}</div>
              </div>
              <StatusBadge status={app.status} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>{app.university}</span>
              <span>{app.city}</span>
              <span>
                {new Date(app.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
