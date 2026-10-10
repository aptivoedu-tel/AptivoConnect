'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import {
    Target as TargetIcon,
    BookOpen,
    CheckCircle,
    Clock,
    ArrowRight,
    Trophy,
    Calendar,
    AlertCircle,
    ClipboardList
} from 'lucide-react';
import { toast } from 'sonner';
import { AuthService } from '@/lib/services/authService';
import { useUI } from '@/lib/context/UIContext';

export default function StudentAssignedTasksPage() {
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser();
            setUser(u);
            if (u && u.institution_id) {
                await fetchTasks(u.institution_id, u.id);
            } else {
                setLoading(false);
            }
        };
        init();
    }, []);

    async function fetchTasks(institutionId: number, studentId: string) {
        try {
            const res = await fetch(`/api/mongo/institutions/tasks?institution_id=${institutionId}&student_id=${studentId}`);
            const data = await res.json();
            const rawTasks = data.tasks || [];

            const mappedTasks = rawTasks.map((task: any) => {
                const required = task.required_mcqs || 10;
                const isCompleted = (task.correct_mcqs || 0) >= required;
                let isOverdue = false;
                if (!isCompleted && task.due_date) {
                    const dueDate = new Date(task.due_date);
                    dueDate.setHours(23, 59, 59, 999);
                    isOverdue = new Date() > dueDate;
                }
                return { ...task, isCompleted, isOverdue };
            });

            setTasks(mappedTasks);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load your assigned tasks");
        } finally {
            setLoading(false);
        }
    }

    const filteredTasks = tasks.filter(task => {
        if (activeTab === 'all') return true;
        if (activeTab === 'completed') return task.isCompleted;
        if (activeTab === 'overdue') return task.isOverdue;
        return !task.isCompleted && !task.isOverdue;
    });

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Sidebar userRole="student" />
            <div className={`flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="p-4 lg:p-8 mt-28 lg:mt-24">
                    <div className="max-w-7xl mx-auto space-y-8 bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
                        
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">Institutional Assignments</h1>
                                <p className="text-slate-500 text-lg font-medium">Follow your learning path provided by your educational institution.</p>
                            </div>
                        </div>

                        {/* Google Classroom Style Tabs */}
                        <div className="relative z-10 flex flex-wrap gap-2 pb-4 border-b border-slate-100">
                            {[
                                { id: 'all', label: 'All Tasks', icon: ClipboardList },
                                { id: 'pending', label: 'Assigned', icon: TargetIcon },
                                { id: 'overdue', label: 'Missing', icon: Clock },
                                { id: 'completed', label: 'Done', icon: CheckCircle }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                        activeTab === tab.id 
                                        ? 'bg-teal-600 text-white shadow-xl shadow-teal-100 scale-[1.05]' 
                                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200'}`}>
                                        {tasks.filter(t => {
                                            if (tab.id === 'all') return true;
                                            if (tab.id === 'completed') return t.isCompleted;
                                            if (tab.id === 'overdue') return t.isOverdue;
                                            return !t.isCompleted && !t.isOverdue;
                                        }).length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {!user?.institution_id ? (
                            <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-1">No Institution Linked</h3>
                                <p className="text-slate-500 font-medium max-w-md mx-auto">This section is only available for students enrolled via an educational institution.</p>
                            </div>
                        ) : filteredTasks.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                                <CheckCircle className="w-12 h-12 text-teal-400 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-1">
                                    {activeTab === 'completed' ? 'Keep working!' : activeTab === 'overdue' ? 'Great job!' : 'All clear!'}
                                </h3>
                                <p className="text-slate-500 font-medium">No tasks found in this section.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredTasks.map((task, i) => (
                                    <div key={i} className="group bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
                                        <div className="flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center border border-teal-100 group-hover:scale-110 transition-transform">
                                                    <BookOpen className="w-7 h-7 text-teal-600" />
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    task.isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                    task.isOverdue ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    task.status === 'scheduled' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    {task.isCompleted ? 'Completed' : task.isOverdue ? 'Missing' : task.status === 'scheduled' ? 'Upcoming' : 'Pending'}
                                                </div>
                                            </div>

                                            <div className="flex-1">
                                                <h3 className="text-xl font-black text-slate-900 leading-tight pr-4 line-clamp-2">{task.target_name}</h3>
                                                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mt-1 mb-4">{task.university_name}</p>
                                                
                                                <div className="space-y-1 mb-6">
                                                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                                        <Calendar className="w-3.5 h-3.5" /> {task.status === 'scheduled' ? 'Starts' : 'Assigned'}: {new Date(task.assigned_at || task.scheduled_at || task.created_at).toLocaleDateString()}
                                                    </p>
                                                    {task.due_date && (
                                                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${task.isOverdue ? 'text-rose-500' : 'text-amber-500'}`}>
                                                            <Clock className="w-3.5 h-3.5" /> Due: {new Date(task.due_date).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="mb-6 space-y-2">
                                                    <div className="flex justify-between items-end">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress ({task.required_mcqs || 10} correct required)</p>
                                                        <p className="text-sm font-black text-slate-700">{task.correct_mcqs || 0}/{task.required_mcqs || 10}</p>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${task.isCompleted ? 'bg-emerald-500' : 'bg-teal-500'}`} 
                                                            style={{ width: `${Math.min(((task.correct_mcqs || 0) / (task.required_mcqs || 10)) * 100, 100)}%` }} 
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    const url = task.type === 'topic' 
                                                        ? `/university/${task.university_id}/practice/topic/${task.target_id}`
                                                        : `/university/${task.university_id}/practice/${task.target_id}`;
                                                    router.push(url);
                                                }}
                                                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 border ${
                                                    task.isCompleted ? 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50' : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-teal-200 border-teal-500/20'
                                                }`}
                                            >
                                                {task.isCompleted ? 'Re-Practice' : task.isOverdue ? 'Complete Now' : task.status === 'scheduled' ? 'View Details' : 'Start Practice'} 
                                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
