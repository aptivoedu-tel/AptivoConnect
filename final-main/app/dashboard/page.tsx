'use client';

import React, { useEffect, useState } from 'react';
import {
    BookOpen, Trophy, Flame, TrendingUp,
    MapPin, Play, ChevronRight, Zap, RefreshCw,
    CheckCircle2, Clock, Book, Brain, Info, Search,
    Target as TargetIcon, ArrowRight, ClipboardList,
    Sparkles, ArrowUpRight, Award, Compass, BarChart3
} from 'lucide-react';
import {
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    Tooltip
} from 'recharts';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
import { AuthService } from '@/lib/services/authService';

import {
    DashboardService,
    StudentStats,
    PerformanceData,
    ProgressData,
    ContinueLearningItem
} from '@/lib/services/dashboardService';
import { useUI } from '@/lib/context/UIContext';
import { getTimeGreeting } from '@/lib/utils';
import StudentPageSkeleton from '@/components/ui/StudentPageSkeleton';

export default function StudentDashboard() {
    const { isSidebarCollapsed } = useUI();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<StudentStats>({
        totalXP: 0,
        questionsSolved: 0,
        currentStreak: 0,
        overallAccuracy: 0,
        totalStudyTime: 0
    });
    const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
    const [progressData, setProgressData] = useState<ProgressData[]>([]);
    const [continueLearning, setContinueLearning] = useState<ContinueLearningItem[]>([]);
    const [recommended, setRecommended] = useState<any>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [rankData, setRankData] = useState<any>({ rank: '--', total: 0 });

    useEffect(() => {
        const loadDashboard = async () => {
            const currentUser = AuthService.getCurrentUser();
            const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;

            let activeUser = currentUser;
            if (currentUser) {
                activeUser = currentUser;
            } else if (storedUser) {
                activeUser = JSON.parse(storedUser);
            } else {
                window.location.href = '/login';
                return;
            }

            setUser(activeUser);
            setLoading(false);

            if (activeUser && activeUser.id) {
                try {
                    const summary = await DashboardService.getDashboardSummary(activeUser.id);

                    if (summary.stats) setStats(summary.stats);
                    if (summary.performance) setPerformanceData(summary.performance);
                    if (summary.continueLearning) setContinueLearning(summary.continueLearning);
                    if (summary.recommended) setRecommended(summary.recommended);
                    if (summary.rankData) setRankData(summary.rankData);

                } catch (error) {
                    console.error("Failed to load dashboard data", error);
                } finally {
                    setDataLoading(false);
                }
            }
        };

        loadDashboard();
    }, []);

    if (loading) return <StudentPageSkeleton isSidebarCollapsed={isSidebarCollapsed} />;

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m} min`;
    };

    const getGreetingEmoji = () => {
        const greeting = getTimeGreeting();
        if (greeting === 'Good Morning') return '🌅';
        if (greeting === 'Good Afternoon') return '☀️';
        if (greeting === 'Good Evening') return '🌆';
        return '🌙';
    };

    return (
        <div className="min-h-screen bg-slate-100/60 flex font-sans selection:bg-teal-100 selection:text-teal-900">
            {/* Sidebar Navigation */}
            <Sidebar userRole="student" />

            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                {/* Global App Header */}
                <Header userName={user?.full_name || 'Student'} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="p-4 sm:p-6 lg:p-8 mt-24 lg:mt-20 overflow-x-hidden flex-1">
                    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

                        {/* ── 1. Welcome & Momentum Banner ── */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            {/* Decorative background glow */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-70 pointer-events-none" />

                            <div className="flex items-center gap-5 relative z-10">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 border border-slate-200/80 rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-3xl shadow-inner shrink-0">
                                    {getGreetingEmoji()}
                                </div>
                                <div className="space-y-1">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-[10px] font-black uppercase tracking-widest">
                                        <Sparkles className="w-3 h-3 text-teal-600 fill-teal-600" />
                                        <span>Student Overview</span>
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                                        {getTimeGreeting()}, {user?.full_name?.split(' ')[0] || 'Student'}! 👋
                                    </h1>
                                    <p className="text-slate-600 font-medium text-xs sm:text-sm">
                                        You're on a <span className="text-teal-700 font-black">{stats.currentStreak}-day streak</span>. Complete today's target to maintain momentum!
                                    </p>
                                </div>
                            </div>

                            {/* Quick Shortcuts */}
                            <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto">
                                <Link
                                    href="/university"
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-teal-600/20 active:scale-95 cursor-pointer"
                                >
                                    <span>Curriculum</span>
                                    <Compass className="w-4 h-4" />
                                </Link>
                                <Link
                                    href="/test-sections"
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                                >
                                    <span>Exams</span>
                                    <ArrowUpRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>

                        {/* ── 2. Top 4 Stat Cards ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {[
                                {
                                    label: 'Total XP Earned',
                                    value: stats.totalXP.toLocaleString(),
                                    subtext: 'Platform score',
                                    icon: Zap,
                                    color: 'bg-teal-50 text-teal-700 border-teal-200/80',
                                    trend: 'Active'
                                },
                                {
                                    label: 'Portal Rank',
                                    value: `#${rankData.rank}`,
                                    subtext: `Out of ${rankData.total || 'all'} students`,
                                    icon: Trophy,
                                    color: 'bg-amber-50 text-amber-700 border-amber-200/80',
                                    trend: 'Top Tier'
                                },
                                {
                                    label: 'Active Streak',
                                    value: `${stats.currentStreak} Days`,
                                    subtext: 'Daily consistency',
                                    icon: Flame,
                                    color: 'bg-orange-50 text-orange-700 border-orange-200/80',
                                    trend: '🔥 On Fire'
                                },
                                {
                                    label: 'Overall Accuracy',
                                    value: `${stats.overallAccuracy}%`,
                                    subtext: `${stats.questionsSolved} questions solved`,
                                    icon: TrendingUp,
                                    color: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
                                    trend: stats.overallAccuracy >= 75 ? 'Great' : 'Improving'
                                }
                            ].map((stat, i) => (
                                <div
                                    key={i}
                                    className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30 flex flex-col justify-between gap-4 hover:border-teal-300 hover:shadow-2xl hover:-translate-y-0.5 transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className={`w-12 h-12 rounded-2xl ${stat.color} border flex items-center justify-center shadow-xs transition-transform group-hover:scale-105`}>
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500">
                                            {stat.trend}
                                        </span>
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                            {dataLoading ? '...' : stat.value}
                                        </h3>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                        <p className="text-[11px] font-medium text-slate-500 pt-0.5">{stat.subtext}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── 3. Smart Recommendation Action Banner ── */}
                        {(recommended || (continueLearning.length > 0)) && (
                            <div className="bg-gradient-to-br from-teal-600 via-teal-700 to-[#042f2e] rounded-3xl p-7 sm:p-10 text-white relative overflow-hidden shadow-xl shadow-teal-900/15">
                                {/* Ambient radial lighting */}
                                <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute left-0 bottom-0 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

                                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    <div className="space-y-2 max-w-2xl">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest text-teal-100">
                                            <TargetIcon className="w-3.5 h-3.5 text-emerald-300" />
                                            <span>Smart Practice Focus</span>
                                        </div>
                                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
                                            {recommended ? `Master ${recommended.subtopics?.name || 'Your Target Topic'}?` : `Pick up where you left off in ${continueLearning[0]?.title || 'Practice'}`}
                                        </h2>
                                        <p className="text-teal-100/90 text-xs sm:text-sm font-medium leading-relaxed">
                                            Based on your recent diagnostic data, a targeted practice session will reinforce key formulas and accelerate your pass probability.
                                        </p>
                                    </div>
                                    <Link
                                        href="/university"
                                        className="inline-flex items-center gap-2 px-7 py-4 bg-white text-teal-800 hover:bg-teal-50 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-teal-950/20 active:scale-95 shrink-0 cursor-pointer"
                                    >
                                        <span>Start Practice</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* ── 4. Institutional Assignments (Shown if enrolled) ── */}
                        {user?.institution_id && (
                            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-teal-50 border border-teal-200/80 rounded-2xl flex items-center justify-center text-teal-700 shrink-0">
                                        <ClipboardList className="w-7 h-7" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-full inline-block">
                                            Institutional Tasks
                                        </span>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Assigned Homework &amp; Tests</h3>
                                        <p className="text-xs text-slate-500 font-medium">Complete required curriculum tasks assigned by your academy or college faculty.</p>
                                    </div>
                                </div>
                                <Link
                                    href="/dashboard/tasks"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#042f2e] hover:bg-teal-900 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                                >
                                    <span>View Assignments</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                                </Link>
                            </div>
                        )}

                        {/* ── 5. Main 2-Column Performance & Practice Grid ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                            {/* Left Column: Continue Learning Track */}
                            <div className="lg:col-span-7 space-y-6">
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/30 space-y-6">
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700">
                                                <BookOpen className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Continue Learning</h2>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Recent syllabus chapters</p>
                                            </div>
                                        </div>
                                        <Link href="/university" className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors">
                                            View All →
                                        </Link>
                                    </div>

                                    <div className="space-y-3">
                                        {continueLearning.length > 0 ? (
                                            continueLearning.map((item, i) => (
                                                <Link
                                                    key={i}
                                                    href="/university"
                                                    className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-teal-300 hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:bg-teal-50 group-hover:border-teal-200 transition-colors shrink-0">
                                                            <BookOpen className="w-4 h-4 text-teal-600" />
                                                        </div>
                                                        <div className="min-w-0 space-y-1.5">
                                                            <p className="text-sm font-black text-slate-800 tracking-tight truncate group-hover:text-teal-700 transition-colors">
                                                                {item.title}
                                                            </p>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-28 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-700"
                                                                        style={{ width: `${item.progress}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                    {item.progress}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3 px-4">
                                                <Book className="w-10 h-10 text-slate-300 mx-auto" />
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No active practice session</p>
                                                <Link
                                                    href="/university"
                                                    className="inline-block px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20"
                                                >
                                                    Browse Curriculum
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Performance Status Radar & Metrics */}
                            <div className="lg:col-span-5 space-y-6">
                                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/30 space-y-6">
                                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
                                                <BarChart3 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Performance Radar</h2>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Subject mastery map</p>
                                            </div>
                                        </div>
                                        <Link
                                            href="/dashboard/analytics"
                                            className="text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
                                        >
                                            Deep Dive →
                                        </Link>
                                    </div>

                                    {/* Radar Chart */}
                                    <div className="h-[240px] w-full">
                                        {dataLoading ? (
                                            <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                                                Loading Analytics...
                                            </div>
                                        ) : performanceData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={performanceData}>
                                                    <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                                                    <PolarAngleAxis
                                                        dataKey="subject"
                                                        tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }}
                                                    />
                                                    <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                                                    <Radar
                                                        name="Performance"
                                                        dataKey="score"
                                                        stroke="#0d9488"
                                                        strokeWidth={2}
                                                        fill="#0d9488"
                                                        fillOpacity={0.25}
                                                    />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                                                <Brain className="w-10 h-10" />
                                                <p className="text-xs font-black uppercase tracking-widest text-center px-4">
                                                    Solve more questions to build your radar map
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Breakdown Statistics */}
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Questions Attempted</span>
                                            <span className="text-base font-black text-slate-900">{stats.questionsSolved}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-teal-50/60 border border-teal-100">
                                            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Correct Answers</span>
                                            <span className="text-base font-black text-teal-700">
                                                {Math.round((stats.questionsSolved * stats.overallAccuracy) / 100)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Practice Time</span>
                                            <span className="text-base font-black text-slate-900">{formatTime(stats.totalStudyTime)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Footer Component */}
                        <Footer />
                    </div>
                </main>
            </div>
        </div>
    );
}
