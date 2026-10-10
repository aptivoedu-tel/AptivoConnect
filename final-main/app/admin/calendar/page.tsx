'use client';
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';
import { Plus, Edit2, Trash2, Save, X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

type ViewMode = 'grid' | 'month-select' | 'year-select';

export default function AdminCalendarPage() {
    const { isSidebarCollapsed } = useUI();
    const [user, setUser] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [universities, setUniversities] = useState<any[]>([]);
    
    // Calendar Grid State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    // CRUD state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string|null>(null);
    const [formData, setFormData] = useState({
        title: '', event_type: 'admission', event_date: '', university_id: '',
        description: '', priority: 'medium', is_published: true
    });

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser() || await AuthService.syncSession();
            setUser(u);
            if (u?.role !== 'super_admin') return;

            Promise.all([
                fetch('/api/mongo/admin/calendar').then(r => r.json()),
                fetch('/api/mongo/universities').then(r => r.json()),
                fetch('/api/mongo/admin/calendar/reminders') // Smooth background check
            ]).then(([evtData, uniData]) => {
                setEvents(Array.isArray(evtData) ? evtData : []);
                setUniversities(Array.isArray(uniData.universities) ? uniData.universities : []);
            });
        };
        init();
    }, []);

    const openForm = (evt?: any, defaultDateStr?: string) => {
        if (evt) {
            setEditingId(evt._id);
            setFormData({
                title: evt.title,
                event_type: evt.event_type,
                event_date: new Date(evt.event_date).toISOString().split('T')[0],
                university_id: evt.university_id?._id || '',
                description: evt.description || '',
                priority: evt.priority,
                is_published: evt.is_published
            });
        } else {
            setEditingId(null);
            setFormData({ 
                title: '', 
                event_type: 'admission', 
                event_date: defaultDateStr || '', 
                university_id: '', 
                description: '', 
                priority: 'medium', 
                is_published: true 
            });
        }
        setIsFormOpen(true);
    };

    const saveEvent = async (e: any) => {
        e.preventDefault();
        const url = editingId ? `/api/mongo/admin/calendar/${editingId}` : `/api/mongo/admin/calendar`;
        const method = editingId ? 'PUT' : 'POST';
        
        try {
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const evtData = await fetch('/api/mongo/admin/calendar').then(r => r.json());
                setEvents(Array.isArray(evtData) ? evtData : []);
                setIsFormOpen(false);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const deleteEvent = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this event?')) return;
        await fetch(`/api/mongo/admin/calendar/${id}`, { method: 'DELETE' });
        setEvents(events.filter((e:any) => e._id !== id));
        setIsFormOpen(false);
    };

    // Calendar Calculations
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

    const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    const today = new Date();

    const getEventsForDate = (day: number) => {
        return events.filter(e => {
            if (!e.event_date) return false;
            const d = new Date(e.event_date);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });
    };

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    while (days.length % 7 !== 0) days.push(null);

    // Year selection range
    const startYear = 2022;
    const years = Array.from({ length: 12 }, (_, i) => startYear + i);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <Sidebar userRole="super_admin" />
            <div className={`flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="p-5 lg:p-8 mt-24">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-2xl font-black text-slate-900">Academic Calendar</h1>
                                <p className="text-slate-500 text-sm mt-1">Manage global university milestones and test dates.</p>
                            </div>
                            <button onClick={() => openForm()} className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-700 transition shadow-md shadow-teal-100">
                                <Plus className="w-4 h-4"/> Add Event
                            </button>
                        </div>

                        {/* Calendar Main Container */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                                {viewMode === 'grid' ? (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setViewMode('month-select')}
                                            className="text-2xl font-black text-slate-800 hover:text-teal-600 transition-colors cursor-pointer uppercase"
                                        >
                                            {monthNames[month]}
                                        </button>
                                        <button 
                                            onClick={() => setViewMode('year-select')}
                                            className="text-2xl font-black text-slate-400 hover:text-teal-600 transition-colors cursor-pointer"
                                        >
                                            {year}
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setCurrentDate(new Date());
                                                setViewMode('grid');
                                            }}
                                            className="ml-4 px-4 py-1.5 rounded-full border-2 border-slate-100 text-xs font-black text-slate-500 hover:border-teal-100 hover:text-teal-600 hover:bg-teal-50/50 transition-all uppercase tracking-widest"
                                        >
                                            Today
                                        </button>
                                    </div>
                                ) : (
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                                        {viewMode === 'month-select' ? 'Select Month' : 'Select Year'}
                                    </h2>
                                )}
                                
                                <div className="flex items-center gap-2">
                                    {viewMode === 'grid' ? (
                                        <>
                                            <button onClick={prevMonth} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                                                <ChevronLeft className="w-5 h-5 text-slate-600" />
                                            </button>
                                            <button onClick={nextMonth} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
                                                <ChevronRight className="w-5 h-5 text-slate-600" />
                                            </button>
                                        </>
                                    ) : (
                                        <button onClick={() => setViewMode('grid')} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition">
                                            <X className="w-6 h-6" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* View Content */}
                            <div className="flex-1 flex flex-col">
                                {viewMode === 'grid' && (
                                    <div className="divide-y divide-slate-100">
                                        <div className="grid grid-cols-7 bg-slate-50">
                                            {dayNames.map(d => (
                                                <div key={d} className="py-3 text-center text-xs font-black text-slate-400 tracking-widest">{d}</div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 bg-white">
                                            {days.map((day, idx) => {
                                                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                                                const dayEvents = day ? getEventsForDate(day) : [];
                                                let defaultDateStr = day ? new Date(Date.UTC(year, month, day)).toISOString().split('T')[0] : '';

                                                return (
                                                    <div 
                                                        key={idx} 
                                                        onClick={() => day ? openForm(null, defaultDateStr) : null}
                                                        className={`min-h-[140px] p-2 border-slate-100 border-b border-r last:border-r-0 ${day ? 'bg-white hover:bg-slate-50 transition-colors cursor-pointer group relative' : 'bg-slate-50/50'}`}
                                                    >
                                                        {day && (
                                                            <>
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-sm font-bold ${isToday ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 group-hover:text-teal-600'}`}>
                                                                        {day}
                                                                    </span>
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-teal-100 hover:text-teal-600">
                                                                            <Plus className="w-3 h-3"/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1.5 flex flex-col items-start w-full">
                                                                    {dayEvents.map((evt, i) => {
                                                                        const isAdmission = evt.event_type === 'admission';
                                                                        const isTest = evt.event_type === 'test_date';
                                                                        const isMock = evt.event_type === 'mock_test';
                                                                        const isDeadline = evt.event_type === 'registration_deadline';
                                                                        return (
                                                                            <div key={i} onClick={(e) => { e.stopPropagation(); openForm(evt); }} className={`w-full px-2 py-1.5 rounded border text-[10px] sm:text-xs font-bold shadow-sm transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer ${
                                                                                isAdmission ? 'bg-emerald-100 border-emerald-300 text-emerald-900' :
                                                                                isTest ? 'bg-blue-100 border-blue-300 text-blue-900' :
                                                                                isMock ? 'bg-purple-100 border-purple-300 text-purple-900' :
                                                                                isDeadline ? 'bg-rose-100 border-rose-300 text-rose-900' :
                                                                                'bg-amber-100 border-amber-300 text-amber-900'
                                                                            }`}>
                                                                                <div className="flex items-center gap-1.5 overflow-hidden mb-0.5">
                                                                                    {evt.university_id?.logo_url && (
                                                                                        <div className="w-4 h-4 rounded-full bg-white flex-shrink-0 border border-slate-200 overflow-hidden shadow-sm">
                                                                                            <img src={evt.university_id.logo_url} className="w-full h-full object-contain" alt="U" />
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="truncate font-black tracking-tight">{evt.title}</div>
                                                                                </div>
                                                                                {evt.university_id?.name && <div className="truncate text-[9px] font-medium opacity-80 mt-0.5">{evt.university_id.name}</div>}
                                                                            </div>
                                                                        );
                                                                    })}
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
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/30">
                                        <div className="grid grid-cols-4 gap-4 w-full max-w-4xl">
                                            {monthNames.map((name, i) => (
                                                <button
                                                    key={name}
                                                    onClick={() => {
                                                        setCurrentDate(new Date(year, i, 1));
                                                        setViewMode('grid');
                                                    }}
                                                    className={`py-8 rounded-2xl font-black text-sm tracking-wider transition-all duration-200 border-2 ${
                                                        i === month 
                                                        ? 'bg-teal-500 border-teal-500 text-white shadow-xl shadow-teal-500/20 scale-105' 
                                                        : 'bg-white border-slate-100 text-slate-600 hover:border-teal-300 hover:text-teal-600 hover:bg-white shadow-sm hover:shadow-md'
                                                    }`}
                                                >
                                                    {name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {viewMode === 'year-select' && (
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/30">
                                        <div className="grid grid-cols-4 gap-8 w-full max-w-2xl">
                                            {years.map((y) => (
                                                <button
                                                    key={y}
                                                    onClick={() => {
                                                        setCurrentDate(new Date(y, month, 1));
                                                        setViewMode('grid');
                                                    }}
                                                    className={`w-24 h-24 rounded-full font-black text-xl transition-all duration-200 border-4 flex items-center justify-center ${
                                                        y === year 
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
                                            className="mt-12 flex items-center gap-2 text-teal-600 font-bold hover:gap-3 transition-all uppercase tracking-widest text-xs"
                                        >
                                            <ArrowLeft className="w-4 h-4" /> Back to Month
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Event Modal (Forms) */}
                        {isFormOpen && (
                            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl relative border border-slate-100">
                                    <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5"/></button>
                                    <h2 className="text-xl font-black mb-6 text-slate-800 tracking-tight">{editingId ? 'Edit Event' : 'Create Event'}</h2>
                                    <form onSubmit={saveEvent} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Title</label>
                                            <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 bg-slate-50 px-4 py-3 rounded-xl font-medium outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition" placeholder="e.g. NET Computing Drop" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Event Type</label>
                                                <select value={formData.event_type} onChange={e => setFormData({...formData, event_type: e.target.value})} className="w-full border border-slate-200 bg-slate-50 px-4 py-3 rounded-xl font-medium outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition cursor-pointer appearance-none">
                                                    <option value="admission">Admission</option>
                                                    <option value="test_date">Test Date</option>
                                                    <option value="mock_test">Mock Test</option>
                                                    <option value="registration_deadline">Registration Deadline</option>
                                                    <option value="event">General Event</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Date</label>
                                                <input type="date" required value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} className="w-full border border-slate-200 bg-slate-50 px-4 py-3 rounded-xl font-medium outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">University Connection</label>
                                            <select required value={formData.university_id} onChange={e => setFormData({...formData, university_id: e.target.value})} className="w-full border border-slate-200 bg-slate-50 px-4 py-3 rounded-xl font-medium outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition cursor-pointer appearance-none">
                                                <option value="">Select University</option>
                                                {(universities || []).map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Description (Optional)</label>
                                            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full border border-slate-200 bg-slate-50 px-4 py-3 rounded-xl font-medium outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition resize-none"></textarea>
                                        </div>
                                        <div className="flex items-center gap-3 mt-4">
                                            <input type="checkbox" id="pub" checked={formData.is_published} onChange={e => setFormData({...formData, is_published: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer" />
                                            <label htmlFor="pub" className="text-sm font-bold text-slate-700 cursor-pointer">Published (Visible to students)</label>
                                        </div>
                                        <div className="pt-6 flex justify-between items-center border-t border-slate-100 mt-6">
                                            {editingId ? (
                                                <button type="button" onClick={() => deleteEvent(editingId)} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2">
                                                    <Trash2 className="w-4 h-4"/> Delete
                                                </button>
                                            ) : <div></div>}
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition">Cancel</button>
                                                <button type="submit" className="bg-teal-600 text-white px-7 py-2.5 rounded-xl font-black tracking-wide shadow-lg shadow-teal-600/30 hover:bg-teal-700 active:scale-95 transition flex items-center gap-2">
                                                    <Save className="w-4 h-4"/> {editingId ? 'Update Event' : 'Save Event'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
