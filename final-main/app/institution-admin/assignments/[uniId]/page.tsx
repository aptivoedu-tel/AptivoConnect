'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import {
    BookOpen,
    CheckCircle,
    Building2,
    ChevronDown,
    ChevronLeft,
    Search,
    FlaskConical,
    Atom,
    Calculator,
    Languages,
    Target as TargetIcon,
    ClipboardList,
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';

type ContentMap = {
    subject: { id: number; name: string };
    topics: {
        id: number;
        name: string;
        mcqCount?: number;
        subtopics: { id: number; name: string; mcqCount?: number }[];
    }[];
};

export default function AssignmentDetailPage() {
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();
    const params = useParams();
    const uniId = Number(params.uniId);

    const [user, setUser] = useState<any>(null);
    const [university, setUniversity] = useState<any>(null);
    const [content, setContent] = useState<ContentMap[]>([]);
    const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [moduleSearch, setModuleSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [assignedTasks, setAssignedTasks] = useState<Record<string, boolean>>({});
    const [dueDates, setDueDates] = useState<Record<string, string>>({}); // NEW
    const [scheduledDates, setScheduledDates] = useState<Record<string, string>>({});
    const [requiredMcqs, setRequiredMcqs] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        if (isNaN(uniId)) {
            toast.error("Invalid university ID");
            router.push('/institution-admin/assignments');
            return;
        }

        const init = async () => {
            try {
                const u = AuthService.getCurrentUser();
                setUser(u);
                if (!u || !u.institution_id) {
                    toast.error("Institution link missing.");
                    return;
                }

                await fetchData(u.institution_id);
            } catch (error) {
                console.error("Initialization error:", error);
                toast.error("Failed to load assignment data.");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [uniId]);

    async function fetchData(institutionId: number) {
        // 1. Fetch University Details
        const uniRes = await fetch(`/api/mongo/universities?id=${uniId}`);
        const uniData = await uniRes.json();
        const uni = uniData.universities?.find((u: any) => u.id === uniId);
        if (!uni) {
            toast.error("University not found.");
            router.push('/institution-admin/assignments');
            return;
        }
        setUniversity(uni);

        // 2. Load Content
        const contentRes = await fetch(`/api/mongo/universities/content-access?university_id=${uniId}&institution_id=${institutionId}`);
        const contentData = await contentRes.json();
        const mappings = contentData.mappings || [];

        const subjectMap = new Map<number, ContentMap>();
        mappings.forEach((row: any) => {
            if (!row.subject) return;
            if (!subjectMap.has(row.subject.id)) {
                subjectMap.set(row.subject.id, { subject: row.subject, topics: [] });
            }
            const currentSubject = subjectMap.get(row.subject.id)!;

            if (row.topic) {
                let topic = (currentSubject.topics as any[]).find((t: any) => t.id === row.topic.id);
                if (!topic) {
                    const newTopic = { ...row.topic, subtopics: [] };
                    currentSubject.topics.push(newTopic);
                    topic = newTopic;
                }
                if (row.subtopic && topic) {
                    if (!(topic.subtopics as any[]).find((st: any) => st.id === row.subtopic.id)) {
                        topic.subtopics.push(row.subtopic);
                    }
                }
            }
        });
        const finalContent = Array.from(subjectMap.values());
        setContent(finalContent);
        if (finalContent.length > 0) setSelectedSubjectId(finalContent[0].subject.id);

        // 3. Load Existing Assignments
        const tasksRes = await fetch(`/api/mongo/institutions/tasks?institution_id=${institutionId}&university_id=${uniId}`);
        const tasksData = await tasksRes.json();
        const assignments: Record<string, boolean> = {};
        const dates: Record<string, string> = {};
        const scheduled: Record<string, string> = {};
        const reqMcqs: Record<string, number> = {};
        tasksData.tasks?.forEach((task: any) => {
            const key = `${task.type}-${task.target_id}`;
            assignments[key] = true;
            if (task.due_date) dates[key] = new Date(task.due_date).toISOString().split('T')[0];
            if (task.scheduled_at) scheduled[key] = new Date(task.scheduled_at).toISOString().split('T')[0];
            if (task.required_mcqs) reqMcqs[key] = task.required_mcqs;
        });
        setAssignedTasks(assignments);
        setDueDates(dates);
        setScheduledDates(scheduled);
        setRequiredMcqs(reqMcqs);
    }

    const toggleAssignment = async (type: 'topic' | 'subtopic', id: number) => {
        const key = `${type}-${id}`;
        const isCurrentlyAssigned = assignedTasks[key];
        setSaving(key);

        try {
            const method = isCurrentlyAssigned ? 'DELETE' : 'POST';
            const res = await fetch(`/api/mongo/institutions/tasks?institution_id=${user.institution_id}&university_id=${uniId}&type=${type}&target_id=${id}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: method === 'POST' ? JSON.stringify({
                    institution_id: user.institution_id,
                    university_id: uniId,
                    type,
                    target_id: id,
                    due_date: dueDates[key] ? new Date(dueDates[key]) : undefined,
                    scheduled_at: scheduledDates[key] ? new Date(scheduledDates[key]) : undefined,
                    required_mcqs: requiredMcqs[key] || undefined
                }) : undefined
            });

            if (res.ok) {
                setAssignedTasks(prev => ({ ...prev, [key]: !isCurrentlyAssigned }));
                toast.success(isCurrentlyAssigned ? "Task unassigned" : "Task assigned successfully");
            } else {
                toast.error("Failed to update assignment");
            }
        } catch (e) {
            console.error(e);
            toast.error("An error occurred while saving");
        } finally {
            setSaving(null);
        }
    };

    const getSubjectIcon = (name: string) => {
        const lowercase = name.toLowerCase();
        if (lowercase.includes('chem')) return FlaskConical;
        if (lowercase.includes('phys')) return Atom;
        if (lowercase.includes('math')) return Calculator;
        if (lowercase.includes('eng')) return Languages;
        return BookOpen;
    };

    const activeSubject = content.find((s: any) => s.subject.id === selectedSubjectId);

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
            <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

            <main className={`${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'} pt-28 lg:pt-24 p-4 lg:p-8 transition-all duration-300`}>
                <div className="max-w-7xl mx-auto space-y-8 bg-white/60 backdrop-blur-sm p-4 lg:p-8 rounded-[2rem] lg:rounded-[3rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 pb-6 border-b border-slate-100/80">
                        <div className="flex items-center gap-4 sm:gap-6 w-full">
                            <Link
                                href="/institution-admin/assignments"
                                className="w-12 h-12 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-600 transition-all shadow-sm bg-white shrink-0 group"
                            >
                                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                            </Link>
                            <div className="flex items-center gap-4 lg:gap-6 flex-1 min-w-0">
                                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white rounded-[1.5rem] shadow-xl shadow-teal-100/50 border border-slate-100 p-3 shrink-0 flex items-center justify-center overflow-hidden">
                                    {university?.logo_url ? (
                                        <img src={university.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <Building2 className="w-10 h-10 text-teal-600" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-1">Assignment Portal</span>
                                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-teal-900 tracking-tight leading-tight truncate">
                                            {university?.name}
                                        </h1>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto no-scrollbar pb-2">
                        <div className="flex items-center gap-4 p-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm min-w-max">
                            <div className="flex items-center gap-2 px-2">
                                {content.map((s) => {
                                    const Icon = getSubjectIcon(s.subject.name);
                                    const isSelected = selectedSubjectId === s.subject.id;
                                    return (
                                        <button
                                            key={s.subject.id}
                                            onClick={() => setSelectedSubjectId(s.subject.id)}
                                            className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 group whitespace-nowrap ${isSelected
                                                ? 'bg-teal-600 text-white shadow-xl shadow-teal-900/10 scale-[1.02]'
                                                : 'hover:bg-slate-50 text-slate-600'
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-teal-600'}`} />
                                            <span className="font-bold text-sm tracking-tight">{s.subject.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden flex flex-col shadow-sm">
                        <div className="p-8 lg:p-10 border-b border-slate-50 space-y-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                        {activeSubject?.subject.name}
                                    </h2>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Select lessons to assign to your students</p>
                                </div>
                                <div className="relative group max-w-xs w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        value={moduleSearch}
                                        onChange={(e) => setModuleSearch(e.target.value)}
                                        placeholder="Search modules..."
                                        className="w-full pl-12 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-[1.5rem] text-sm font-bold outline-none focus:bg-white transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto divide-y divide-slate-100">
                            {activeSubject?.topics.map((topic, tIdx) => {
                                const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;
                                const isExpanded = expandedTopic === topic.id;
                                const isAssigned = assignedTasks[`topic-${topic.id}`];
                                const isSaving = saving === `topic-${topic.id}`;

                                const filteredSubtopics = topic.subtopics?.filter(st => 
                                    st.name.toLowerCase().includes(moduleSearch.toLowerCase())
                                );
                                
                                const topicMatches = topic.name.toLowerCase().includes(moduleSearch.toLowerCase());
                                if (moduleSearch && !topicMatches && (!filteredSubtopics || filteredSubtopics.length === 0)) return null;

                                return (
                                    <div key={topic.id} className="flex flex-col">
                                        <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-8 lg:px-10 py-6 hover:bg-slate-50/50 transition-all group`}>
                                            <div className="col-span-12 md:col-span-6 flex items-center gap-6">
                                                <span className="hidden md:block text-xs font-black text-slate-200 w-6 tabular-nums">{tIdx + 1}</span>
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <p className={`font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight`}>{topic.name}</p>
                                                        {hasSubtopics && (
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{topic.subtopics.length} Sections available</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="col-span-12 md:col-span-6 flex flex-wrap items-center justify-end gap-x-6 gap-y-4 mt-4 md:mt-0 bg-slate-50/30 p-4 rounded-2xl border border-slate-100/50">
                                                {hasSubtopics && (
                                                    <button
                                                        onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                                                        className="flex items-center gap-2 px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                                    >
                                                        {isExpanded ? 'Hide Sections' : 'Manage Sections'}
                                                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </button>
                                                )}
                                                
                                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Due Date</span>
                                                        <input 
                                                            type="date"
                                                            value={dueDates[`topic-${topic.id}`] || ''}
                                                            onChange={(e) => setDueDates(prev => ({...prev, [`topic-${topic.id}`]: e.target.value}))}
                                                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-1 focus:ring-teal-500/30 w-32"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest ml-1 mb-1">Schedule</span>
                                                        <input 
                                                            type="date"
                                                            value={scheduledDates[`topic-${topic.id}`] || ''}
                                                            onChange={(e) => setScheduledDates(prev => ({...prev, [`topic-${topic.id}`]: e.target.value}))}
                                                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-1 focus:ring-amber-500/30 w-32"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">MCQs</span>
                                                        <input 
                                                            type="number"
                                                            min="1"
                                                            placeholder="10"
                                                            value={requiredMcqs[`topic-${topic.id}`] || ''}
                                                            onChange={(e) => setRequiredMcqs(prev => ({...prev, [`topic-${topic.id}`]: parseInt(e.target.value) || undefined as any}))}
                                                            className="w-16 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-1 focus:ring-teal-500/30"
                                                        />
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        <button
                                                            disabled={!!saving}
                                                            onClick={() => toggleAssignment('topic', topic.id)}
                                                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                                                isAssigned 
                                                                ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white' 
                                                                : 'bg-teal-50 text-teal-600 border border-teal-100 hover:bg-teal-600 hover:text-white'
                                                            }`}
                                                        >
                                                            {isSaving ? 'Saving...' : isAssigned ? <><CheckCircle className="w-4 h-4" /> Unassign</> : <><TargetIcon className="w-4 h-4" /> Assign</>}
                                                        </button>
                                                        {isAssigned && (
                                                            <button
                                                                disabled={!!saving}
                                                                onClick={() => toggleAssignment('topic', topic.id)}
                                                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-white text-slate-400 border border-slate-200 hover:bg-slate-900 hover:text-white"
                                                            >
                                                                Update
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {hasSubtopics && isExpanded && (
                                            <div className="bg-slate-50/30 border-y border-slate-50 animate-slide-down">
                                                {topic.subtopics.map((st, sIdx) => {
                                                    const isStAssigned = assignedTasks[`subtopic-${st.id}`];
                                                    const isStSaving = saving === `subtopic-${st.id}`;
                                                    if (moduleSearch && !st.name.toLowerCase().includes(moduleSearch.toLowerCase()) && !topicMatches) return null;

                                                    return (
                                                        <div key={st.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-12 lg:px-14 py-5 hover:bg-white transition-all">
                                                            <div className="col-span-8 flex items-center gap-4">
                                                                <div className="w-1 h-8 bg-slate-100 rounded-full" />
                                                                <div>
                                                                    <p className="font-bold text-slate-700 leading-tight">{st.name}</p>
                                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">Section {tIdx + 1}.{sIdx + 1}</p>
                                                                </div>
                                                            </div>
                                                            <div className="col-span-4 flex items-center justify-end">
                                                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Due Date</span>
                                                                        <input 
                                                                            type="date"
                                                                            value={dueDates[`subtopic-${st.id}`] || ''}
                                                                            onChange={(e) => setDueDates(prev => ({...prev, [`subtopic-${st.id}`]: e.target.value}))}
                                                                            className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-1 focus:ring-teal-500/30"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest ml-1 mb-1">Schedule</span>
                                                                        <input 
                                                                            type="date"
                                                                            value={scheduledDates[`subtopic-${st.id}`] || ''}
                                                                            onChange={(e) => setScheduledDates(prev => ({...prev, [`subtopic-${st.id}`]: e.target.value}))}
                                                                            className="px-3 py-2 bg-amber-50/30 border border-amber-100/50 rounded-xl text-[10px] font-bold outline-none focus:ring-1 focus:ring-amber-500/30"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">MCQs</span>
                                                                        <input 
                                                                            type="number"
                                                                            min="1"
                                                                            placeholder="10"
                                                                            value={requiredMcqs[`subtopic-${st.id}`] || ''}
                                                                            onChange={(e) => setRequiredMcqs(prev => ({...prev, [`subtopic-${st.id}`]: parseInt(e.target.value) || undefined as any}))}
                                                                            className="w-16 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-1 focus:ring-teal-500/30"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        disabled={!!saving}
                                                                        onClick={() => toggleAssignment('subtopic', st.id)}
                                                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                                                            isStAssigned 
                                                                            ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white' 
                                                                            : 'bg-teal-50 text-teal-600 border border-teal-100 hover:bg-teal-600 hover:text-white'
                                                                        }`}
                                                                    >
                                                                        {isStSaving ? 'Saving...' : isStAssigned ? <><CheckCircle className="w-4 h-4" /> Unassign</> : <><TargetIcon className="w-4 h-4" /> Assign</>}
                                                                    </button>
                                                                    {isStAssigned && (
                                                                        <button
                                                                            disabled={!!saving}
                                                                            onClick={() => toggleAssignment('subtopic', st.id)}
                                                                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-900 hover:text-white"
                                                                        >
                                                                            Update
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
