'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ChevronRight, ChevronDown, Layers, Hash, FileText,
    Search, Target as TargetIcon, CheckCircle2, HelpCircle,
    Plus, Filter, Pencil, Trash2, X, Save, ChevronLeft
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { toast } from 'sonner';
import { useUI } from '@/lib/context/UIContext';
import { useLoading } from '@/lib/context/LoadingContext';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import RichTextEditor from '@/components/shared/RichTextEditor';

type HierarchyItem = {
    id: string;
    dbId: number;
    type: 'subject' | 'topic' | 'subtopic';
    title: string;
    children?: HierarchyItem[];
    expanded?: boolean;
    mcqCount?: number;
    topicId?: number; // For subtopics
};

export default function IndependentQuestionBankPage() {
    const params = useParams();
    const router = useRouter();
    const sectionId = parseInt(params.sectionId as string);
    const [user, setUser] = useState<any>(null);
    const [sectionName, setSectionName] = useState('');
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [data, setData] = useState<HierarchyItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<HierarchyItem | null>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const { isSidebarCollapsed } = useUI();

    // MCQ Modal State
    const [isMcqModalOpen, setIsMcqModalOpen] = useState(false);
    const [editingMcq, setEditingMcq] = useState<any>(null);
    const [mcqForm, setMcqForm] = useState({
        question: '',
        question_type: 'mcq_single',
        difficulty: 'medium',
        option_a: '', option_b: '', option_c: '', option_d: '',
        correct_option: 'A',
        explanation: '',
        test_section_id: sectionId
    });

    useEffect(() => {
        const u = AuthService.getCurrentUser();
        if (u) setUser(u);
        fetchSection();
        loadHierarchy();
    }, [sectionId]);

    const fetchSection = async () => {
        try {
            const res = await fetch(`/api/mongo/test-sections?id=${sectionId}`);
            if (res.ok) {
                const d = await res.json();
                if (d.section) setSectionName(d.section.name);
            }
        } catch (e) { console.error(e); }
    };

    const loadHierarchy = async () => {
        setGlobalLoading(true, 'Loading Private Hierarchy...');
        try {
            const [subRes, topRes, stRes, qRes] = await Promise.all([
                fetch(`/api/mongo/content?type=subjects&test_section_id=${sectionId}`).then(r => r.json()),
                fetch(`/api/mongo/content?type=topics&test_section_id=${sectionId}`).then(r => r.json()),
                fetch(`/api/mongo/content?type=subtopics&test_section_id=${sectionId}`).then(r => r.json()),
                fetch(`/api/mongo/mcqs?test_section_id=${sectionId}&counts_only=true`).then(r => r.json())
            ]);

            const subjects = subRes.subjects || [];
            const topics = topRes.topics || [];
            const subtopics = stRes.subtopics || [];
            const allMcqs = qRes.allMcqs || [];

            const tree: HierarchyItem[] = subjects.map((s: any) => {
                const subjectTopics = topics.filter((t: any) => t.subject_id === s.id);
                const processedTopics = subjectTopics.map((t: any): HierarchyItem => {
                    const topicSubtopics = subtopics.filter((st: any) => st.topic_id === t.id);
                    const processedSubtopics: HierarchyItem[] = topicSubtopics.map((st: any): HierarchyItem => {
                        const count = allMcqs.filter((m: any) => m.subtopic_id === st.id).length;
                        return { id: `st-${st.id}`, dbId: st.id, type: 'subtopic', title: st.name, mcqCount: count, topicId: t.id };
                    });
                    const topicCount = allMcqs.filter((m: any) => m.topic_id === t.id).length;
                    return { id: `t-${t.id}`, dbId: t.id, type: 'topic', title: t.name, mcqCount: topicCount, children: processedSubtopics, expanded: false };
                });
                const subjectCount = processedTopics.reduce((acc: number, t: any) => acc + (t.mcqCount || 0), 0);
                return { id: `s-${s.id}`, dbId: s.id, type: 'subject', title: s.name, mcqCount: subjectCount, children: processedTopics, expanded: false };
            });

            setData(tree);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load hierarchy');
        } finally {
            setGlobalLoading(false);
        }
    };

    const loadQuestions = async (item: HierarchyItem) => {
        setGlobalLoading(true, 'Loading Questions...');
        try {
            let url = `/api/mongo/mcqs?test_section_id=${sectionId}&strict_test_section=true&`;
            if (item.type === 'subtopic') url += `subtopic_id=${item.dbId}`;
            else if (item.type === 'topic') url += `topic_id=${item.dbId}`;
            else { setQuestions([]); return; }

            const res = await fetch(url);
            if (res.ok) {
                const d = await res.json();
                setQuestions(d.mcqs || []);
            }
        } catch (e) { console.error(e); }
        finally { setGlobalLoading(false); }
    };

    const handleOpenAddMcq = (item?: HierarchyItem) => {
        const target = item || selectedItem;
        if (!target || target.type === 'subject') { 
            toast.error('Select a topic or subtopic first'); 
            return; 
        }
        
        if (!item && target !== selectedItem) setSelectedItem(target);

        setEditingMcq(null);
        setMcqForm({
            question: '', question_type: 'mcq_single', difficulty: 'medium',
            option_a: '', option_b: '', option_c: '', option_d: '',
            correct_option: 'A', explanation: '',
            test_section_id: sectionId
        });
        setIsMcqModalOpen(true);
    };

    const handleSaveMcq = async () => {
        try {
            if (!mcqForm.question.trim()) { toast.error('Question text is required'); return; }
            if (!mcqForm.option_a.trim() || !mcqForm.option_b.trim()) { toast.error('At least options A and B are required'); return; }

            const payload = {
                ...mcqForm,
                subtopic_id: selectedItem?.type === 'subtopic' ? selectedItem.dbId : null,
                topic_id: selectedItem?.type === 'subtopic' ? selectedItem.topicId : (selectedItem?.type === 'topic' ? selectedItem.dbId : null),
                is_active: true
            };
            const method = editingMcq ? 'PATCH' : 'POST';
            const res = await fetch('/api/mongo/mcqs', {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingMcq ? { id: editingMcq.id, ...payload } : payload)
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to save');
            }
            
            toast.success('Question saved');
            setIsMcqModalOpen(false);
            if (selectedItem) loadQuestions(selectedItem);
            loadHierarchy();
        } catch (e: any) { 
            console.error('[QB/Save] Error:', e);
            toast.error(e.message); 
        }
    };

    const handleDeleteMcq = async (id: number) => {
        if (!confirm('Delete this question permanently?')) return;
        try {
            const res = await fetch(`/api/mongo/mcqs?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            toast.success('Question deleted');
            if (selectedItem) loadQuestions(selectedItem);
            loadHierarchy();
        } catch (e: any) { toast.error(e.message); }
    };

    const toggleExpand = (id: string, items: HierarchyItem[]): HierarchyItem[] =>
        items.map(item => item.id === id ? { ...item, expanded: !item.expanded } : item.children ? { ...item, children: toggleExpand(id, item.children) } : item);

    const renderTree = (items: HierarchyItem[], level = 0): React.ReactNode => {
        return items.map((item) => (
            <div key={item.id}>
                <div
                    className={`flex items-center gap-3 py-2 px-4 border-b border-gray-50 hover:bg-slate-50 cursor-pointer group ${selectedItem?.id === item.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
                    style={{ paddingLeft: `${level * 16 + 16}px` }}
                    onClick={() => {
                        if (item.type !== 'subtopic') setData(toggleExpand(item.id, data));
                        if (item.type !== 'subject') { setSelectedItem(item); loadQuestions(item); }
                    }}
                >
                    <div className={`text-slate-400 ${!item.children?.length ? 'invisible' : ''}`}>
                        {item.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </div>
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${item.type === 'subject' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {item.type === 'subject' ? <Layers className="w-3 h-3" /> : <Hash className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 text-xs font-bold truncate text-slate-700">{item.title}</div>
                    <div className="flex items-center gap-2">
                        {item.type !== 'subject' && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenAddMcq(item); }}
                                className="p-1 hover:bg-white rounded-md text-slate-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                                title="Add MCQ here"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        )}
                        {item.mcqCount !== undefined && (
                            <div className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 rounded">{item.mcqCount}</div>
                        )}
                    </div>
                </div>
                {item.expanded && item.children && renderTree(item.children, level + 1)}
            </div>
        ));
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Super Admin'} userEmail={user?.email} />
                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8 flex flex-col min-h-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
                        <div>
                            <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm mb-4"><ChevronLeft className="w-4 h-4" /> Back</button>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{sectionName} <span className="text-indigo-600">Question Bank</span></h1>
                            <p className="text-sm text-slate-500 font-medium">Independent questions and hierarchy silo.</p>
                        </div>
                        <button 
                            onClick={() => handleOpenAddMcq()} 
                            disabled={!selectedItem || selectedItem.type === 'subject'}
                            className={`flex items-center gap-2 px-6 py-3 font-black uppercase tracking-wider text-[11px] rounded-2xl transition-all shadow-xl active:scale-95 ${(!selectedItem || selectedItem.type === 'subject') ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
                        >
                            <Plus className="w-4 h-4" /> New Question
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
                        <div className="w-full lg:w-80 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-28 lg:h-[calc(100vh-220px)]">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/80">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="text" placeholder="Filter..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {renderTree(data)}
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col min-h-[500px] overflow-hidden">
                            {selectedItem ? (
                                <>
                                    <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center">
                                        <h2 className="text-xl font-black text-slate-900">{selectedItem.title}</h2>
                                        <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{questions.length} Questions</span>
                                    </div>
                                    <div className="flex-1 p-6 space-y-4 bg-slate-50/30 overflow-y-auto custom-scrollbar">
                                        {questions.map((q, idx) => (
                                            <div key={q.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">{idx + 1}</span>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { setEditingMcq(q); setMcqForm({ ...q, test_section_id: sectionId }); setIsMcqModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteMcq(q.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                                <div className="text-slate-800 font-bold mb-4"><MarkdownRenderer content={q.question} /></div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {['A', 'B', 'C', 'D'].map(opt => (
                                                        <div key={opt} className={`px-4 py-3 rounded-xl border text-sm font-medium ${q.correct_option === opt ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                                            <span className="font-black mr-2">{opt}:</span> <MarkdownRenderer content={q[`option_${opt.toLowerCase()}`]} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {questions.length === 0 && <div className="h-full flex items-center justify-center text-slate-400 font-bold italic">No questions yet.</div>}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                    <TargetIcon className="w-16 h-16 opacity-10 mb-4" />
                                    <p className="font-bold">Select a topic to view questions</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {isMcqModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">{editingMcq ? 'Edit' : 'Add'} Question</h3>
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">
                                    Target: {selectedItem?.title || 'Unknown Topic'}
                                </p>
                            </div>
                            <button onClick={() => setIsMcqModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            <RichTextEditor value={mcqForm.question} onChange={(v) => setMcqForm({ ...mcqForm, question: v })} placeholder="Question..." height="h-32" />
                            <div className="grid grid-cols-2 gap-4">
                                {['a', 'b', 'c', 'd'].map(opt => (
                                    <input key={opt} type="text" value={(mcqForm as any)[`option_${opt}`]} onChange={(e) => setMcqForm({ ...mcqForm, [`option_${opt}`]: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-50 border rounded-xl font-bold" placeholder={`Option ${opt.toUpperCase()}`} />
                                ))}
                            </div>
                            <div className="flex gap-4">
                                {['A', 'B', 'C', 'D'].map(opt => (
                                    <button key={opt} onClick={() => setMcqForm({ ...mcqForm, correct_option: opt })}
                                        className={`flex-1 py-2 rounded-xl font-black ${mcqForm.correct_option === opt ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setIsMcqModalOpen(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                            <button onClick={handleSaveMcq} className="px-6 py-2 bg-slate-900 text-white font-black rounded-xl">Save Question</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
