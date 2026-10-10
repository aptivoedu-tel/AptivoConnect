'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import {
    ClipboardList,
    Users,
    CheckCircle,
    Clock,
    Search,
    Filter,
    ArrowRight,
    ChevronLeft,
    TrendingUp,
    Calendar,
    Target as TargetIcon,
    ChevronRight,
    BookOpen,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { AuthService } from '@/lib/services/authService';
import { useUI } from '@/lib/context/UIContext';

export default function AssignmentReportsPage() {
    const { isSidebarCollapsed } = useUI();
    const [user, setUser] = useState<any>(null);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser();
            setUser(u);
            if (u && u.institution_id) {
                await fetchReports(u.institution_id);
            } else {
                setLoading(false);
            }
        };
        init();
    }, []);

    async function fetchReports(institutionId: number) {
        try {
            const res = await fetch(`/api/mongo/institutions/tasks/reports?institution_id=${institutionId}`);
            const data = await res.json();
            // Sort by assigned date descending
            const sorted = (data.reports || []).sort((a: any, b: any) => 
                new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
            );
            setReports(sorted);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load reports");
        } finally {
            setLoading(false);
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full" />
        </div>
    );

    const renderTaskListView = () => {
        const filteredReports = reports.filter(r => 
            r.target_name.toLowerCase().includes(search.toLowerCase()) ||
            r.university_name.toLowerCase().includes(search.toLowerCase())
        );

        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="Find a specific task..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-6 py-4 bg-teal-50 text-teal-600 rounded-2xl">
                        <ClipboardList className="w-5 h-5" />
                        <span className="font-black text-[10px] uppercase tracking-widest">{reports.length} Total Assignments</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredReports.map((report, idx) => {
                        const completedCount = report.completions.filter((c: any) => c.is_completed).length;
                        const totalCount = report.completions.length;
                        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                        return (
                            <div 
                                key={idx} 
                                onClick={() => setSelectedTask(report)}
                                className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center border border-teal-100">
                                            <BookOpen className="w-7 h-7 text-teal-600" />
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-100 text-[9px] font-black uppercase tracking-widest">
                                            {new Date(report.assigned_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-slate-900 leading-tight mb-1 group-hover:text-teal-700 transition-colors line-clamp-1">{report.target_name}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{report.university_name}</p>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Completion Density</p>
                                                <p className="text-lg font-black text-slate-900 leading-none">{completedCount} / {totalCount} Students</p>
                                                {report.required_mcqs && (
                                                    <p className="text-[10px] font-bold text-teal-600 mt-1">Quota: {report.required_mcqs} MCQs</p>
                                                )}
                                            </div>
                                            <p className="text-2xl font-black text-teal-600 leading-none">{percentage}%</p>
                                        </div>
                                        <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                                            <div className="h-full bg-teal-500 transition-all duration-1000" style={{ width: `${percentage}%` }} />
                                        </div>
                                    </div>

                                    <div className="mt-8 flex items-center gap-2 text-teal-600 font-black text-[10px] uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform">
                                        View Detailed Report <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDetailView = () => {
        const filteredCompletions = selectedTask.completions.filter((c: any) => 
            c.student_name.toLowerCase().includes(search.toLowerCase()) ||
            c.student_email.toLowerCase().includes(search.toLowerCase())
        );

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={() => { setSelectedTask(null); setSearch(''); }}
                            className="w-12 h-12 bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 rounded-2xl flex items-center justify-center transition-all border border-slate-100"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em]">Detailed Analytics</span>
                            <h2 className="text-3xl font-black text-slate-900 leading-none mt-1">{selectedTask.target_name}</h2>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="px-6 py-4 bg-teal-900 rounded-2xl text-white shadow-xl shadow-teal-100">
                            <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest leading-none mb-1">Assigned On</p>
                            <p className="text-lg font-black leading-none">{new Date(selectedTask.assigned_at).toLocaleDateString()}</p>
                        </div>
                        {selectedTask.due_date && (
                            <div className="px-6 py-4 bg-rose-50 border border-rose-100 rounded-2xl">
                                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">Due Date</p>
                                <p className="text-lg font-black text-rose-900 leading-none">{new Date(selectedTask.due_date).toLocaleDateString()}</p>
                            </div>
                        )}
                        {selectedTask.required_mcqs && (
                            <div className="px-6 py-4 bg-teal-50 border border-teal-100 rounded-2xl">
                                <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest leading-none mb-1">Requirement</p>
                                <p className="text-lg font-black text-teal-900 leading-none">{selectedTask.required_mcqs} MCQs</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <h3 className="text-xl font-black text-slate-900">Student Progress Matrix</h3>
                        <div className="relative max-w-xs w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Search student name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-6 py-3 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Identity</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">MCQs Practiced</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Verification</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredCompletions.map((comp: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 flex items-center justify-center font-black text-teal-700 shadow-sm">
                                                    {comp.student_name.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm leading-none mb-1.5">{comp.student_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{comp.student_email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="inline-flex flex-col items-center gap-1">
                                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                                                    <TargetIcon className="w-3.5 h-3.5" />
                                                    <span className="text-sm font-black">{comp.correct_mcqs} Correct</span>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Target: {selectedTask.required_mcqs || 10} MCQs</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                                comp.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                comp.status === 'Late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                comp.status === 'Missing' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                'bg-slate-50 text-slate-400 border-slate-100'
                                            }`}>
                                                {comp.status === 'Completed' && <><CheckCircle className="w-3.5 h-3.5" /> Handed In</>}
                                                {comp.status === 'Late' && <><CheckCircle className="w-3.5 h-3.5" /> Handed In Late</>}
                                                {comp.status === 'Missing' && <><AlertCircle className="w-3.5 h-3.5" /> Missing / Overdue</>}
                                                {comp.status === 'Pending' && <><Clock className="w-3.5 h-3.5" /> Assigned</>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-2 text-slate-700 text-[10px] font-black uppercase tracking-widest">
                                                    <TrendingUp className="w-4 h-4" /> {comp.status === 'Pending' || comp.status === 'Missing' ? 'Tracking Active' : 'Verified'}
                                                </div>
                                                {comp.completion_date && (
                                                    <span className="text-[9px] text-slate-400 font-bold mt-1">on {new Date(comp.completion_date).toLocaleDateString()}</span>
                                                )}
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

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Sidebar userRole="institution_admin" />
            <div className={`flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="p-4 lg:p-8 mt-28 lg:mt-24">
                    <div className="max-w-7xl mx-auto space-y-12">
                        {!selectedTask && (
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="space-y-2">
                                    <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-none">Assignment Ledger</h1>
                                    <p className="text-slate-500 text-lg font-medium max-w-2xl">Audit curriculum compliance by inspecting student behavior and MCQ participation for each assigned topic.</p>
                                </div>
                                <div className="hidden lg:flex items-center gap-4 p-2 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                                        <ClipboardList className="w-6 h-6" />
                                    </div>
                                    <div className="pr-6">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Audit Mode</p>
                                        <p className="text-sm font-black text-slate-900 leading-none">Institutional Oversight</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedTask ? renderDetailView() : renderTaskListView()}
                    </div>
                </main>
            </div>
        </div>
    );
}
