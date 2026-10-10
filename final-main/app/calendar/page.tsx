'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';
import { ChevronLeft, ChevronRight, Sparkles, Building2, Calendar, X, ArrowLeft } from 'lucide-react';

type ViewMode = 'grid' | 'month-select' | 'year-select';

const EVENT_STYLES: Record<string, string> = {
    admission: 'bg-emerald-100 border-emerald-300 text-emerald-900',
    test_date: 'bg-blue-100 border-blue-300 text-blue-900',
    mock_test: 'bg-purple-100 border-purple-300 text-purple-900',
    registration_deadline: 'bg-rose-100 border-rose-300 text-rose-900',
    _default: 'bg-amber-100 border-amber-300 text-amber-900',
};

const EVENT_BADGE: Record<string, string> = {
    admission: 'bg-emerald-100 text-emerald-700',
    test_date: 'bg-blue-100 text-blue-700',
    mock_test: 'bg-purple-100 text-purple-700',
    registration_deadline: 'bg-rose-100 text-rose-700',
    _default: 'bg-amber-100 text-amber-700',
};

const DOT_COLOR: Record<string, string> = {
    admission: 'bg-emerald-500',
    test_date: 'bg-blue-500',
    mock_test: 'bg-purple-500',
    registration_deadline: 'bg-rose-500',
    _default: 'bg-amber-500',
};

function getStyle(type: string, map: Record<string, string>) {
    return map[type] || map['_default'];
}

export default function StudentCalendarPage() {
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<any[]>([]);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            const currentUser = AuthService.getCurrentUser() || await AuthService.syncSession();
            if (!currentUser) { router.push('/login'); return; }
            setUser(currentUser);
            try {
                const res = await fetch('/api/mongo/calendar');
                const data = await res.json();
                setEvents(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [router]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

    const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    const shortMonthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const shortDayNames = ["S", "M", "T", "W", "T", "F", "S"];

    const today = new Date();

    const getEventsForDate = (day: number) => {
        return events.filter(e => {
            if (!e.event_date) return false;
            const d = new Date(e.event_date);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });
    };

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    while (days.length % 7 !== 0) days.push(null);

    const upcomingDeadlines = events
        .filter(e => new Date(e.event_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
        .slice(0, 4);

    const startYear = 2022;
    const years = Array.from({ length: 12 }, (_, i) => startYear + i);

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
            <Sidebar userRole="student" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Student'} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="p-3 sm:p-6 lg:p-8 mt-28 lg:mt-24 overflow-x-hidden">
                    <div className="w-full space-y-6 sm:space-y-8">
                        {/* Page Title */}
                        <div className="mb-4 sm:mb-6">
                            <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Master Calendar</h1>
                            <p className="text-slate-500 mt-1 text-xs sm:text-base max-w-2xl hidden sm:block">
                                Strategic scheduling for the next generation of scholars. Track your global university milestones, standardized tests, and mock examinations.
                            </p>
                        </div>

                        {loading ? (
                            <div className="grid animate-pulse gap-4 sm:gap-6 lg:grid-cols-3">
                                <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
                                    <div className="h-8 w-40 rounded-lg bg-slate-200" />
                                    <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-3">
                                        {Array.from({ length: 35 }).map((_, index) => (
                                            <div key={index} className="aspect-square rounded-lg bg-slate-100" />
                                        ))}
                                    </div>
                                </div>
                                <div className="h-56 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white" />
                            </div>
                        ) : (
                            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">

                                {/* ── Calendar Card ── */}
                                <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                    {/* Calendar Header */}
                                    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100">
                                        {viewMode === 'grid' ? (
                                            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                                <button
                                                    onClick={() => setViewMode('month-select')}
                                                    className="text-base sm:text-2xl font-black text-slate-800 hover:text-teal-600 transition-colors cursor-pointer uppercase truncate"
                                                >
                                                    {shortMonthNames[month]}
                                                    <span className="hidden sm:inline">{monthNames[month].slice(3)}</span>
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('year-select')}
                                                    className="text-base sm:text-2xl font-black text-slate-400 hover:text-teal-600 transition-colors cursor-pointer"
                                                >
                                                    {year}
                                                </button>
                                                <button
                                                    onClick={() => { setCurrentDate(new Date()); setViewMode('grid'); }}
                                                    className="ml-1 sm:ml-3 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full border-2 border-slate-100 text-[10px] sm:text-xs font-black text-slate-500 hover:border-teal-100 hover:text-teal-600 hover:bg-teal-50/50 transition-all uppercase tracking-wider"
                                                >
                                                    Today
                                                </button>
                                            </div>
                                        ) : (
                                            <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight uppercase">
                                                {viewMode === 'month-select' ? 'Select Month' : 'Select Year'}
                                            </h2>
                                        )}

                                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                            {viewMode === 'grid' ? (
                                                <>
                                                    <button onClick={prevMonth} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                                                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                                                    </button>
                                                    <button onClick={nextMonth} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => setViewMode('grid')} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="flex-1 flex flex-col">
                                        {viewMode === 'grid' && (
                                            <div className="flex-1">
                                                {/* Day headers */}
                                                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                                                    {shortDayNames.map((d, i) => (
                                                        <div key={i} className="py-2 sm:py-3 text-center text-[9px] sm:text-xs font-black text-slate-400 tracking-widest">{d}</div>
                                                    ))}
                                                </div>
                                                {/* Day cells */}
                                                <div className="grid grid-cols-7 bg-white">
                                                    {days.map((day, idx) => {
                                                        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                                                        const dayEvents = day ? getEventsForDate(day) : [];
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className={`
                                                                    border-b border-r border-slate-100 last:border-r-0
                                                                    min-h-[48px] sm:min-h-[80px] lg:min-h-[100px]
                                                                    p-0.5 sm:p-2
                                                                    ${day ? 'bg-white hover:bg-slate-50/70 transition-colors cursor-default' : 'bg-slate-50/40'}
                                                                `}
                                                            >
                                                                {day && (
                                                                    <>
                                                                        <span className={`inline-flex w-6 h-6 sm:w-7 sm:h-7 rounded-full items-center justify-center text-xs sm:text-sm font-bold ${isToday ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600'}`}>
                                                                            {day}
                                                                        </span>
                                                                        {/* Mobile: Logos instead of dots */}
                                                                        {dayEvents.length > 0 && (
                                                                            <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                                                                                {dayEvents.slice(0, 3).map((evt, i) => (
                                                                                    <button
                                                                                        key={i}
                                                                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                                                                                        className="relative"
                                                                                    >
                                                                                        {evt.university_id?.logo_url ? (
                                                                                            <div className="w-5 h-5 rounded-full border border-slate-200 shadow-sm overflow-hidden bg-white flex items-center justify-center p-0.5">
                                                                                                <img src={evt.university_id.logo_url} className="w-full h-full object-contain" alt="" />
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className={`w-2 h-2 rounded-full ${getStyle(evt.event_type, DOT_COLOR)} shadow-sm`} />
                                                                                        )}
                                                                                    </button>
                                                                                ))}
                                                                                {dayEvents.length > 3 && (
                                                                                    <span className="text-[8px] font-black text-slate-400 mt-1">+{dayEvents.length - 3}</span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {/* Desktop: full event pills */}
                                                                        <div className="mt-1 space-y-1 hidden sm:flex sm:flex-col">
                                                                            {dayEvents.slice(0, 2).map((evt, i) => (
                                                                                <div
                                                                                    key={i}
                                                                                    onClick={() => setSelectedEvent(evt)}
                                                                                    className={`w-full px-1.5 py-1 rounded border text-[9px] lg:text-[10px] font-bold shadow-sm cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 ${getStyle(evt.event_type, EVENT_STYLES)}`}
                                                                                >
                                                                                    <div className="flex items-center gap-1 overflow-hidden">
                                                                                        {evt.university_id?.logo_url && (
                                                                                            <div className="w-3 h-3 rounded-full bg-white flex-shrink-0 border border-slate-200 overflow-hidden">
                                                                                                <img src={evt.university_id.logo_url} className="w-full h-full object-contain" alt="" />
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="truncate">{evt.title}</div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                            {dayEvents.length > 2 && (
                                                                                <button
                                                                                    onClick={() => setSelectedEvent(dayEvents[2])}
                                                                                    className="text-[9px] font-black text-teal-600 text-left pl-1 hover:underline"
                                                                                >
                                                                                    +{dayEvents.length - 2} more
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {viewMode === 'month-select' && (
                                            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50/30">
                                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4 w-full max-w-lg sm:max-w-4xl">
                                                    {monthNames.map((name, i) => (
                                                        <button
                                                            key={name}
                                                            onClick={() => { setCurrentDate(new Date(year, i, 1)); setViewMode('grid'); }}
                                                            className={`py-4 sm:py-8 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm tracking-wider transition-all duration-200 border-2 ${i === month
                                                                ? 'bg-teal-500 border-teal-500 text-white shadow-xl shadow-teal-500/20 scale-105'
                                                                : 'bg-white border-slate-100 text-slate-600 hover:border-teal-300 hover:text-teal-600 shadow-sm'
                                                                }`}
                                                        >
                                                            {shortMonthNames[i]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {viewMode === 'year-select' && (
                                            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-50/30">
                                                <div className="grid grid-cols-4 gap-3 sm:gap-6 w-full max-w-sm sm:max-w-2xl">
                                                    {years.map((y) => (
                                                        <button
                                                            key={y}
                                                            onClick={() => { setCurrentDate(new Date(y, month, 1)); setViewMode('grid'); }}
                                                            className={`aspect-square rounded-full font-black text-sm sm:text-xl transition-all duration-200 border-4 flex items-center justify-center ${y === year
                                                                ? 'bg-teal-500 border-teal-400 text-white shadow-xl shadow-teal-500/30 scale-110'
                                                                : 'bg-white border-slate-200 text-slate-400 hover:border-teal-300 hover:text-teal-600 hover:scale-105 shadow-sm'
                                                                }`}
                                                        >
                                                            {y}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => setViewMode('month-select')}
                                                    className="mt-8 sm:mt-12 flex items-center gap-2 text-teal-600 font-bold hover:gap-3 transition-all uppercase tracking-widest text-xs"
                                                >
                                                    <ArrowLeft className="w-4 h-4" /> Back to Month
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── Right Sidebar ── */}
                                <div className="space-y-4 sm:space-y-6">
                                    <div className="bg-slate-50/50 rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-6">
                                        <h3 className="text-base sm:text-lg font-black text-slate-800 mb-4 sm:mb-5">Upcoming Deadlines</h3>
                                        <div className="space-y-3 sm:space-y-4">
                                            {upcomingDeadlines.length === 0 ? (
                                                <p className="text-xs text-slate-500 font-medium">No upcoming events scheduled.</p>
                                            ) : upcomingDeadlines.map((evt, i) => (
                                                <div key={i} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                                                    <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${getStyle(evt.event_type, EVENT_BADGE)}`}>
                                                            {evt.event_type.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 truncate">
                                                            <Calendar className="w-3 h-3 shrink-0" />
                                                            {new Date(evt.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-3 items-start">
                                                        {evt.university_id?.logo_url ? (
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                                                                <img src={evt.university_id.logo_url} className="w-6 h-6 sm:w-7 sm:h-7 object-contain" alt="Logo" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0 border-2 border-slate-50">
                                                                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <h4 className="text-sm font-bold text-slate-900 leading-tight mb-1 truncate">{evt.title}</h4>
                                                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{evt.description}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-teal-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-xl shadow-teal-900/20 relative overflow-hidden">
                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/20 rounded-full blur-2xl" />
                                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl" />
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Sparkles className="w-4 h-4 text-white" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white">Aptivo AI Insight</span>
                                            </div>
                                            <p className="text-sm font-bold text-white leading-relaxed">
                                                Stay on top of your preparation. Based on current trends, reviewing previous Mock Test mistakes earlier typically boosts selection chances by 20%.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Event Popover ── */}
                        {selectedEvent && (
                            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
                                <div
                                    onClick={e => e.stopPropagation()}
                                    className={`w-full sm:max-w-sm rounded-2xl p-5 shadow-2xl border-2 relative flex flex-col gap-3 ${getStyle(selectedEvent.event_type, EVENT_STYLES).replace('bg-', 'bg-').replace('100', '50')}`}
                                >
                                    <button onClick={() => setSelectedEvent(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition">
                                        <X className="w-4 h-4" />
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full animate-pulse bg-current opacity-50" />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Event Details</span>
                                    </div>

                                    <div>
                                        <h3 className="font-black text-base mb-1">{selectedEvent.title}</h3>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${getStyle(selectedEvent.event_type, EVENT_BADGE)}`}>
                                            {selectedEvent.event_type?.replace(/_/g, ' ')}
                                        </span>
                                    </div>

                                    <p className="text-sm font-medium leading-relaxed opacity-90">
                                        {selectedEvent.description || "No specific description provided for this event."}
                                    </p>

                                    <div className="pt-3 border-t border-current/10 flex items-center gap-2 text-xs font-bold opacity-70">
                                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                                        {new Date(selectedEvent.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>

                                    {selectedEvent.university_id && (
                                        <div className="flex items-center gap-2 opacity-70">
                                            {selectedEvent.university_id.logo_url && (
                                                <div className="w-5 h-5 rounded-full bg-white/50 p-0.5 overflow-hidden shrink-0">
                                                    <img src={selectedEvent.university_id.logo_url} className="w-full h-full object-contain" alt="" />
                                                </div>
                                            )}
                                            <span className="text-[10px] font-black uppercase tracking-wider truncate">{selectedEvent.university_id.name || selectedEvent.title}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
