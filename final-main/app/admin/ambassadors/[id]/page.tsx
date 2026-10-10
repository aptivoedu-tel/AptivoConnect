"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import AmbassadorDetail from "@/components/admin/AmbassadorDetail";

export default function AdminApplicationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link
            href="/admin/ambassadors"
            className="hover:text-teal-600 transition-colors"
          >
            Applications
          </Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-medium">Application Detail</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
          <AmbassadorDetail
            applicationId={id}
            onClose={() => window.history.back()}
            onUpdate={() => {}}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
