'use client';

import React, { useState, useEffect } from 'react';
import { Target as TargetIcon, Search, ArrowUpRight, GraduationCap, Building2, BarChart2, Zap, Users, BookOpen, Activity, TrendingUp } from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { AuthService } from '@/lib/services/authService';
import { useLoading } from '@/lib/context/LoadingContext';
import { useUI } from '@/lib/context/UIContext';

export default function UniversityAnalyticsPage() {
    const { setLoading, isLoading } = useLoading();
    const { isSidebarCollapsed } = useUI();
    const [user, setUser] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    
    // Chart States
    const [enrollmentData, setEnrollmentData] = useState<any[]>([]);
    const [subjectData, setSubjectData] = useState<any[]>([]);
    const [readinessData, setReadinessData] = useState<any[]>([]);
    const [topUnis, setTopUnis] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');
    
    // Subject Color Mapping System for consistent visual identity
    const SUBJECT_COLORS: Record<string, string> = {
        'English': "#6366F1", // Indigo
        'Mathematics': "#F59E0B", // Amber
        'Physics': "#14B8A6", // Teal
        'Chemistry': "#3B82F6", // Blue
        'IQ': "#EC4899", // Pink
        'Biology': "#10B981", // Emerald
        'Computer': "#8B5CF6", // Violet
        'Pak Studies': "#06B6D4", // Cyan
        'General': "#E5E7EB", // Gray
    };

    // Alternating fallback colors (Cool -> Warm -> Cool -> Warm)
    const FALLBACK_COLORS = [
        '#8B5CF6', '#F97316', '#3B82F6', '#EF4444', '#06B6D4', '#F59E0B'
    ];
    
    // Resolve color for a specific subject
    const getSubjectColor = (subjectName: string, index: number) => {
        // Try strict match or partial match (e.g. contains 'Math')
        const matchedKey = Object.keys(SUBJECT_COLORS).find(key => 
            subjectName.toLowerCase().includes(key.toLowerCase())
        );
        if (matchedKey) return SUBJECT_COLORS[matchedKey];
        return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
    };

    useEffect(() => {
        loadData();
    }, [dateRange]);

    const loadData = async () => {
        setLoading(true, 'Analyzing University Ecosystem...');
        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);
        if (activeUser) setUser(activeUser);
        const days = dateRange;
        try {
            const [leadRes, chartsRes] = await Promise.all([
                AnalyticsService.getUniversityLeaderboard(days),
                AnalyticsService.getUniversityCharts(days)
            ]);
            
            if (leadRes.leaderboard) setLeaderboard(leadRes.leaderboard);
            if (chartsRes) {
                if (chartsRes.enrollmentChart) setEnrollmentData(chartsRes.enrollmentChart);
                if (chartsRes.subjectChart) setSubjectData(chartsRes.subjectChart);
                if (chartsRes.readinessChart) setReadinessData(chartsRes.readinessChart);
                if (chartsRes.topUnis) setTopUnis(chartsRes.topUnis);
            }
        } catch (error) {
            console.error("Error fetching university analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex bg-[#F8FAFC] min-h-screen">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />
                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8"><div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
                            <div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
                                <h1 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                    <Building2 className="w-8 h-8 text-emerald-600" />
                                    University Analytics
                                </h1>
                                <p className="text-slate-500 font-medium">Evaluate the performance and engagement pipeline across all connected institutions.</p>
                            </div>
                            {/* Date Range Filter */}
                            <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm">
                                {([['7', '7D'], ['30', '30D'], ['90', '90D'], ['all', 'All']] as const).map(([val, label]) => (
                                    <button
                                        key={val}
                                        onClick={() => setDateRange(val)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                            dateRange === val
                                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                                                : 'text-slate-400 hover:text-slate-700'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Snapshot Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-4 group hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Active Universities</p>
                                <p className="text-2xl font-black text-slate-800">{leaderboard.length}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-4 group hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Total Sessions</p>
                                <p className="text-2xl font-black text-slate-800">{leaderboard.reduce((a,b)=>a+b.total_sessions,0).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-4 group hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <BarChart2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Avg Platform Score</p>
                                <p className="text-2xl font-black text-slate-800">
                                    {leaderboard.length ? Math.round(leaderboard.reduce((a,b)=>a+b.average_score,0)/leaderboard.length) : 0}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Student Enrollment Distribution */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[400px]">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-600" />
                                Student Enrollment Distribution
                            </h3>
                            <div className="flex-1 w-full relative">
                                {enrollmentData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={enrollmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickMargin={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                                            <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'}} />
                                            <Bar dataKey="students" fill="#14B8A6" radius={[6, 6, 0, 0]} maxBarSize={40} activeBar={{ fill: '#0F766E' }} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium text-sm">No data available</div>
                                )}
                            </div>
                        </div>

                        {/* Subject Focus Distribution */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[400px]">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-amber-500" />
                                Global Subject Focus
                            </h3>
                            <div className="flex-1 w-full relative">
                                {subjectData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={subjectData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={120}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {subjectData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={getSubjectColor(entry.name, index)} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'}} />
                                            <Legend iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 600, color: '#64748b'}} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium text-sm">No data available</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Exam Readiness Line Chart — full width */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" />
                                Top University Exam Readiness
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded-full uppercase tracking-widest font-black ml-1">Avg Score %</span>
                            </h3>
                            <p className="text-xs text-slate-400 font-medium hidden sm:block">Daily average practice score per university</p>
                        </div>
                        <div className="h-[320px] w-full">
                            {readinessData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={readinessData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                            tickMargin={10}
                                            tickFormatter={(v) => {
                                                const d = new Date(v);
                                                return `${d.getDate()}/${d.getMonth() + 1}`;
                                            }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                            domain={[0, 100]}
                                            tickFormatter={(v) => `${v}%`}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                            formatter={(value: any) => [`${value}%`, '']}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 700, color: '#64748b', paddingTop: '12px' }} />
                                        {(['#6366F1', '#14B8A6', '#F59E0B'] as const).map((color, idx) =>
                                            topUnis[idx] ? (
                                                <Line
                                                    key={topUnis[idx]}
                                                    type="monotone"
                                                    dataKey={topUnis[idx]}
                                                    stroke={color}
                                                    strokeWidth={3}
                                                    dot={false}
                                                    activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }}
                                                />
                                            ) : null
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                                    <TrendingUp className="w-10 h-10 opacity-20" />
                                    <p className="font-medium text-sm">No readiness data for selected period</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* University Performance Leaderboard */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                <TargetIcon className="w-6 h-6 text-emerald-600" />
                                Institutional Leaderboard
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full uppercase tracking-widest">Global Rank</span>
                            </h3>
                        </div>
                        
                        <div className="overflow-x-auto relative z-10">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
                                        <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">University Name</th>
                                        <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Avg Completion Score</th>
                                        <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total Practice Sessions</th>
                                        <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Active Study Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.length > 0 ? leaderboard.map((univ, idx) => (
                                        <tr key={idx} className="border-b border-gray-50 hover:bg-slate-50 transition-colors group">
                                            <td className="py-5 px-4 w-16">
                                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-sm shadow-sm transition-transform group-hover:scale-110 ${
                                                    idx === 0 ? 'bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900 border border-amber-300 shadow-amber-200/50' :
                                                    idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-700 border border-slate-400 shadow-slate-200/50' :
                                                    idx === 2 ? 'bg-gradient-to-br from-orange-200 to-orange-300 text-orange-900 border border-orange-300 shadow-orange-200/50' :
                                                    'bg-gray-100 text-gray-500 border border-gray-200'
                                                }`}>
                                                    #{idx + 1}
                                                </span>
                                            </td>
                                            <td className="py-5 px-4">
                                                <div className="flex items-center justify-between group cursor-pointer">
                                                    <span className="font-bold text-slate-800 text-lg group-hover:text-emerald-600 transition-colors">{univ.university_name}</span>
                                                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                                </div>
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className={`font-black tracking-tight ${univ.average_score >= 80 ? 'text-emerald-600 text-xl' : univ.average_score >= 60 ? 'text-amber-600 text-lg' : 'text-rose-600 text-lg'}`}>
                                                        {univ.average_score}%
                                                    </span>
                                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                                        <div className={`h-full transition-all duration-1000 ${univ.average_score >= 80 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : univ.average_score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${univ.average_score}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <span className="font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl">{univ.total_sessions.toLocaleString()}</span>
                                            </td>
                                            <td className="py-5 px-4 text-center">
                                                <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl">{univ.total_time_spent_minutes.toLocaleString()} Min</span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="py-16 text-center text-slate-400">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                                                        <BarChart2 className="w-8 h-8 text-slate-300" />
                                                    </div>
                                                    <p className="font-bold text-slate-600 text-lg">No Institutional Data Available</p>
                                                    <p className="font-medium text-sm">Students need to complete practice sessions to generate analytics.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div></main>
            </div>
        </div>
    );
}
