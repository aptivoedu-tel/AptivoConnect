'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { useUI } from '@/lib/context/UIContext';
import { useLoading } from '@/lib/context/LoadingContext';
import { Flag, Check, Trash2, Edit3, Save, X, HelpCircle, ChevronDown, ChevronUp, Move } from 'lucide-react';
import { toast } from 'sonner';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import RichTextEditor from '@/components/shared/RichTextEditor';

export default function AdminReportedQuestionsPage() {
    const [reports, setReports] = useState<any[]>([]);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [user, setUser] = useState<any>(null);
    const { isSidebarCollapsed } = useUI();
    const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'all'>('pending');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [expandedMcqIds, setExpandedMcqIds] = useState<Record<number, boolean>>({});

    const [editingMcqId, setEditingMcqId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<any>({});

    // Transfer MCQ states
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferMcqId, setTransferMcqId] = useState<number | null>(null);
    const [hierarchy, setHierarchy] = useState<{ subjects: any[], topics: any[], subtopics: any[] }>({ subjects: [], topics: [], subtopics: [] });
    const [transferSelection, setTransferSelection] = useState({
        subject_id: null as number | null,
        topic_id: null as number | null,
        subtopic_id: null as number | null
    });

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser();
            if (u) setUser(u);
            await loadReports();
        };
        init();
    }, [statusFilter, categoryFilter]);

    const loadReports = async () => {
        setGlobalLoading(true, 'Loading Reported Questions...');
        try {
            const res = await fetch(`/api/mongo/admin/reports?status=${statusFilter}&category=${encodeURIComponent(categoryFilter)}`);
            if (res.ok) {
                const data = await res.json();
                setReports(data.reports || []);
            }
        } catch (error) {
            console.error("Error loading reports:", error);
            toast.error("Failed to load reported questions");
        } finally {
            setGlobalLoading(false);
        }
    };

    const toggleStatus = async (mcq_id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
        try {
            const res = await fetch('/api/mongo/admin/reports', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mcq_id, status: newStatus })
            });

            if (!res.ok) throw new Error('Toggle failed');
            toast.success(`Marked as ${newStatus}`);
            await loadReports();
        } catch (error) {
            console.error("Error toggling status:", error);
            toast.error("Failed to update status");
        }
    };

    const deleteReport = async (mcq_id: number) => {
        if (!window.confirm("Delete all reports for this question?")) return;
        try {
            const res = await fetch(`/api/mongo/admin/reports?mcq_id=${mcq_id}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Delete failed');
            toast.success("Reports deleted");
            await loadReports();
        } catch (error) {
            console.error("Error deleting report:", error);
            toast.error("Failed to delete report");
        }
    };

    const startEditing = (mcq: any) => {
        setEditingMcqId(mcq.id);
        setEditForm({
            question: mcq.question,
            option_a: mcq.option_a,
            option_b: mcq.option_b,
            option_c: mcq.option_c,
            option_d: mcq.option_d,
            correct_option: mcq.correct_option,
            explanation: mcq.explanation || ''
        });
    };

    const cancelEditing = () => {
        setEditingMcqId(null);
        setEditForm({});
    };

    const saveMcqEdit = async () => {
        if (!editingMcqId) return;
        try {
            const res = await fetch('/api/mongo/admin/reports', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingMcqId, updates: editForm })
            });

            if (!res.ok) throw new Error('Failed to update MCQ');
            toast.success('Question updated successfully!');
            setEditingMcqId(null);
            await loadReports();
        } catch (error) {
            console.error(error);
            toast.error('Error saving MCQ');
        }
    };

    // --- Transfer Logic ---
    const openTransferModal = async (mcq: any) => {
        setTransferMcqId(mcq.id);
        setTransferSelection({
            subject_id: null,
            topic_id: mcq.topic_id || null,
            subtopic_id: mcq.subtopic_id || null
        });

        // Load hierarchy if not already loaded
        if (hierarchy.subjects.length === 0) {
            try {
                const res = await fetch('/api/mongo/admin/hierarchy');
                if (res.ok) {
                    const data = await res.json();
                    setHierarchy(data);
                }
            } catch (error) {
                console.error("Hierarchy load error:", error);
                toast.error("Failed to load content structure");
            }
        }

        setIsTransferModalOpen(true);
    };

    const handleTransfer = async () => {
        if (!transferMcqId || !transferSelection.topic_id) {
            toast.error("Please select at least a topic");
            return;
        }

        setGlobalLoading(true, 'Transferring MCQ...');
        try {
            const res = await fetch('/api/mongo/admin/reports', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                                        id: transferMcqId,
                                        updates: {
                                            subject_id: transferSelection.subject_id,
                                            topic_id: transferSelection.topic_id,
                                            subtopic_id: transferSelection.subtopic_id
                                        }
                                    })
            });

            if (!res.ok) throw new Error('Transfer failed');
            toast.success("MCQ transferred successfully!");
            setIsTransferModalOpen(false);
            await loadReports();
        } catch (error) {
            console.error(error);
            toast.error("Failed to transfer MCQ");
        } finally {
            setGlobalLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'admin@aptivo.education'} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Reported Questions</h1>
                                <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Review mistakes flagged by students.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                                    {(['pending', 'resolved', 'all'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setStatusFilter(f)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === f
                                                ? 'bg-slate-900 text-white shadow-md'
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                                }`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-all text-slate-700 bg-transparent outline-none cursor-pointer"
                                    >
                                        <option value="all">ALL CATEGORIES</option>
                                        <option value="Incorrect Answer">INCORRECT ANSWER</option>
                                        <option value="Explanation Error">EXPLANATION ERROR</option>
                                        <option value="Syntax/Formatting">SYNTAX/FORMATTING</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {loading ? null : (
                            <div className="grid gap-6">
                                {reports.map((r) => {
                                    const isExpanded = !!expandedMcqIds[r.mcq_id];
                                    return (
                                        <div key={r.mcq_id} className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all flex flex-col gap-6">

                                            {/* Report Details Header (Clickable to Expand) */}
                                            <div
                                                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer group"
                                                onClick={() => setExpandedMcqIds(prev => ({ ...prev, [r.mcq_id]: !prev[r.mcq_id] }))}
                                            >
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest">
                                                            <Flag className="w-3 h-3" />
                                                            Mistake Report {r.report_count > 1 ? `(${r.report_count}x)` : ''}
                                                        </div>
                                                        {r.reasons && Array.isArray(r.reasons) && r.reasons.map((rsn: string, i: number) => (
                                                            <div key={i} className="flex items-center px-3 py-1 bg-rose-50 rounded-full border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest">
                                                                {rsn}
                                                            </div>
                                                        ))}
                                                        <span className="text-sm font-bold text-slate-800 hidden sm:block">MCQ ID: {r.mcq_id}</span>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden sm:block"></span>
                                                        <span className="text-sm text-slate-500 font-medium hidden sm:block">By {r.student?.full_name || 'Unknown'}</span>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden sm:block"></span>
                                                        <span className="text-sm text-slate-400 font-medium hidden sm:block">{new Date(r.created_at).toLocaleDateString()}</span>
                                                    </div>

                                                    <div className={`prose prose-sm max-w-none text-slate-700 transition-all ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                                        <MarkdownRenderer content={r.mcq?.question || 'Question text not found'} />
                                                    </div>
                                                </div>
                                                <div className="shrink-0 flex items-center justify-center p-3 rounded-2xl border border-slate-200 text-slate-400 group-hover:text-teal-600 group-hover:border-teal-400 transition-colors bg-slate-50 group-hover:bg-slate-100/50">
                                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </div>
                                            </div>

                                            {/* Expanded Content */}
                                            {isExpanded && (
                                                <div className="pt-6 border-t border-slate-100 flex flex-col lg:flex-row gap-8 animate-fade-in">

                                                    <div className="flex-1 space-y-4">
                                                        {editingMcqId === r.mcq_id ? (
                                                            <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-teal-100 shadow-inner">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-xs font-black uppercase tracking-widest text-teal-600 flex items-center gap-2"><Edit3 className="w-4 h-4" /> Edit Question</span>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Question Markdown</label>
                                                                    <RichTextEditor
                                                                        value={editForm.question}
                                                                        onChange={(val) => setEditForm({ ...editForm, question: val })}
                                                                        placeholder="Enter question text (Markdown & LaTeX supported)..."
                                                                        height="h-40"
                                                                    />
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    {['a', 'b', 'c', 'd'].map(opt => (
                                                                        <div key={opt}>
                                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Option {opt.toUpperCase()}</label>
                                                                            <RichTextEditor
                                                                                value={editForm[`option_${opt}`]}
                                                                                onChange={(val) => setEditForm({ ...editForm, [`option_${opt}`]: val })}
                                                                                placeholder={`Option ${opt.toUpperCase()}...`}
                                                                                height="h-24"
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Correct Answer</label>
                                                                        <select
                                                                            value={editForm.correct_option}
                                                                            onChange={e => setEditForm({ ...editForm, correct_option: e.target.value })}
                                                                            className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none bg-white"
                                                                        >
                                                                            {['A', 'B', 'C', 'D'].map(opt => (
                                                                                <option key={opt} value={opt}>{opt}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Explanation Markdown (Optional)</label>
                                                                    <RichTextEditor
                                                                        value={editForm.explanation}
                                                                        onChange={(val) => setEditForm({ ...editForm, explanation: val })}
                                                                        placeholder="Academic rationale..."
                                                                        height="h-32"
                                                                    />
                                                                </div>

                                                                <div className="flex gap-3 pt-2">
                                                                    <button
                                                                        onClick={saveMcqEdit}
                                                                        className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-teal-700 transition flex items-center gap-2"
                                                                    >
                                                                        <Save className="w-4 h-4" /> Save Changes
                                                                    </button>
                                                                    <button
                                                                        onClick={cancelEditing}
                                                                        className="px-5 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-300 transition flex items-center gap-2"
                                                                    >
                                                                        <X className="w-4 h-4" /> Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 prose prose-sm max-w-none text-slate-700">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Text:</div>
                                                                    </div>
                                                                    <MarkdownRenderer content={r.mcq?.question || 'Question text not found'} />
                                                                </div>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    {['a', 'b', 'c', 'd'].map(opt => (
                                                                        <div key={opt} className={`p-4 rounded-xl border ${r.mcq?.correct_option === opt.toUpperCase() ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'} flex gap-3 items-start`}>
                                                                            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${r.mcq?.correct_option === opt.toUpperCase() ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                                                {opt.toUpperCase()}
                                                                            </span>
                                                                            <span className="text-sm text-slate-700 mt-0.5 font-medium leading-relaxed max-w-full overflow-hidden">
                                                                                <MarkdownRenderer content={r.mcq?.[`option_${opt}`] || ''} />
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {r.mcq?.explanation && (
                                                                    <div className="bg-teal-50/50 p-5 rounded-2xl border border-teal-100/50 prose prose-sm max-w-none text-slate-700">
                                                                        <div className="mb-2 text-[10px] font-black text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
                                                                            <HelpCircle className="w-3 h-3" /> Explanation:
                                                                        </div>
                                                                        <MarkdownRenderer content={r.mcq?.explanation} />
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Actions Column */}
                                                    <div className="lg:w-48 flex flex-col gap-3 pt-2 shrink-0">
                                                        {editingMcqId !== r.mcq_id && (
                                                            <button
                                                                onClick={() => startEditing(r.mcq)}
                                                                className="w-full px-5 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-teal-700 hover:bg-teal-50 bg-white border border-slate-200 transition-all font-sans"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                                Edit Question
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => toggleStatus(r.mcq_id, r.status)}
                                                            className={`w-full px-5 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${r.status === 'pending'
                                                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                                                }`}
                                                        >
                                                            <Check className="w-4 h-4" />
                                                            {r.status === 'pending' ? 'Mark Resolved' : 'Unresolve'}
                                                        </button>

                                                        <button
                                                            onClick={() => deleteReport(r.mcq_id)}
                                                            className="w-full px-5 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 bg-white border border-red-100 transition-all font-sans"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete Report
                                                        </button>

                                                        <div className="mt-2 pt-2 border-t border-slate-100">
                                                            <button
                                                                onClick={() => openTransferModal(r.mcq)}
                                                                className="w-full px-5 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-600 hover:bg-teal-50 bg-white border border-teal-100 transition-all font-sans"
                                                            >
                                                                <Move className="w-4 h-4" />
                                                                Transfer Topic
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {reports.length === 0 && (
                                    <div className="py-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                                            <Check className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700 mb-1">All clear!</h3>
                                        <p className="text-slate-500 text-sm font-medium">No reported questions found in this category.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Transfer Modal */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border border-white p-8 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Transfer Question</h3>
                                    <p className="text-sm text-slate-500 font-medium">Move this MCQ to a different section.</p>
                                </div>
                                <button
                                    onClick={() => setIsTransferModalOpen(false)}
                                    className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Subject Selector */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Subject</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all cursor-pointer"
                                        onChange={(e) => {
                                            const subId = Number(e.target.value);
                                            setTransferSelection({ subject_id: subId, topic_id: null, subtopic_id: null });
                                        }}
                                        value={transferSelection.subject_id || ''}
                                    >
                                        <option value="">Choose a Subject...</option>
                                        {hierarchy.subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Topic Selector */}
                                <div className={`space-y-2 transition-all ${!transferSelection.subject_id ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Topic</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all cursor-pointer"
                                        onChange={(e) => {
                                            const topId = Number(e.target.value);
                                            setTransferSelection(prev => ({ ...prev, topic_id: topId, subtopic_id: null }));
                                        }}
                                        value={transferSelection.topic_id || ''}
                                    >
                                        <option value="">Choose a Topic...</option>
                                        {hierarchy.topics
                                            .filter(t => t.subject_id === transferSelection.subject_id)
                                            .map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                    </select>
                                </div>

                                {/* Subtopic Selector */}
                                <div className={`space-y-2 transition-all ${!transferSelection.topic_id ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Subtopic (Optional)</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all cursor-pointer"
                                        onChange={(e) => {
                                            const stId = e.target.value ? Number(e.target.value) : null;
                                            setTransferSelection(prev => ({ ...prev, subtopic_id: stId }));
                                        }}
                                        value={transferSelection.subtopic_id || ''}
                                    >
                                        <option value="">General Topic Level (No Subtopic)</option>
                                        {hierarchy.subtopics
                                            .filter(st => st.topic_id === transferSelection.topic_id)
                                            .map(st => (
                                                <option key={st.id} value={st.id}>{st.name}</option>
                                            ))}
                                    </select>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleTransfer}
                                        disabled={!transferSelection.topic_id}
                                        className="w-full bg-slate-900 text-white p-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
                                    >
                                        <Move className="w-5 h-5" />
                                        Complete Transfer
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-60"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -ml-16 -mb-16 opacity-60"></div>
                    </div>
                </div>
            )}
        </div>
    );
}
