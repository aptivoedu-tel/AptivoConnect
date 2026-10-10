"use client";

import React, { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";
import type { StatusType } from "./StatusBadge";

const STATUS_OPTIONS = ["New", "Reviewing", "Shortlisted", "Selected", "Rejected"];

interface Application {
  _id: string;
  name: string;
  email: string;
  whatsapp: string;
  city: string;
  university: string;
  degreeYear: string;
  instagram: string;
  linkedin: string;
  usedAptivo: boolean;
  whyAmbassador: string;
  promotionPlan: string;
  involvedInCommunities: boolean;
  communitiesDetails: string;
  weeklyAvailability: string;
  whySelectMe: string;
  status: StatusType;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

interface AmbassadorDetailProps {
  applicationId: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function AmbassadorDetail({
  applicationId,
  onClose,
  onUpdate,
}: AmbassadorDetailProps) {
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<StatusType>("New");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!applicationId) return;
    setLoading(true);
    setError("");
    fetch(`/api/ambassadors/${applicationId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch application");
        return res.json();
      })
      .then((data) => {
        const app = data.application || data;
        setApplication(app);
        setStatus(app.status || "New");
        setAdminNotes(app.adminNotes || "");
      })
      .catch((err) => {
        console.error("Detail fetch error:", err);
        setError("Could not load application details.");
      })
      .finally(() => setLoading(false));
  }, [applicationId]);

  const handleSave = async () => {
    if (!application) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/ambassadors/${application._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        onUpdate();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500">Loading application…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────
  if (error || !application) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-red-500">{error || "Application not found."}</p>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 underline">
          Close
        </button>
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────────────
  const DetailRow = ({
    label,
    value,
    copyable,
    link,
  }: {
    label: string;
    value?: string;
    copyable?: boolean;
    link?: boolean;
  }) => (
    <div className="flex items-start justify-between py-2.5 gap-4">
      <span className="text-sm text-gray-500 font-medium shrink-0 w-32">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        {link && value ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-teal-600 hover:underline truncate"
          >
            {value}
          </a>
        ) : (
          <span className="text-sm text-gray-900 truncate">{value || "—"}</span>
        )}
        {copyable && value && (
          <button
            onClick={() => copyToClipboard(value, label)}
            className="shrink-0 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy"
          >
            {copied === label ? (
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────
  return (
    <div>
      {/* Modal Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{application.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{application.university} · {application.city}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-0">
          <div className="bg-gray-50/60 rounded-xl border border-gray-100 p-5">
            <Section title="Personal Information">
              <DetailRow label="Name" value={application.name} />
              <DetailRow label="Email" value={application.email} copyable />
              <DetailRow label="WhatsApp" value={application.whatsapp} copyable />
              <DetailRow label="City" value={application.city} />
            </Section>

            <Section title="Education">
              <DetailRow label="University" value={application.university} />
              <DetailRow label="Degree & Year" value={application.degreeYear} />
            </Section>

            <Section title="Social Profiles">
              <DetailRow label="Instagram" value={application.instagram} link />
              <DetailRow label="LinkedIn" value={application.linkedin} link />
            </Section>

            <Section title="Aptivo">
              <DetailRow label="Used Aptivo?" value={application.usedAptivo ? "Yes" : "No"} />
              <div className="py-2.5">
                <span className="text-sm text-gray-500 font-medium block mb-1">Why Ambassador?</span>
                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{application.whyAmbassador}</p>
              </div>
            </Section>

            <Section title="Promotion Plan">
              <div className="py-2.5">
                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{application.promotionPlan}</p>
              </div>
            </Section>

            <Section title="Experience & Communities">
              <DetailRow label="In Communities?" value={application.involvedInCommunities ? "Yes" : "No"} />
              {application.involvedInCommunities && application.communitiesDetails && (
                <div className="py-2.5">
                  <span className="text-sm text-gray-500 font-medium block mb-1">Details</span>
                  <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{application.communitiesDetails}</p>
                </div>
              )}
            </Section>

            <Section title="Availability">
              <DetailRow label="Weekly Hours" value={application.weeklyAvailability} />
            </Section>

            <Section title="Why Select Them?">
              <div className="py-2.5">
                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{application.whySelectMe}</p>
              </div>
            </Section>
          </div>
        </div>

        {/* Sidebar — Admin Controls */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Admin Controls</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="mb-2">
                  <StatusBadge status={application.status} size="md" />
                </div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusType)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this applicant..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all resize-none placeholder-gray-400"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${
                  saving ? "bg-teal-400 text-white cursor-not-allowed"
                  : saveSuccess ? "bg-emerald-600 text-white"
                  : "bg-teal-700 hover:bg-teal-800 text-white"
                }`}
              >
                {saving ? "Saving…" : saveSuccess ? "✓ Saved!" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Timestamps</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Applied</span>
                <span className="text-gray-700">
                  {new Date(application.createdAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-700">
                  {new Date(application.updatedAt || application.createdAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
