'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    BarChart2, TrendingUp, BookOpen, Clock,
    Award, CheckCircle2, ChevronRight, ArrowLeft,
    GraduationCap, Building2
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip, CartesianGrid, Cell, PieChart, Pie,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
import { useUI } from '@/lib/context/UIContext';
import { useLoading } from '@/lib/context/LoadingContext';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { DashboardService } from '@/lib/services/dashboardService';
import Link from 'next/link';
import { toast } from 'sonner';

function StudentAnalyticsContent() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get('id');
    const { setLoading } = useLoading();

    const [data, setData] = useState<any>(null);
    const [activityData, setActivityData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!studentId) {
            setError("No student ID provided");
            return;
        }

        const fetchAnalytics = async () => {
            setLoading(true, 'Extracting performance deep-dive...');
            try {
                const [drilldownRes, activityRes] = await Promise.all([
                    AnalyticsService.getStudentDrilldownAnalytics(studentId),
                    DashboardService.getStudyActivity(studentId, 'week')
                ]);
                setData(drilldownRes);
                if (activityRes.data) setActivityData(activityRes.data);
            } catch (err: any) {
                console.error("Analytics Error:", err);
                setError("Failed to load analytics data");
                toast.error("Database connection error");
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [studentId]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="bg-red-50 p-8 rounded-3xl border border-red-100 text-center max-w-md">
                    <BarChart2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Analysis Failed</h2>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <Link href="/institution-admin/students" className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all">
                        <ArrowLeft className="w-4 h-4" /> Return to Students
                    </Link>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { student, stats } = data;

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <Link
                        href="/institution-admin/students"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:underline mb-2 uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Students
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {student.full_name}'s Analysis
                    </h1>
                    <p className="text-slate-500 font-medium">{student.email}</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm text-center min-w-[120px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Avg Score</p>
                        <p className="text-2xl font-black text-teal-600">{stats.averageScore}%</p>
                    </div>
                    <div className="bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm text-center min-w-[120px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Sessions</p>
                        <p className="text-2xl font-black text-slate-900">{stats.totalSessions}</p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.universityStats.filter((u: any) => u.average > 0).length > 0 ?
                    stats.universityStats.filter((u: any) => u.average > 0).map((uni: any, idx: number) => (
                        <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 mb-4">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 truncate">{uni.name}</p>
                            <p className="text-xl font-black text-slate-800">{uni.average}% <span className="text-xs font-bold text-slate-400 ml-1">Avg</span></p>
                        </div>
                    )) : (
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm col-span-1 md:col-span-2">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Main Progress</p>
                                    <p className="text-xl font-black text-slate-800">{stats.averageScore}% <span className="text-xs font-bold text-slate-400 ml-1">Overall Mastery</span></p>
                                </div>
                            </div>
                        </div>
                    )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Subject Performance */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all h-fit">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Subject Performance</h3>
                            <p className="text-xs text-slate-400 font-medium">Breakdown of mastery across domains</p>
                        </div>
                        <BookOpen className="w-5 h-5 text-teal-600" />
                    </div>

                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.subjectStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        padding: '12px'
                                    }}
                                />
                                <Bar dataKey="average" radius={[8, 8, 8, 8]} barSize={40}>
                                    {stats.subjectStats.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color || '#14b8a6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* University Performance Graph */}
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all h-fit">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">University Mastery</h3>
                            <p className="text-xs text-slate-400 font-medium">Comparison across academic contexts</p>
                        </div>
                        <GraduationCap className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="h-80 flex items-center justify-center">
                        {stats.universityStats.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.universityStats}>
                                    <PolarGrid stroke="#f1f5f9" />
                                    <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                    <Radar
                                        name="Mastery"
                                        dataKey="average"
                                        stroke="#0d9488"
                                        fill="#0d9488"
                                        fillOpacity={0.6}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center">
                                <Building2 className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                <p className="text-slate-400 text-sm italic">Not enough university data</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Study Activity */}
                <div className="lg:col-span-3 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Study Engagement</h3>
                            <p className="text-xs text-slate-400 font-medium">Hours spent practicing per day</p>
                        </div>
                        <Clock className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activityData.length > 0 ? activityData : [{ name: '...', hours: 0 }]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    tickFormatter={(val) => `${val}h`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="hours" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Topic Breakdown List */}
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Weak Areas</h3>
                            <p className="text-xs text-slate-400 font-medium">Attention needed topics</p>
                        </div>
                        <TrendingUp className="w-5 h-5 text-teal-600" />
                    </div>

                    <div className="space-y-4">
                        {stats.topicStats.sort((a: any, b: any) => a.average - b.average).slice(0, 6).map((topic: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-teal-100 hover:bg-teal-50/30 transition-all group">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{topic.subjectName}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${topic.average < 50 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {topic.average}% Score
                                    </span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-700 truncate mb-2">{topic.name}</h4>
                                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${topic.average < 50 ? 'bg-red-500' : 'bg-amber-500'}`}
                                        style={{ width: `${topic.average}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {stats.topicStats.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-slate-400 text-sm italic">No practice data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="mt-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50">
                    <h3 className="text-xl font-bold text-slate-900">Performance Matrix</h3>
                    <p className="text-sm text-slate-500">Every topic session attempt data</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="text-left py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Topic</th>
                                <th className="text-left py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</th>
                                <th className="text-left py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Attempts</th>
                                <th className="text-right py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mastery</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {stats.topicStats.map((topic: any, idx: number) => (
                                <tr key={idx} className="hover:bg-teal-50/20 transition-colors">
                                    <td className="py-4 px-8">
                                        <p className="text-sm font-bold text-slate-800">{topic.name}</p>
                                    </td>
                                    <td className="py-4 px-8">
                                        <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">{topic.subjectName}</span>
                                    </td>
                                    <td className="py-4 px-8 text-center">
                                        <span className="text-sm font-bold text-slate-700">{topic.count}</span>
                                    </td>
                                    <td className="py-4 px-8 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${topic.average >= 80 ? 'bg-emerald-500' : topic.average >= 50 ? 'bg-teal-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${topic.average}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-black text-slate-900 w-10">{topic.average}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default function StudentAnalyticsPage() {
    const { isSidebarCollapsed } = useUI();

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="institution_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header />
                <main className="flex-1 pt-32 lg:pt-28 pb-12 px-4 sm:px-8">
                    <Suspense fallback={
                        <div className="flex items-center justify-center min-h-[60vh]">
                            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    }>
                        <StudentAnalyticsContent />
                    </Suspense>
                </main>
                <Footer />
            </div>
        </div>
    );
}
