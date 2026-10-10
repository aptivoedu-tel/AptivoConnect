'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Building2, Users, Download, RefreshCw, AlertCircle, ChevronRight, GraduationCap, Search, ArrowUpDown, BookOpen, Clock, TrendingUp, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { DashboardService } from '@/lib/services/dashboardService';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip as RechartsTooltip, CartesianGrid, Cell,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from '@/components/ui/Loader';

export default function PerformanceAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [drillLoading, setDrillLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'universities' | 'students' | 'drilldown'>('overview');
    const [stats, setStats] = useState<any>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [drillData, setDrillData] = useState<any>(null);
    const [exporting, setExporting] = useState(false);
    const [duration, setDuration] = useState<'all' | 'today' | '7days' | '30days'>('all');
    const [institutionId, setInstitutionId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<'score' | 'sessions' | 'name'>('score');
    const [selectedUniId, setSelectedUniId] = useState<string>('');
    const [universityList, setUniversityList] = useState<any[]>([]);
    const [showUniMastery, setShowUniMastery] = useState(true);
    const [uniMasteryFilter, setUniMasteryFilter] = useState<string>('');
    const [expandedUni, setExpandedUni] = useState<string>('');
    const [activityData, setActivityData] = useState<any[]>([]);
    const [engagementTimeframe, setEngagementTimeframe] = useState<'week' | 'month' | 'overall'>('week');
    const [activityLoading, setActivityLoading] = useState(false);

    useEffect(() => {
        loadAnalytics();
    }, [duration, selectedUniId]);

    useEffect(() => {
        if (selectedStudentId) {
            handleStudentDrilldown(selectedStudentId);
        }
    }, [selectedStudentId]);

    useEffect(() => {
        if (selectedStudentId && activeTab === 'drilldown') {
            refreshStudyActivity();
        }
    }, [engagementTimeframe]);

    const refreshStudyActivity = async () => {
        if (!selectedStudentId) return;
        setActivityLoading(true);
        try {
            const res = await DashboardService.getStudyActivity(selectedStudentId, engagementTimeframe);
            if (res.data) setActivityData(res.data);
        } catch (error) {
            console.error("Failed to refresh activity:", error);
        } finally {
            setActivityLoading(false);
        }
    };

    const handleStudentDrilldown = async (studentId: string) => {
        setDrillLoading(true);
        try {
            const { startDate } = getDates();
            const [data, activityRes] = await Promise.all([
                AnalyticsService.getStudentDrilldownAnalytics(studentId, startDate),
                DashboardService.getStudyActivity(studentId, engagementTimeframe)
            ]);
            setDrillData(data);
            if (activityRes.data) setActivityData(activityRes.data);
            setActiveTab('drilldown');
        } catch (error) {
            toast.error("Failed to load student deep-dive");
        } finally {
            setDrillLoading(false);
        }
    };

    const formatTime = (hours: number) => {
        const totalMinutes = Math.round(hours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h === 0) return `${m}m`;
        return `${h}h ${m}m`;
    };

    const getDates = () => {
        let startDate: Date | undefined;
        const endDate = new Date();

        if (duration === 'today') {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
        } else if (duration === '7days') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
        } else if (duration === '30days') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
        }

        return { startDate, endDate };
    };

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            // Step 1: get profile (has institution_id if set on User doc)
            const profileRes = await fetch('/api/mongo/profile');
            if (!profileRes.ok) throw new Error("Could not load profile. Please refresh.");

            const profileData = await profileRes.json();
            let currentInstId = institutionId || profileData.data?.institution_id;

            // Step 2: if institution_id not directly on User doc, check InstitutionAdmin link
            if (!currentInstId) {
                const adminLinkRes = await fetch(`/api/mongo/profile?checkAdmin=true`);
                if (adminLinkRes.ok) {
                    const adminLinkData = await adminLinkRes.json();
                    currentInstId = adminLinkData.data?.institution_id;
                }
            }

            if (currentInstId) {
                setInstitutionId(currentInstId);
            } else {
                toast.error("Your account is not linked to an institution. Contact your administrator.");
                setLoading(false);
                return;
            }

            const { startDate } = getDates();
            // Pass the institution_id – API will also resolve it from session as a fallback
            const data = await AnalyticsService.getInstitutionDetailedAnalytics(
                currentInstId,
                startDate,
                selectedUniId || undefined
            );
            setStats(data);
        } catch (error: any) {
            console.error('[Analytics] Load error:', error);
            toast.error(error.message || "Failed to load analytics report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (exporting || !stats) return;
        setExporting(true);

        try {
            const pdf = new jsPDF();
            const pageWidth = pdf.internal.pageSize.getWidth();

            // Header
            pdf.setFillColor(15, 23, 42); // slate-900
            pdf.rect(0, 0, pageWidth, 40, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(22);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Aptivo Institutional Intelligence", 14, 20);

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
            pdf.text(`Duration: ${duration.toUpperCase()} | Students: ${stats.overall.totalStudents}`, 14, 35);

            // University Table
            pdf.setTextColor(15, 23, 42);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Campus Performance Leaderboard", 14, 55);

            autoTable(pdf, {
                startY: 60,
                head: [['#', 'University Name', 'Students', 'Avg Score', 'Sessions']],
                body: (stats.universityStats || []).map((u: any, i: number) => [
                    i + 1,
                    u.name || 'N/A',
                    u.studentCount || 0,
                    `${u.averageScore || 0}%`,
                    u.totalSessions || 0
                ]),
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] },
                styles: { fontSize: 9 }
            });

            // Student Table
            const finalY = (pdf as any).lastAutoTable?.finalY || 100;
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Student Performance Breakdown", 14, finalY + 20);

            autoTable(pdf, {
                startY: finalY + 25,
                head: [['Student Name', 'Avg Score', 'Sessions', 'Status']],
                body: (stats.studentStats || []).map((s: any) => [
                    s.name || 'Unknown',
                    `${s.averageScore || 0}%`,
                    s.totalSessions || 0,
                    s.status || 'Active'
                ]),
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42] },
                styles: { fontSize: 9 }
            });

            pdf.save(`Institutional_Report_${duration}_${new Date().toLocaleDateString()}.pdf`);
            toast.success("Institutional PDF Generated");
        } catch (error: any) {
            console.error("PDF Export Fail:", error);
            toast.error(`PDF Generation Error: ${error.message}`);
        } finally {
            setExporting(false);
        }
    };

    const handleExportStudent = async () => {
        if (exporting || !drillData) return;
        setExporting(true);

        try {
            const pdf = new jsPDF();
            const pageWidth = pdf.internal.pageSize.getWidth();

            // Header
            pdf.setFillColor(79, 70, 229); // indigo-600
            pdf.rect(0, 0, pageWidth, 50, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.text(drillData.student.full_name, 14, 25);

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Individual Performance Report | ${drillData.student.email}`, 14, 35);
            pdf.text(`Duration: ${duration.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, 14, 42);

            // Summary Stats box-like
            pdf.setTextColor(255, 255, 255);
            pdf.text(`Overall Score: ${drillData.stats.averageScore}%`, pageWidth - 60, 25);
            pdf.text(`Total Sessions: ${drillData.stats.totalSessions}`, pageWidth - 60, 32);

            // Subject Mastery Table
            pdf.setTextColor(15, 23, 42);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Subject Mastery Profile", 14, 65);

            autoTable(pdf, {
                startY: 70,
                head: [['Subject', 'Completion/Mastery', 'Attempts']],
                body: (drillData.stats.subjectStats || []).map((s: any) => [
                    s.name,
                    `${s.average}%`,
                    s.count
                ]),
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] }
            });

            // Topic Breakdown
            const finalY = (pdf as any).lastAutoTable?.finalY || 100;
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Granular Topic Intelligence", 14, finalY + 20);

            autoTable(pdf, {
                startY: finalY + 25,
                head: [['Subject', 'Topic', 'Average Score', 'Attempts']],
                body: (drillData.stats.topicStats || []).map((t: any) => [
                    t.subjectName || '-',
                    t.name,
                    `${t.average}%`,
                    t.count
                ]),
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42] }
            });

            pdf.save(`Student_Report_${drillData.student.full_name.replace(' ', '_')}_${new Date().toLocaleDateString()}.pdf`);
            toast.success("Individual Student Report Generated");
        } catch (error: any) {
            console.error("Student PDF Export Fail:", error);
            toast.error("Failed to generate individual report");
        } finally {
            setExporting(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader size="lg" text="Crunching live institutional data..." />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-20" id="institution-report">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-8">
                <div>
                    <h1 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight">Institutional Intelligence</h1>
                    <p className="text-slate-500 text-base lg:text-lg">Performance metrics across all campuses and students.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:gap-3 w-full lg:w-auto">
                    <div className="flex gap-1 p-1 bg-white border border-gray-100 rounded-xl shadow-sm mr-2">
                        {(['all', 'today', '7days', '30days'] as const).map((d) => (
                            <button
                                key={d}
                                onClick={() => setDuration(d)}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${duration === d ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:bg-gray-50'}`}
                            >
                                {d === 'all' ? 'All Time' : d === 'today' ? 'Today' : d === '7days' ? '7D' : '30D'}
                            </button>
                        ))}
                    </div>


                    <button onClick={loadAnalytics} className="flex-none flex items-center justify-center p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                        <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs lg:text-sm"
                    >
                        {exporting ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        <span className="whitespace-nowrap">{exporting ? 'Generating...' : 'Export PDF Intelligence'}</span>
                    </button>
                </div>
            </div>

            {/* View Switcher */}
            <div className="flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full lg:w-fit mb-10 overflow-x-auto no-scrollbar scroll-smooth">
                {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'universities', label: 'By University' },
                    { id: 'students', label: 'By Student' },
                    { id: 'drilldown', label: 'Deep Intelligence' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            flex-1 lg:flex-none whitespace-nowrap px-4 lg:px-8 py-2.5 rounded-xl font-black text-[10px] lg:text-xs uppercase tracking-widest transition-all
                            ${activeTab === tab.id ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-4 opacity-5 lg:group-hover:scale-110 transition-transform hidden lg:block">
                                <Users className="w-24 h-24 text-teal-600" />
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 lg:mb-4">Total Students</h3>
                            <div className="text-3xl lg:text-5xl font-black text-slate-900">{stats?.overall.totalStudents}</div>
                            <div className="text-teal-600 text-[10px] lg:text-xs font-bold mt-2">Across {stats?.overall.totalUniversities} Universities</div>
                        </div>
                        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm group">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 lg:mb-4">Avg Performance</h3>
                            <div className="text-3xl lg:text-5xl font-black text-slate-900">{stats?.overall.averageScore}%</div>
                            <div className="flex items-center gap-1 mt-3 lg:mt-4">
                                <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-teal-500 rounded-full transition-all duration-1000" style={{ width: `${stats?.overall.averageScore}%` }} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 lg:mb-4">Total Sessions</h3>
                            <div className="text-3xl lg:text-5xl font-black text-slate-900">{stats?.overall.totalSessions.toLocaleString()}</div>
                            <p className="text-slate-400 text-[10px] lg:text-xs font-bold mt-2 italic">Completed attempts</p>
                        </div>
                        <div className="bg-teal-600 p-6 lg:p-8 rounded-3xl shadow-xl shadow-teal-100 text-white">
                            <h3 className="text-teal-200 text-[10px] font-black uppercase tracking-widest mb-3 lg:mb-4">Risk Level</h3>
                            <div className="text-base lg:text-lg font-bold mb-1">
                                {stats?.studentStats.filter((s: any) => s.status === 'At Risk').length} Students
                            </div>
                            <p className="text-teal-100 text-[10px] lg:text-xs opacity-80 leading-relaxed font-medium">Scoring below 60% average. Priority support recommended.</p>
                        </div>
                    </div>

                    {/* Top Universities Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Leaderboard */}
                        <div className="bg-white rounded-[2rem] p-8 lg:p-10 border border-gray-100 shadow-sm flex flex-col">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                <h2 className="text-xl lg:text-2xl font-black text-slate-900">Campus Leaderboard</h2>
                                <button onClick={() => setActiveTab('universities')} className="text-teal-600 font-bold text-xs lg:text-sm flex items-center gap-1 hover:gap-2 transition-all">
                                    Detailed Campus Report <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-4 lg:space-y-6 flex-1">
                                {stats?.universityStats.sort((a: any, b: any) => b.averageScore - a.averageScore).slice(0, 3).map((uni: any, idx: number) => (
                                    <div key={uni.id} className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 p-4 lg:p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl lg:hover:scale-[1.01] transition-all border border-transparent hover:border-teal-100">
                                        <div className="flex items-center gap-4 lg:gap-6 flex-1">
                                            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-slate-400 shrink-0">
                                                #{idx + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-slate-900 text-base lg:text-lg truncate">{uni.name}</h4>
                                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{uni.studentCount} active students</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 mt-3 sm:mt-0">
                                            <div className="sm:hidden text-[10px] font-black text-slate-400 uppercase">Avg Score</div>
                                            <div>
                                                <div className="text-xl lg:text-2xl font-black text-teal-600">{uni.averageScore}%</div>
                                                <div className="hidden sm:block text-[10px] font-black text-slate-400 uppercase">Avg Score</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Uni Matrix Radar Graph */}
                        <div className="bg-slate-900 rounded-[2rem] p-8 lg:p-10 border border-slate-800 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-teal-500/20 transition-all duration-1000" />
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex items-center justify-between mb-8 text-white">
                                    <div>
                                        <h3 className="text-xl lg:text-2xl font-black tracking-tight text-white">University Performance Mix</h3>
                                        <p className="text-teal-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Cross-Campus Proficiency Matrix</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                                        <GraduationCap className="w-6 h-6 text-teal-400" />
                                    </div>
                                </div>

                                <div className="flex-1 min-h-[300px] flex items-center justify-center">
                                    {stats?.universityStats.length > 2 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.universityStats}>
                                                <PolarGrid stroke="#334155" />
                                                <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#475569' }} />
                                                <Radar
                                                    name="Mastery"
                                                    dataKey="averageScore"
                                                    stroke="#2dd4bf"
                                                    fill="#2dd4bf"
                                                    fillOpacity={0.5}
                                                />
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                                                    itemStyle={{ color: '#2dd4bf', fontWeight: 900, fontSize: '12px' }}
                                                />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center py-10">
                                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5">
                                                <TrendingUp className="w-10 h-10 text-teal-500/40" />
                                            </div>
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Statistical Radar requires 3+ Universities</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Academic Health Index Table - shown in overview */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h2 className="text-xl lg:text-2xl font-black text-slate-900">Academic Health Index</h2>
                            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> At Risk (&lt;30%)</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400" /> Caution (&lt;60%)</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy (60%+)</span>
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search students..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-teal-500 focus:bg-white rounded-xl outline-none transition-all text-sm font-medium"
                                />
                            </div>
                            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl ml-auto shrink-0">
                                {[
                                    { id: 'score', label: 'Performance' },
                                    { id: 'sessions', label: 'Activity' },
                                    { id: 'name', label: 'A–Z' }
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSortKey(s.id as any)}
                                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${sortKey === s.id ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Student</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Avg Score</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Sessions</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(stats?.studentStats || [])
                                            .filter((s: any) =>
                                                s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                s.email?.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .sort((a: any, b: any) => {
                                                if (sortKey === 'score') return b.averageScore - a.averageScore;
                                                if (sortKey === 'sessions') return b.totalSessions - a.totalSessions;
                                                return a.name?.localeCompare(b.name);
                                            })
                                            .map((student: any) => (
                                                <tr key={student.id} className="border-b border-gray-50 hover:bg-teal-50/20 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${student.averageScore < 30 ? 'bg-red-100 text-red-600' : student.averageScore < 60 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                {student.name?.[0]}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-bold text-slate-900 text-sm truncate">{student.name}</div>
                                                                <div className="text-[9px] text-slate-400">{student.universities?.[0]?.name || 'No Campus'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-black ${student.averageScore < 30 ? 'text-red-600' : student.averageScore < 60 ? 'text-orange-500' : 'text-emerald-600'}`}>
                                                                {student.averageScore}%
                                                            </span>
                                                            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                                                                <div
                                                                    className={`h-full rounded-full ${student.averageScore < 30 ? 'bg-red-500' : student.averageScore < 60 ? 'bg-orange-400' : 'bg-emerald-500'}`}
                                                                    style={{ width: `${student.averageScore}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-600">{student.totalSessions}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${student.status === 'Mastery' ? 'bg-emerald-50 text-emerald-600' : student.status === 'On Track' ? 'bg-teal-50 text-teal-600' : student.status === 'At Risk' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-slate-400'}`}>
                                                            {student.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => { setSelectedStudentId(student.id); setActiveTab('drilldown'); }}
                                                            className="p-1.5 hover:bg-teal-50 text-slate-300 hover:text-teal-600 rounded-lg transition-all"
                                                        >
                                                            <BarChart3 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        {stats?.studentStats.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-16 text-center">
                                                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No students enrolled yet</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Universities */}
            {activeTab === 'universities' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {stats?.universityStats.map((uni: any) => (
                        <div key={uni.id} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all group">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center overflow-hidden border border-teal-100 p-2 group-hover:scale-110 transition-transform">
                                    {uni.logo_url ? (
                                        <img src={uni.logo_url} alt={uni.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <Building2 className="w-8 h-8 text-teal-600" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 leading-tight">{uni.name}</h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter">{uni.studentCount} Students</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-gray-50 p-4 rounded-2xl">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Average</p>
                                    <p className="text-xl font-black text-teal-600">{uni.averageScore}%</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Volume</p>
                                    <p className="text-xl font-black text-slate-900">{uni.totalSessions}</p>
                                </div>
                            </div>

                            <div className="relative pt-6 border-t border-gray-100 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                                <span>{uni.totalQuestions} Questions Solved</span>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" title="Active Campus" />
                            </div>
                        </div>
                    ))}
                    {stats?.universityStats.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No campus data yet</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Students */}
            {activeTab === 'students' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Filter & Sort Bar */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by student name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:border-teal-500 focus:bg-white rounded-2xl outline-none transition-all text-sm font-medium"
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sort By:</span>
                            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                                {[
                                    { id: 'score', label: 'Top Scorers' },
                                    { id: 'sessions', label: 'Most Active' },
                                    { id: 'name', label: 'Alphabetical' }
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSortKey(s.id as any)}
                                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${sortKey === s.id ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Identity</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Academic Health</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Total Volume</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Current Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(stats?.studentStats || [])
                                        .filter((s: any) =>
                                            s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            s.email?.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .sort((a: any, b: any) => {
                                            if (sortKey === 'score') return b.averageScore - a.averageScore;
                                            if (sortKey === 'sessions') return b.totalSessions - a.totalSessions;
                                            return a.name.localeCompare(b.name);
                                        })
                                        .map((student: any) => (
                                            <tr key={student.id} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-black text-sm shrink-0">
                                                            {student.name[0]}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-900 truncate">{student.name}</div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-[10px] font-medium text-slate-400">{student.email}</div>
                                                                <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                                <div className="text-[10px] font-bold text-teal-500 uppercase tracking-tighter">{student.universities?.[0]?.name || 'No Campus'}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 text-lg font-black ${student.averageScore < 30 ? 'text-red-600' : student.averageScore < 60 ? 'text-orange-500' : 'text-emerald-600'}`}>
                                                            {student.averageScore}%
                                                        </div>
                                                        <div className="flex-1 min-w-[100px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ${student.averageScore < 30 ? 'bg-red-500' : student.averageScore < 60 ? 'bg-orange-400' : 'bg-emerald-500'}`}
                                                                style={{ width: `${student.averageScore}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-sm font-bold text-slate-600">{student.totalSessions} Sessions</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${student.status === 'Mastery' ? 'bg-emerald-50 text-emerald-600' :
                                                        student.status === 'On Track' ? 'bg-teal-50 text-teal-600' :
                                                            student.status === 'At Risk' ? 'bg-red-50 text-red-600' :
                                                                'bg-gray-100 text-slate-400'
                                                        }`}>
                                                        {student.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedStudentId(student.id);
                                                            setActiveTab('drilldown');
                                                        }}
                                                        className="p-2 hover:bg-teal-50 text-slate-400 hover:text-teal-600 rounded-lg transition-all"
                                                        title="Deep Intelligence Drill Down"
                                                    >
                                                        <BarChart3 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    {stats?.studentStats.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No students identified in this scope</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Drilldown */}
            {activeTab === 'drilldown' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-6 lg:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                            <div>
                                <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Student Deep Intelligence</h2>
                                <p className="text-slate-500 text-sm font-medium">Granular performance maps and behavioral analytics.</p>
                            </div>
                            <div className="w-full md:min-w-[350px] md:w-auto">
                                <select
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 transition-all outline-none"
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                >
                                    <option value="">Select Student to Probe...</option>
                                    {stats?.studentStats.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.averageScore}%)</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {drillLoading ? (
                            <div className="py-24 flex flex-col items-center">
                                <Loader text="Accessing Neural Core..." />
                            </div>
                        ) : drillData ? (
                            <div className="space-y-12">
                                {/* Student Profile Header */}
                                <div className="flex flex-col lg:flex-row items-center gap-8 p-10 bg-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-teal-500/20 transition-all duration-700" />
                                    <div className="w-24 h-24 bg-teal-500 rounded-3xl flex items-center justify-center text-4xl font-black relative z-10 shrink-0 shadow-lg shadow-teal-500/20">
                                        {drillData.student.full_name[0]}
                                    </div>
                                    <div className="flex-1 relative z-10 text-center lg:text-left">
                                        <h3 className="text-3xl lg:text-4xl font-black mb-1 text-white">{drillData.student.full_name}</h3>
                                        <p className="text-teal-400 font-bold text-lg opacity-90">{drillData.student.email}</p>
                                    </div>
                                    <div className="flex flex-col items-center lg:items-end gap-4 relative z-10">
                                        <div className="text-center lg:text-right">
                                            <div className="text-5xl font-black text-teal-400 leading-none">{drillData.stats.averageScore}%</div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Proficiency Index</p>
                                        </div>
                                        <button
                                            onClick={handleExportStudent}
                                            disabled={exporting}
                                            className="px-6 py-3 bg-teal-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-teal-700 transition-all flex items-center gap-2 shadow-lg active:scale-95"
                                        >
                                            <Download className="w-4 h-4" />
                                            {exporting ? 'Exporting...' : 'Export PDF Report'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Subject Performance - BAR CHART */}
                                    <div className="bg-gray-50/50 rounded-[2rem] p-8 border border-gray-100">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                                <BookOpen className="w-5 h-5 text-teal-600" />
                                                Subject Performance
                                            </h3>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">Comparative View</span>
                                        </div>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={drillData.stats.subjectStats}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis
                                                        dataKey="name"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                                        dy={10}
                                                    />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
                                                    <RechartsTooltip
                                                        cursor={{ fill: '#f1f5f9' }}
                                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Bar dataKey="average" radius={[6, 6, 6, 6]} barSize={35}>
                                                        {drillData.stats.subjectStats.map((entry: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color || '#14b8a6'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* University Mastery - RADAR CHART */}
                                    <div className="bg-gray-50/50 rounded-[2rem] p-8 border border-gray-100 h-full flex flex-col">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                                <GraduationCap className="w-5 h-5 text-teal-600" />
                                                University Mastery
                                            </h3>
                                            <button
                                                onClick={() => setShowUniMastery(v => !v)}
                                                className="text-[10px] font-black uppercase tracking-widest bg-teal-600 text-white px-4 py-1.5 rounded-full hover:bg-teal-700 transition-all shadow-sm active:scale-95"
                                            >
                                                {showUniMastery ? 'Show Less' : 'Show More'}
                                            </button>
                                        </div>
                                        <div className="flex-1 min-h-[200px] flex items-center justify-center opacity-30 pointer-events-none">
                                            {drillData.stats.universityStats.length > 0 ? (
                                                <ResponsiveContainer width="100%" height={200}>
                                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={drillData.stats.universityStats}>
                                                        <PolarGrid stroke="#e2e8f0" />
                                                        <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
                                                        <Radar name="Mastery" dataKey="average" stroke="#0d9488" fill="#0d9488" fillOpacity={0.4} />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="text-center py-10 opacity-40">
                                                    <Building2 className="w-12 h-12 mx-auto mb-3" />
                                                    <p className="text-xs font-bold uppercase tracking-widest">No target university data</p>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Click Show More for detailed breakdown</p>
                                    </div>

                                    {/* Expanded University Mastery Panel */}
                                    {showUniMastery && drillData.stats.universityStats.length > 0 && (
                                        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-teal-100 shadow-lg p-8 animate-in fade-in slide-in-from-top-4 duration-300">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                                    <GraduationCap className="w-6 h-6 text-teal-600" />
                                                    University Mastery — Detailed View
                                                </h3>
                                                <button onClick={() => setShowUniMastery(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                                                    <span className="text-[10px] font-black uppercase tracking-widest">✕ Close</span>
                                                </button>
                                            </div>
                                            <div className="flex flex-col lg:flex-row gap-8">
                                                {/* Sidebar - University List (Navigation) */}
                                                <div className="lg:w-64 shrink-0 space-y-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Select University</p>

                                                    <button
                                                        onClick={() => setExpandedUni('')}
                                                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border ${expandedUni === ''
                                                                ? 'bg-slate-900 text-white shadow-lg border-slate-900'
                                                                : 'bg-gray-50 text-slate-700 hover:bg-gray-100 border-gray-100'
                                                            }`}
                                                    >
                                                        Overall Overview
                                                    </button>

                                                    {drillData.stats.universityStats.map((u: any) => (
                                                        <button
                                                            key={u.name}
                                                            onClick={() => setExpandedUni(u.name)}
                                                            className={`w-full text-left px-4 py-3 rounded-xl text-xs transition-all border ${expandedUni === u.name
                                                                    ? 'bg-teal-600 text-white shadow-lg border-teal-600'
                                                                    : 'bg-gray-50 text-slate-700 hover:bg-gray-100 border-gray-100'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-black truncate">{u.name}</span>
                                                                <span className={`ml-2 text-[10px] font-black shrink-0 px-2 py-0.5 rounded-full ${expandedUni === u.name ? 'bg-teal-500/30 text-teal-100' : 'bg-gray-200 text-slate-500'}`}>
                                                                    {u.preparationScore ?? u.average}%
                                                                </span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Right Side - Dynamic Content Area */}
                                                <div className="flex-1 min-h-[460px] bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                                                    {expandedUni === '' ? (
                                                        <>
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 text-center">Preparation Overview (All Universities)</p>
                                                            <div className="flex-1 flex items-center justify-center">
                                                                <ResponsiveContainer width="100%" height={400}>
                                                                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={drillData.stats.universityStats}>
                                                                        <PolarGrid stroke="#e2e8f0" />
                                                                        <PolarAngleAxis dataKey="name" tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }} />
                                                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(v) => `${v}%`} />
                                                                        <Radar name="Preparation" dataKey="average" stroke="#0d9488" fill="#0d9488" fillOpacity={0.5} />
                                                                        <RechartsTooltip
                                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)', fontSize: '11px' }}
                                                                            formatter={(v: any, _: any, props: any) => {
                                                                                const p = props?.payload;
                                                                                return [
                                                                                    `${p?.preparationScore ?? v}% prep · ${p?.hasTestData ? `${p.testAccuracy}% accuracy` : 'no tests'} · ${p?.completedModules ?? 0}/${p?.totalModules ?? 0} modules`,
                                                                                    p?.name ?? 'University'
                                                                                ];
                                                                            }}
                                                                        />
                                                                    </RadarChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        (() => {
                                                            const uInfo = drillData.stats.universityStats.find((u: any) => u.name === expandedUni);
                                                            if (!uInfo) return null;

                                                            return (
                                                                <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                                                                    <div className="flex items-start justify-between mb-8">
                                                                        <div>
                                                                            <h4 className="text-xl font-black text-slate-900">{uInfo.name}</h4>
                                                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Detailed Analysis</p>
                                                                        </div>
                                                                        <div className="bg-teal-50 border border-teal-100 text-teal-700 px-5 py-2 rounded-2xl text-center shadow-sm">
                                                                            <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-0.5">Total Prep</div>
                                                                            <div className="text-2xl font-black">{uInfo.preparationScore ?? uInfo.average}%</div>
                                                                        </div>
                                                                    </div>

                                                                    {/* 3 Metric Cards */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                                            <div className="flex justify-between items-end mb-3">
                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Test Accuracy</span>
                                                                                <span className={`text-base font-black ${uInfo.hasTestData ? 'text-blue-600' : 'text-slate-300'}`}>
                                                                                    {uInfo.hasTestData ? `${uInfo.testAccuracy}%` : 'N/A'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden mb-2 relative">
                                                                                <div className="absolute inset-y-0 left-0 bg-blue-400 rounded-full transition-all" style={{ width: `${uInfo.testAccuracy ?? 0}%` }} />
                                                                            </div>
                                                                            <p className="text-[9px] font-bold text-slate-400">
                                                                                {uInfo.hasTestData ? `${uInfo.totalCorrect} correct / ${uInfo.totalQuestions} questions` : 'Requires practice sessions'}
                                                                            </p>
                                                                        </div>

                                                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                                            <div className="flex justify-between items-end mb-3">
                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syllabus Completion</span>
                                                                                <span className="text-base font-black text-purple-600">
                                                                                    {uInfo.moduleCompletionRate ?? 0}%
                                                                                </span>
                                                                            </div>
                                                                            <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden mb-2 relative">
                                                                                <div className="absolute inset-y-0 left-0 bg-purple-400 rounded-full transition-all" style={{ width: `${uInfo.moduleCompletionRate ?? 0}%` }} />
                                                                            </div>
                                                                            <p className="text-[9px] font-bold text-slate-400">
                                                                                {uInfo.completedModules ?? 0} of {uInfo.totalModules ?? 0} modules read/practiced
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Subject Breakdown Chart */}
                                                                    <div className="flex-1 flex flex-col min-h-[220px]">
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Subject Preparation Breakdown</p>

                                                                        {uInfo.subjectScores?.length > 0 ? (
                                                                            <ResponsiveContainer width="100%" height="100%">
                                                                                <BarChart data={uInfo.subjectScores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
                                                                                    <RechartsTooltip
                                                                                        cursor={{ fill: '#f8fafc' }}
                                                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                                                                                        formatter={(val: number) => [`${val}%`, 'Preparation']}
                                                                                    />
                                                                                    <Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                                                                        {uInfo.subjectScores.map((entry: any, index: number) => (
                                                                                            <Cell key={`cell-${index}`} fill={entry.color || '#0d9488'} />
                                                                                        ))}
                                                                                    </Bar>
                                                                                </BarChart>
                                                                            </ResponsiveContainer>
                                                                        ) : (
                                                                            <div className="flex-1 flex items-center justify-center flex-col text-slate-300">
                                                                                <TrendingUp className="w-10 h-10 mb-2 opacity-50" />
                                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-center mt-2 max-w-xs">No subject data available. Complete practice sessions to see detailed scores.</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Engagement Chart */}
                                    <div className="lg:col-span-2 bg-gray-50/50 rounded-[2rem] p-8 border border-gray-100">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-teal-600" />
                                                Study Engagement
                                            </h3>
                                            <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                                                {(['week', 'month', 'overall'] as const).map((p) => (
                                                    <button
                                                        key={p}
                                                        onClick={() => setEngagementTimeframe(p)}
                                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${engagementTimeframe === p
                                                            ? 'bg-slate-900 text-white shadow-md'
                                                            : 'text-slate-400 hover:text-slate-600 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {p === 'week' ? '7 Days' : p === 'month' ? 'Month' : 'Overall'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={`h-48 transition-opacity duration-300 ${activityLoading ? 'opacity-40' : 'opacity-100'}`}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={activityData.length > 0 ? activityData : [{ name: '...', hours: 0 }]}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(val) => `${val}h`} />
                                                    <RechartsTooltip
                                                        cursor={{ fill: '#f1f5f9' }}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                        formatter={(value: number) => [formatTime(value), 'Time Spent']}
                                                    />
                                                    <Bar dataKey="hours" fill="#0d9488" radius={[4, 4, 4, 4]} barSize={25} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Granular Topic Breakdown */}
                                <div>
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                                                <TrendingUp className="w-6 h-6 text-teal-600" />
                                                Topic Intelligence
                                            </h3>
                                            <p className="text-slate-400 text-xs font-medium">Granular performance for every subtopic.</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {drillData.stats.topicStats.map((t: any) => (
                                            <div key={t.name} className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-teal-100 hover:shadow-xl hover:shadow-teal-900/5 transition-all group">
                                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1 group-hover:text-teal-600 transition-colors">{t.subjectName}</p>
                                                <h4 className="font-bold text-slate-900 mb-4 line-clamp-1 group-hover:text-teal-900 transition-colors">{t.name}</h4>
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <div className="text-2xl font-black text-slate-900">{t.average}%</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t.count} Attempts</div>
                                                    </div>
                                                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm ${t.average >= 75 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : t.average >= 50 ? 'bg-teal-50 text-teal-600 border border-teal-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                        {t.average >= 75 ? 'Mastery' : t.average >= 50 ? 'Steady' : 'At Risk'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {drillData.stats.topicStats.length === 0 && (
                                            <div className="col-span-full py-16 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Awaiting student activity on specific topics</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-32 text-center rounded-[2rem] border-2 border-dashed border-gray-100 bg-gray-50/30">
                                <Activity className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                                <h3 className="text-lg font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Deep Drilldown Selection</h3>
                                <p className="text-slate-400 font-medium max-w-sm mx-auto">Please select a student from the dropdown above to load their neural proficiency profile.</p>
                            </div>
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
}
