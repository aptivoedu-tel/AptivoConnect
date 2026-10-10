'use client';

import React, { useEffect, useState } from 'react';
import {
    TrendingUp, Users, BookOpen, Clock,
    ArrowUpRight, ArrowDownRight, Activity, PieChart,
    Target as TargetIcon, Layers, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';
import { useLoading } from '@/lib/context/LoadingContext';
import { AnalyticsService, TotalStats, GrowthData, WeakTopic } from '@/lib/services/analyticsService';

const formatDateString = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIndex = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return `${months[monthIndex]} ${day}, ${year}`;
};

interface CustomDatePickerProps {
    value: string;
    onChange: (date: string) => void;
}

function CustomDatePicker({ value, onChange }: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Parse value to initialize calendar month/year view
    const initialDate = value ? new Date(value) : new Date();
    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-11

    // Update view month/year if value changes externally
    useEffect(() => {
        if (value) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
            }
        }
    }, [value]);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

    const prevDaysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const prevDays = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dayNum = prevDaysInMonth - i;
        const prevMonthVal = viewMonth === 0 ? 11 : viewMonth - 1;
        const prevYearVal = viewMonth === 0 ? viewYear - 1 : viewYear;
        prevDays.push({
            day: dayNum,
            isCurrentMonth: false,
            dateStr: `${prevYearVal}-${String(prevMonthVal + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
        });
    }

    const currentDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
        currentDays.push({
            day: i,
            isCurrentMonth: true,
            dateStr: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        });
    }

    const totalCalculated = prevDays.length + currentDays.length;
    const nextDaysCount = totalCalculated <= 35 ? 35 - totalCalculated : 42 - totalCalculated;
    const nextDays = [];
    for (let i = 1; i <= nextDaysCount; i++) {
        const nextMonthVal = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYearVal = viewMonth === 11 ? viewYear + 1 : viewYear;
        nextDays.push({
            day: i,
            isCurrentMonth: false,
            dateStr: `${nextYearVal}-${String(nextMonthVal + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        });
    }

    const allDays = [...prevDays, ...currentDays, ...nextDays];

    const prevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const nextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-black rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all text-left shadow-sm min-w-[140px]"
            >
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>{formatDateString(value)}</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 mt-2 p-4 w-72 bg-white rounded-3xl border border-gray-100 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 px-1">
                            <button 
                                type="button" 
                                onClick={prevMonth} 
                                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] font-black text-slate-700 tracking-wider uppercase">
                                {months[viewMonth]} {viewYear}
                            </span>
                            <button 
                                type="button" 
                                onClick={nextMonth} 
                                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                                <span key={d} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</span>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {allDays.map((dayObj, idx) => {
                                const isSelected = dayObj.dateStr === value;
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            onChange(dayObj.dateStr);
                                            setIsOpen(false);
                                        }}
                                        className={`w-8 h-8 text-[11px] font-black flex items-center justify-center rounded-full transition-all ${
                                            isSelected
                                                ? 'bg-teal-600 text-white shadow-lg shadow-teal-100 scale-110'
                                                : dayObj.isCurrentMonth
                                                ? 'text-slate-600 hover:bg-slate-50'
                                                : 'text-slate-300'
                                        }`}
                                    >
                                        {dayObj.day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function AnalyticsPage() {
    const [user, setUser] = useState<any>(null);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all' | 'custom'>('30d');
    const [customStartDate, setCustomStartDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [customEndDate, setCustomEndDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    });
    const { isSidebarCollapsed } = useUI();

    // Data States
    const [stats, setStats] = useState<TotalStats | null>(null);
    const [growth, setGrowth] = useState<GrowthData[]>([]);
    const [difficultyDistribution, setDifficultyDistribution] = useState<any[]>([]);
    const [engagement, setEngagement] = useState<any[]>([]);
    const [inventoryStats, setInventoryStats] = useState<any>(null);
    const [inventoryBreakdown, setInventoryBreakdown] = useState<any[]>([]);
    const [globalBreakdown, setGlobalBreakdown] = useState<any[]>([]);

    // Mock Distribution for Pie Chart (assuming service provided generic or we mock for visual)
    const [distributionData, setDistributionData] = useState<any[]>([]);
    const [pulseData, setPulseData] = useState<any[]>([]);

    useEffect(() => {
        loadAnalytics();
    }, [dateRange]);

    const loadAnalytics = async () => {
        setGlobalLoading(true, 'Consulting Academic Intelligence...');
        const currentUser = AuthService.getCurrentUser();
        // Fallback for dev
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);

        if (!activeUser) {
            window.location.href = '/login';
            return;
        }
        setUser(activeUser);

        try {
            // Map date range to service parameters
            const periodMap: Record<string, number | 'week' | 'month' | 'year' | 'all' | 'custom'> = {
                '7d': 'week',
                '30d': 'month',
                '90d': 'year',
                'all': 'all',
                'custom': 'custom'
            };

            const period = periodMap[dateRange];
            const customRange = period === 'custom' ? { start: customStartDate, end: customEndDate } : undefined;

            const [statsRes, growthRes, diffRes, distRes, invRes, engRes, pulseRes] = await Promise.all([
                AnalyticsService.getTotalStats(),
                AnalyticsService.getStudentGrowth(period, customRange),
                AnalyticsService.getDifficultyDistribution(),
                AnalyticsService.getSubjectDistribution(),
                AnalyticsService.getInventoryAnalytics(),
                AnalyticsService.getStudentEngagement(period, customRange),
                AnalyticsService.getPulseData(period, customRange)
            ]);

            if (statsRes.stats) setStats(statsRes.stats);
            if (growthRes.data) setGrowth(growthRes.data);
            if (diffRes.distribution) setDifficultyDistribution(diffRes.distribution);
            if (distRes.data) setDistributionData(distRes.data);
            if (invRes.stats) {
                setInventoryStats(invRes.stats);
                setInventoryBreakdown(invRes.breakdown);
                setGlobalBreakdown(invRes.globalBreakdown || []);
            }
            if (engRes.engagement) setEngagement(engRes.engagement);
            if (pulseRes.pulse) setPulseData(pulseRes.pulse);

        } catch (error) {
            console.error("Error loading analytics:", error);
        } finally {
            setGlobalLoading(false);
        }
    };

    if (loading) return null; // Or a loader

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Analytics Overview</h1>
                                <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Insights into system performance and user engagement</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-1 flex w-full sm:w-auto overflow-x-auto no-scrollbar">
                                <button
                                    onClick={() => setDateRange('7d')}
                                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${dateRange === '7d' ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    7 Days
                                </button>
                                <button
                                    onClick={() => setDateRange('30d')}
                                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${dateRange === '30d' ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    30 Days
                                </button>
                                <button
                                    onClick={() => setDateRange('90d')}
                                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${dateRange === '90d' ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    90 Days
                                </button>
                                <button
                                    onClick={() => setDateRange('all')}
                                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${dateRange === 'all' ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Overall
                                </button>
                                <button
                                    onClick={() => setDateRange('custom')}
                                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${dateRange === 'custom' ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Custom
                                </button>
                            </div>
                        </div>

                        {/* Custom Date Picker Range Options */}
                        {dateRange === 'custom' && (
                            <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</span>
                                    <CustomDatePicker 
                                        value={customStartDate} 
                                        onChange={(date) => setCustomStartDate(date)}
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</span>
                                    <CustomDatePicker 
                                        value={customEndDate} 
                                        onChange={(date) => setCustomEndDate(date)}
                                    />
                                </div>
                                <button
                                    onClick={loadAnalytics}
                                    disabled={!customStartDate || !customEndDate}
                                    className="sm:ml-auto w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-teal-100"
                                >
                                    Apply Filter
                                </button>
                            </div>
                        )}

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                            {[
                                {
                                    label: 'Subjects',
                                    value: stats?.totalSubjects.toLocaleString() || '0',
                                    change: '+2%',
                                    icon: BookOpen,
                                    color: 'bg-teal-600',
                                    shadow: 'shadow-teal-100'
                                },
                                {
                                    label: 'Active Students',
                                    value: stats?.totalStudents.toLocaleString() || '0',
                                    change: '+12%',
                                    icon: Users,
                                    color: 'bg-emerald-600',
                                    shadow: 'shadow-emerald-100'
                                },
                                {
                                    label: 'Questions',
                                    value: stats?.totalMCQs.toLocaleString() || '0',
                                    change: '+5%',
                                    icon: Activity,
                                    color: 'bg-rose-600',
                                    shadow: 'shadow-rose-100'
                                },
                                {
                                    label: 'Sessions',
                                    value: stats?.totalPracticeSessions.toLocaleString() || '0',
                                    change: '+18%',
                                    icon: Clock,
                                    color: 'bg-amber-600',
                                    shadow: 'shadow-amber-100'
                                }
                            ].map((card, i) => (
                                <div key={i} className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all active:scale-[0.98]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2.5 sm:p-3 rounded-2xl ${card.color} text-white shadow-lg ${card.shadow}`}>
                                            <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                        <span className="hidden sm:flex items-center text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 uppercase tracking-wider">
                                            {card.change}
                                        </span>
                                    </div>
                                    <h3 className="text-xl sm:text-3xl font-black text-slate-800 mb-1">{card.value}</h3>
                                    <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            {/* Growth Chart */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-teal-600" />
                                    Student Growth
                                </h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={growth}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Line type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4, fill: '#14b8a6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Performance Distribution (Pie) */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <PieChart className="w-5 h-5 text-teal-600" />
                                    Subject Distribution
                                </h3>
                                <div className="h-[300px] flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {distributionData.length > 0 ? (
                                            <RechartsPieChart>
                                                <Pie
                                                    data={distributionData}
                                                    innerRadius={80}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    nameKey="name"
                                                >
                                                    {distributionData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                            </RechartsPieChart>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-center p-8">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                    <PieChart className="w-8 h-8 text-gray-200" />
                                                </div>
                                                <p className="text-sm text-gray-400 font-medium">No distribution data available</p>
                                            </div>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Charts Row 2 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            {/* Practice Engagement */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-indigo-600" />
                                    Student Practice Engagement
                                </h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={engagement} barSize={20}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Difficulty Distribution */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-rose-600" />
                                    Question Difficulty Distribution
                                </h3>
                                <div className="h-[300px] flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {difficultyDistribution.length > 0 ? (
                                            <RechartsPieChart>
                                                <Pie
                                                    data={difficultyDistribution}
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    nameKey="name"
                                                >
                                                    {difficultyDistribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                            </RechartsPieChart>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-center p-8">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                    <PieChart className="w-8 h-8 text-gray-200" />
                                                </div>
                                                <p className="text-sm text-gray-400 font-medium">No distribution data available</p>
                                            </div>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Charts Row 3: Time Spent */}
                        <div className="grid grid-cols-1 gap-8 mb-8">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-amber-500" />
                                    Daily Time Spent by Students (Minutes)
                                </h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={engagement}>
                                            <defs>
                                                <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Area type="monotone" dataKey="total_time" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorTime)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Charts Row 4: 24-Hour Pulse */}
                        <div className="grid grid-cols-1 gap-8 mb-8">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-indigo-600" />
                                    Active Platform Pulse (24-Hour)
                                </h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={pulseData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Line type="monotone" dataKey="sessions" stroke="#6366f1" strokeWidth={4} dot={false} activeDot={{ r: 8, fill: '#6366f1', stroke: '#fff', strokeWidth: 3 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Question Bank Coverage Strategy */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <TargetIcon className="w-5 h-5 text-indigo-600" />
                                    Inventory Balance
                                </h3>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsPieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Universal', value: inventoryStats?.universalCount || 0, color: '#0ea5e9' },
                                                    { name: 'University', value: inventoryStats?.universitySpecificCount || 0, color: '#6366f1' },
                                                    { name: 'Global Exam', value: inventoryStats?.globalExamSpecificCount || 0, color: '#ec4899' }
                                                ]}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                <Cell fill="#0ea5e9" />
                                                <Cell fill="#6366f1" />
                                                <Cell fill="#ec4899" />
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </RechartsPieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 space-y-4 p-4 bg-slate-50 rounded-xl">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">University Specific</span>
                                            <span className="text-xs font-black text-indigo-600">
                                                {inventoryStats?.totalCount > 0
                                                    ? Math.round((inventoryStats.universitySpecificCount / inventoryStats.totalCount) * 100)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-indigo-600 h-full transition-all duration-1000"
                                                style={{ width: `${inventoryStats?.totalCount > 0 ? (inventoryStats.universitySpecificCount / inventoryStats.totalCount) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Exam Specific</span>
                                            <span className="text-xs font-black text-pink-600">
                                                {inventoryStats?.totalCount > 0
                                                    ? Math.round((inventoryStats.globalExamSpecificCount / inventoryStats.totalCount) * 100)
                                                    : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-pink-500 h-full transition-all duration-1000"
                                                style={{ width: `${inventoryStats?.totalCount > 0 ? (inventoryStats.globalExamSpecificCount / inventoryStats.totalCount) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-indigo-600" />
                                        Institution Coverage Breakdown
                                    </h3>
                                    <div className="h-[320px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={inventoryBreakdown}
                                                layout="vertical"
                                                margin={{ left: 40, right: 40 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    dataKey="name"
                                                    type="category"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                                                    width={100}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 10, fontWeight: 800, fill: '#6366f1' }} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-pink-600" />
                                        Global Exam Coverage Breakdown
                                    </h3>
                                    <div className="h-[320px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={globalBreakdown}
                                                layout="vertical"
                                                margin={{ left: 40, right: 40 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    dataKey="name"
                                                    type="category"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                                                    width={100}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 10, fontWeight: 800, fill: '#ec4899' }} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}
