'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    ChevronRight, ChevronDown, Layers, Hash, FileText,
    Search, Target as TargetIcon, CheckCircle2, HelpCircle,
    Plus, Filter, ArrowRightLeft, Pencil, UploadCloud,
    University, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { toast } from 'sonner';
import { X, Save, Trash2 } from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';
import { useLoading } from '@/lib/context/LoadingContext';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import RichTextEditor from '@/components/shared/RichTextEditor';

type HierarchyItem = {
    id: string;
    dbId: number;
    type: 'subject' | 'topic' | 'subtopic';
    title: string;
    parentId?: number | null;
    children?: HierarchyItem[];
    expanded?: boolean;
    mcqCount?: number;
};

export default function UniQuestionBankPage() {
    const [user, setUser] = useState<any>(null);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [data, setData] = useState<HierarchyItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<HierarchyItem | null>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [universitiesList, setUniversitiesList] = useState<any[]>([]);
    const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null);
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const [passages, setPassages] = useState<any[]>([]);

    // MCQ Modal State
    const [isMcqModalOpen, setIsMcqModalOpen] = useState(false);
    const [editingMcq, setEditingMcq] = useState<any>(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
    const [mcqForm, setMcqForm] = useState({
        question: '',
        question_type: 'mcq_single',
        difficulty: 'medium',
        option_a: '', option_b: '', option_c: '', option_d: '',
        correct_option: 'A',
        explanation: '',
        question_image_url: '',
        question_image_type: 'direct',
        explanation_url: '',
        explanation_image_type: 'direct',
        university_id: null as number | null
    });

    // Rename State
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [editingHierarchyItem, setEditingHierarchyItem] = useState<HierarchyItem | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Transfer State
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferTarget, setTransferTarget] = useState({ subjectId: '', topicId: '', subtopicId: '' });
    const [subjectsList, setSubjectsList] = useState<any[]>([]);
    const [topicsList, setTopicsList] = useState<any[]>([]);
    const [subtopicsList, setSubtopicsList] = useState<any[]>([]);
    const [isBulkTransfer, setIsBulkTransfer] = useState(false);
    const [transferringMcqId, setTransferringMcqId] = useState<number | null>(null);

    const [isUniDropdownOpen, setIsUniDropdownOpen] = useState(false);
    const uniDropdownRef = useRef<HTMLDivElement>(null);

    const { isSidebarCollapsed } = useUI();

    const convertDriveLink = (url: string) => {
        if (!url) return '';
        if (url.includes('drive.google.com')) {
            const idMatch = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
            if (idMatch?.[1]) return `https://lh3.googleusercontent.com/u/0/d/${idMatch[1]}=w1000`;
        }
        return url;
    };

    const loadUniversities = async () => {
        try {
            const res = await fetch('/api/mongo/universities?include_counts=true');
            if (res.ok) {
                const data = await res.json();
                setUniversitiesList(data.universities || []);
            }
        } catch (e) { console.error(e); }
    };

    const loadHierarchyForUni = async (uniId: number) => {
        setGlobalLoading(true, 'Loading University Content...');
        setSelectedItem(null);
        setQuestions([]);
        try {
            const [mapRes, countsRes] = await Promise.all([
                fetch(`/api/content-mapper?university_id=${uniId}`),
                fetch(`/api/mongo/mcqs?counts_only=true&university_id=${uniId}`)
            ]);

            const countsData = countsRes.ok ? await countsRes.json() : {};
            const mcqCounts = countsData.counts || { subtopics: {}, topics: {} };
            const allSubjects = countsData.subjects || [];
            const allTopics = countsData.topics || [];
            const allSubtopics = countsData.subtopics || [];

            setSubjectsList(allSubjects);
            setTopicsList(allTopics);
            setSubtopicsList(allSubtopics);

            let mappedSubtopicIds: number[] = [];
            let mappedTopicIds: number[] = [];
            let mappedSubjectIds: number[] = [];
            let hasMappings = false;

            if (mapRes.ok) {
                const mapData = await mapRes.json();
                const mappings = mapData.data || [];
                hasMappings = mappings.length > 0;
                mappings.forEach((m: any) => {
                    if (m.subtopic_id) mappedSubtopicIds.push(m.subtopic_id);
                    if (m.topic_id) mappedTopicIds.push(m.topic_id);
                    if (m.subject_id) mappedSubjectIds.push(m.subject_id);
                });
            }

            // If no mappings exist — show the full content tree (no restriction)
            const subjectsToShow = hasMappings
                ? allSubjects.filter((s: any) =>
                    mappedSubjectIds.includes(s.id) ||
                    allTopics.some((t: any) => t.subject_id === s.id && (
                        mappedTopicIds.includes(t.id) ||
                        allSubtopics.some((st: any) => st.topic_id === t.id && mappedSubtopicIds.includes(st.id))
                    ))
                )
                : allSubjects;

            const tree: HierarchyItem[] = subjectsToShow.map((s: any) => {
                const isSubjectMapped = mappedSubjectIds.includes(s.id);
                
                const subjectTopics = hasMappings
                    ? allTopics.filter((t: any) => t.subject_id === s.id && (
                        isSubjectMapped ||
                        mappedTopicIds.includes(t.id) ||
                        allSubtopics.some((st: any) => st.topic_id === t.id && mappedSubtopicIds.includes(st.id))
                    ))
                    : allTopics.filter((t: any) => t.subject_id === s.id);

                const processedTopics = subjectTopics.map((t: any): HierarchyItem => {
                    const isTopicMapped = isSubjectMapped || mappedTopicIds.includes(t.id);
                    
                    const topicSubtopics = hasMappings
                        ? allSubtopics.filter((st: any) => st.topic_id === t.id && (
                            isTopicMapped || 
                            mappedSubtopicIds.includes(st.id)
                        ))
                        : allSubtopics.filter((st: any) => st.topic_id === t.id);

                    const processedSubtopics: HierarchyItem[] = topicSubtopics.map((st: any): HierarchyItem => {
                        const count = mcqCounts.subtopics[st.id] || 0;
                        return { id: `st-${st.id}`, dbId: st.id, type: 'subtopic', title: st.name, parentId: t.id, mcqCount: count };
                    });

                    // To get the total topic count, we should count all MCQs matching this topic_id for this university
                    // This handles cases where MCQs are assigned to the topic directly (subtopic_id is null)
                    const totalTopicCount = mcqCounts.topics[t.id] || 0;

                    return { id: `t-${t.id}`, dbId: t.id, type: 'topic', title: t.name, parentId: s.id, expanded: false, mcqCount: totalTopicCount, children: processedSubtopics };
                });

                const subjectCount = processedTopics.reduce((acc: number, t: HierarchyItem) => acc + (t.mcqCount || 0), 0);
                return { id: `s-${s.id}`, dbId: s.id, type: 'subject', title: s.name, expanded: false, mcqCount: subjectCount, children: processedTopics };
            });

            setData(tree);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load university content');
        } finally {
            setGlobalLoading(false);
        }
    };

    const loadQuestions = async (item: HierarchyItem, uniId?: number) => {
        const activeUni = uniId ?? selectedUniversityId;
        setGlobalLoading(true, 'Loading Questions...');
        setSelectedQuestionIds([]);
        try {
            let url = `/api/mongo/mcqs?`;
            if (item.type === 'subtopic') url += `subtopic_id=${item.dbId}`;
            else if (item.type === 'topic') url += `topic_id=${item.dbId}`;
            else { setQuestions([]); return; }

            if (activeUni) url += `&university_id=${activeUni}&strict_university=true`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setQuestions(data.mcqs || []);
            }
        } catch (e) { console.error(e); }
        finally { setGlobalLoading(false); }
    };

    const fetchPassages = async () => {
        try {
            const res = await fetch('/api/mongo/passages');
            if (res.ok) { const d = await res.json(); setPassages(d.passages || []); }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (uniDropdownRef.current && !uniDropdownRef.current.contains(event.target as Node)) {
                setIsUniDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const u = AuthService.getCurrentUser();
        if (u) setUser(u);
        loadUniversities();
        fetchPassages();
    }, []);

    const handleUniversityChange = (uniId: number) => {
        setSelectedUniversityId(uniId);
        loadHierarchyForUni(uniId);
    };

    const handleOpenAddMcq = () => {
        if (!selectedItem || selectedItem.type === 'subject') { toast.error('Select a topic or subtopic first'); return; }
        setEditingMcq(null);
        setMcqForm({
            question: '', question_type: 'mcq_single', difficulty: 'medium',
            option_a: '', option_b: '', option_c: '', option_d: '',
            correct_option: 'A', explanation: '',
            question_image_url: '', question_image_type: 'direct',
            explanation_url: '', explanation_image_type: 'direct',
            university_id: selectedUniversityId
        });
        setIsMcqModalOpen(true);
    };

    const handleOpenEditMcq = (q: any) => {
        setEditingMcq(q);
        setMcqForm({
            question: q.question || '', question_type: q.question_type || 'mcq_single',
            difficulty: q.difficulty || 'medium',
            option_a: q.option_a || '', option_b: q.option_b || '',
            option_c: q.option_c || '', option_d: q.option_d || '',
            correct_option: q.correct_option || 'A', explanation: q.explanation || '',
            question_image_url: q.question_image_url || '',
            question_image_type: q.question_image_url?.includes('googleusercontent') ? 'drive' : 'direct',
            explanation_url: q.explanation_url || '',
            explanation_image_type: q.explanation_url?.includes('googleusercontent') ? 'drive' : 'direct',
            university_id: q.university_id ?? selectedUniversityId
        });
        setIsMcqModalOpen(true);
    };

    const handleSaveMcq = async () => {
        if (!mcqForm.question || !mcqForm.option_a || !mcqForm.option_b) {
            toast.error('Fill in question and at least two options'); return;
        }
        try {
            const processedForm = {
                ...mcqForm,
                question_image_url: mcqForm.question_image_type === 'drive' ? convertDriveLink(mcqForm.question_image_url) : mcqForm.question_image_url,
                explanation_url: mcqForm.explanation_image_type === 'drive' ? convertDriveLink(mcqForm.explanation_url) : mcqForm.explanation_url,
            };
            const { question_image_type, explanation_image_type, ...payload } = {
                ...processedForm,
                subtopic_id: selectedItem?.type === 'subtopic' ? selectedItem.dbId : null,
                topic_id: selectedItem?.type === 'topic' ? selectedItem.dbId : null,
                university_id: mcqForm.university_id,
                is_active: true
            };
            const method = editingMcq ? 'PATCH' : 'POST';
            const res = await fetch('/api/mongo/mcqs', {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingMcq ? { id: editingMcq.id, ...payload } : payload)
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to save'); }
            toast.success(editingMcq ? 'Question updated' : 'Question added');
            setIsMcqModalOpen(false);
            if (selectedItem) loadQuestions(selectedItem);
            if (selectedUniversityId) loadHierarchyForUni(selectedUniversityId);
        } catch (e: any) { toast.error(e.message); }
    };

    const handleDeleteMcq = async (id: number) => {
        if (!confirm('Delete this question?')) return;
        setGlobalLoading(true, 'Deleting...');
        try {
            const res = await fetch(`/api/mongo/mcqs?id=${id}`, { method: 'DELETE' });
            if (res.ok) { toast.success('Deleted'); if (selectedItem) loadQuestions(selectedItem); }
        } catch (e) { toast.error('Failed to delete'); }
        finally { setGlobalLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (selectedQuestionIds.length === 0) return;
        if (!confirm(`Delete ${selectedQuestionIds.length} questions?`)) return;
        setGlobalLoading(true, 'Deleting...');
        try {
            const res = await fetch(`/api/mongo/mcqs?ids=${selectedQuestionIds.join(',')}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success(`Deleted ${selectedQuestionIds.length} questions`);
                setSelectedQuestionIds([]);
                if (selectedItem) loadQuestions(selectedItem);
            }
        } catch (e) { toast.error('Failed'); }
        finally { setGlobalLoading(false); }
    };

    const handleBulkTransfer = async () => {
        if (!transferTarget.topicId) { toast.error('Select a destination topic'); return; }
        const ids = isBulkTransfer ? selectedQuestionIds : [transferringMcqId!];
        setGlobalLoading(true, 'Transferring...');
        try {
            const res = await fetch('/api/mongo/mcqs', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, topic_id: parseInt(transferTarget.topicId), subtopic_id: transferTarget.subtopicId ? parseInt(transferTarget.subtopicId) : null })
            });
            if (res.ok) {
                toast.success('Transferred successfully');
                setIsTransferModalOpen(false); setSelectedQuestionIds([]);
                if (selectedItem) loadQuestions(selectedItem);
            }
        } catch (e: any) { toast.error(e.message); }
        finally { setGlobalLoading(false); }
    };

    const handleSaveHierarchyName = async () => {
        if (!renameValue.trim() || !editingHierarchyItem) return;
        setGlobalLoading(true, 'Updating...');
        try {
            const res = await fetch('/api/mongo/content', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingHierarchyItem.dbId, type: editingHierarchyItem.type, name: renameValue.trim() })
            });
            if (res.ok) {
                toast.success('Renamed successfully');
                setIsRenameModalOpen(false);
                if (selectedUniversityId) loadHierarchyForUni(selectedUniversityId);
            }
        } catch (e: any) { toast.error(e.message); }
        finally { setGlobalLoading(false); }
    };

    const toggleExpand = (id: string, items: HierarchyItem[]): HierarchyItem[] =>
        items.map(item => item.id === id ? { ...item, expanded: !item.expanded } : item.children ? { ...item, children: toggleExpand(id, item.children) } : item);

    const renderTree = (items: HierarchyItem[], level = 0): React.ReactNode => {
        const filtered = items.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.children?.some(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())))
        );
        return filtered.map((item) => (
            <div key={item.id} className="select-none">
                <div
                    className={`group flex items-center gap-3 py-2 px-4 border-b border-teal-50/10 hover:bg-slate-50 transition-all cursor-pointer
                        ${selectedItem?.id === item.id ? 'bg-slate-100 border-l-4 border-l-indigo-600' : 'bg-transparent border-l-4 border-l-transparent'}`}
                    style={{ paddingLeft: `${level * 16 + 16}px` }}
                    onClick={() => {
                        if (item.type === 'subject' || item.type === 'topic') setData(toggleExpand(item.id, data));
                        if (item.type === 'topic' || item.type === 'subtopic') { setSelectedItem(item); loadQuestions(item); }
                    }}
                >
                    <div className={`p-1 rounded text-slate-500 ${!item.children?.length ? 'invisible' : ''}`}>
                        {item.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </div>
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${item.type === 'subject' ? 'bg-teal-500/10 text-teal-400' : item.type === 'topic' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                        {item.type === 'subject' && <Layers className="w-3 h-3" />}
                        {item.type === 'topic' && <Hash className="w-3 h-3" />}
                        {item.type === 'subtopic' && <TargetIcon className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between group/title">
                        <div className={`text-xs font-bold truncate ${selectedItem?.id === item.id ? 'text-slate-900' : 'text-slate-500'}`}>{item.title}</div>
                        <button onClick={(e) => { e.stopPropagation(); setEditingHierarchyItem(item); setRenameValue(item.title); setIsRenameModalOpen(true); }}
                            className="opacity-0 group-hover/title:opacity-100 p-1 hover:bg-white rounded transition-all text-indigo-600 ml-2">
                            <Pencil className="w-2.5 h-2.5" />
                        </button>
                    </div>
                    {item.mcqCount !== undefined && (
                        <div className={`text-[9px] font-black px-1.5 py-0.5 rounded min-w-[20px] text-center ${item.mcqCount > 0 ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            {item.mcqCount}
                        </div>
                    )}
                </div>
                {item.expanded && item.children && <div className="animate-in fade-in duration-200">{renderTree(item.children, level + 1)}</div>}
            </div>
        ));
    };

    const filteredQuestions = difficultyFilter === 'all' ? questions : questions.filter(q => q.difficulty === difficultyFilter);
    const selectedUni = universitiesList.find(u => u.id === selectedUniversityId);

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Super Admin'} userEmail={user?.email} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8 flex flex-col min-h-0">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                                University <span className="text-indigo-600">Question Bank</span>
                            </h1>
                            <p className="text-sm text-slate-500 font-medium">View and edit questions mapped to a specific university.</p>
                        </div>
                        <button onClick={handleOpenAddMcq}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-black uppercase tracking-wider text-[11px] rounded-2xl hover:bg-indigo-600 transition-all shadow-xl active:scale-95">
                            <Plus className="w-4 h-4" /> New Question
                        </button>
                    </div>

                    {/* University Selector Banner */}
                    <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 relative" ref={uniDropdownRef}>
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                            <University className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1 cursor-pointer" onClick={() => setIsUniDropdownOpen(!isUniDropdownOpen)}>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Select University</p>
                            <div className="flex items-center justify-between">
                                <span className={`text-sm font-black ${selectedUni ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {selectedUni ? selectedUni.name : '— Choose a university to browse its question bank —'}
                                </span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isUniDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        {/* Custom Dropdown Overaly */}
                        {isUniDropdownOpen && (
                            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                                    {universitiesList.map((u: any) => (
                                        <div
                                            key={u.id}
                                            onClick={() => {
                                                handleUniversityChange(u.id);
                                                setIsUniDropdownOpen(false);
                                            }}
                                            className={`flex justify-between items-center px-4 py-3 rounded-xl cursor-pointer transition-colors ${selectedUniversityId === u.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                        >
                                            <span className="text-sm font-bold">{u.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${selectedUniversityId === u.id ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>
                                                    {u.mcqCount || 0} QS
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedUni && (
                            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 shrink-0">
                                Active
                            </span>
                        )}
                    </div>

                    {!selectedUniversityId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-slate-200">
                            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                <University className="w-12 h-12 text-indigo-200" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Select a University</h3>
                            <p className="text-slate-500 max-w-md">Choose a university from the dropdown above to browse, add, and edit its dedicated question bank.</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
                            {/* Left Hierarchy Tree */}
                            <div className="w-full lg:w-80 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-28 lg:h-[calc(100vh-220px)]">
                                <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex flex-col gap-3">
                                    <button onClick={handleOpenAddMcq}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-dashed border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-500 rounded-xl transition-all group">
                                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Add New MCQ</span>
                                    </button>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="text" placeholder="Filter hierarchy..." value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none placeholder:text-slate-300" />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    {loading ? null : data.length > 0 ? renderTree(data) : (
                                        <div className="p-8 text-center text-slate-400">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-widest">No content mapped<br />to this university</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Question Panel */}
                            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                                {selectedItem ? (
                                    <>
                                        {/* Header */}
                                        <div className="p-6 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                                                        {selectedUni?.name}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                                        {questions.length} Questions
                                                    </span>
                                                </div>
                                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedItem.title}</h2>
                                            </div>
                                        </div>

                                        {/* Toolbar */}
                                        <div className="px-6 py-4 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4 bg-slate-50/30">
                                            <div className="flex items-center gap-3">
                                                {questions.length > 0 && (
                                                    <div className="flex items-center gap-3 py-1.5 px-3 bg-slate-900 rounded-xl border border-slate-700">
                                                        <label className="flex items-center gap-3 cursor-pointer px-2 border-r border-slate-700 mr-2">
                                                            <div className="relative flex items-center">
                                                                <input type="checkbox"
                                                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-slate-600 bg-slate-800 transition-all checked:bg-teal-500 checked:border-teal-500"
                                                                    checked={selectedQuestionIds.length === questions.length && questions.length > 0}
                                                                    onChange={() => setSelectedQuestionIds(selectedQuestionIds.length === questions.length ? [] : questions.map(q => q.id))} />
                                                                <CheckCircle2 className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                                                            </div>
                                                            <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Select All</span>
                                                        </label>
                                                        {selectedQuestionIds.length > 0 ? (
                                                            <div className="flex items-center gap-4 py-1">
                                                                <button onClick={() => { setIsBulkTransfer(true); setIsTransferModalOpen(true); }} className="flex items-center gap-1.5 text-indigo-400 hover:text-white transition-colors">
                                                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                                                    <span className="text-[10px] font-black uppercase">Transfer ({selectedQuestionIds.length})</span>
                                                                </button>
                                                                <button onClick={handleBulkDelete} className="flex items-center gap-1.5 text-rose-400 hover:text-white transition-colors">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                    <span className="text-[10px] font-black uppercase">Delete ({selectedQuestionIds.length})</span>
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                                                <Filter className="w-4 h-4 text-slate-400" />
                                                <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}
                                                    className="bg-transparent border-none text-[10px] font-black text-slate-600 outline-none uppercase tracking-wider cursor-pointer">
                                                    <option value="all">All Difficulty</option>
                                                    <option value="easy">Easy</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="hard">Hard</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Questions List */}
                                        <div className="flex-1 p-6 space-y-6 bg-slate-50/50 overflow-y-auto custom-scrollbar">
                                            {filteredQuestions.length > 0 ? filteredQuestions.map((q, idx) => {
                                                const showPassageHeader = q.passage_id && (idx === 0 || filteredQuestions[idx - 1].passage_id !== q.passage_id);
                                                const passage = showPassageHeader ? passages.find(p => p.id === q.passage_id) : null;
                                                return (
                                                    <React.Fragment key={`frag-${q.id}`}>
                                                        {showPassageHeader && passage && (
                                                            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl mb-8">
                                                                <h3 className="text-xl font-black text-teal-400 mb-4 flex items-center gap-3">
                                                                    <FileText className="w-5 h-5" />{passage.title || `Passage #${passage.id}`}
                                                                </h3>
                                                                <div className="prose prose-invert max-w-none text-slate-300">
                                                                    <MarkdownRenderer content={passage.content} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className={`bg-white p-6 rounded-xl border transition-all group relative overflow-hidden ${selectedQuestionIds.includes(q.id) ? 'border-indigo-500 ring-1 ring-indigo-500 shadow-lg' : 'border-gray-100 shadow-sm hover:shadow-xl'} ${q.passage_id ? 'ml-8 border-l-4 border-l-slate-800' : ''}`}>
                                                            <div className="absolute top-4 left-4 z-10">
                                                                <div className="relative flex items-center">
                                                                    <input type="checkbox" checked={selectedQuestionIds.includes(q.id)}
                                                                        onChange={() => setSelectedQuestionIds(prev => prev.includes(q.id) ? prev.filter(i => i !== q.id) : [...prev, q.id])}
                                                                        className="peer h-6 w-6 cursor-pointer appearance-none rounded-xl border-2 border-slate-200 bg-white transition-all checked:bg-indigo-600 checked:border-indigo-600" />
                                                                    <CheckCircle2 className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" />
                                                                </div>
                                                            </div>
                                                            <div className="pl-10">
                                                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <div className="flex gap-2">
                                                                        <button onClick={() => { setTransferringMcqId(q.id); setIsBulkTransfer(false); setIsTransferModalOpen(true); }}
                                                                            className="text-slate-400 hover:text-indigo-600 p-1 bg-slate-50 rounded-lg border border-gray-100 transition-colors">
                                                                            <ArrowRightLeft className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button onClick={() => handleOpenEditMcq(q)}
                                                                            className="text-slate-400 hover:text-teal-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-slate-50 rounded-lg border border-gray-100 transition-colors">
                                                                            Edit
                                                                        </button>
                                                                        <button onClick={() => handleDeleteMcq(q.id)}
                                                                            className="text-slate-400 hover:text-rose-600 p-1 bg-slate-50 rounded-lg border border-gray-100 transition-colors">
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">{idx + 1}</span>
                                                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                                            {q.difficulty}
                                                                        </span>
                                                                        {q.university_id && (
                                                                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase border border-indigo-100">
                                                                                {universitiesList.find(u => u.id === q.university_id)?.name || 'Uni Exclusive'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-slate-800 text-lg font-black mb-6 leading-tight">
                                                                    <MarkdownRenderer content={q.question} />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                                    {['A', 'B', 'C', 'D'].map(opt => (
                                                                        <div key={opt} className={`px-5 py-4 rounded-2xl border-2 flex items-center gap-4 ${q.correct_option === opt ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
                                                                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${q.correct_option === opt ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{opt}</span>
                                                                            <div className="text-sm font-bold text-slate-600"><MarkdownRenderer content={q[`option_${opt.toLowerCase()}`]} /></div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {q.explanation && (
                                                                    <div className="p-5 bg-teal-50/30 rounded-2xl border border-teal-50">
                                                                        <div className="flex items-center gap-2 text-teal-700 text-[10px] font-black uppercase tracking-widest mb-2">
                                                                            <HelpCircle className="w-4 h-4" /> Explanation
                                                                        </div>
                                                                        <div className="text-sm text-teal-900/80 font-medium italic"><MarkdownRenderer content={q.explanation} /></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            }) : (
                                                <div className="h-full flex flex-col items-center justify-center text-center p-20">
                                                    <div className="w-24 h-24 bg-white rounded-full shadow-2xl flex items-center justify-center mb-8">
                                                        <TargetIcon className="w-12 h-12 text-indigo-100" />
                                                    </div>
                                                    <h3 className="text-2xl font-black text-slate-900 mb-2">No Questions Found</h3>
                                                    <p className="text-slate-500 max-w-sm">
                                                        {difficultyFilter !== 'all' ? `No ${difficultyFilter} questions. Try a different filter.` : 'No questions yet for this section. Click "Add New MCQ" to get started.'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                                        <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center mb-10 animate-pulse">
                                            <TargetIcon className="w-16 h-16 text-indigo-600 opacity-10" />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Select a Topic or Subtopic</h3>
                                        <p className="text-slate-500 max-w-md font-medium">Click any topic or subtopic from the left panel to view its questions for <strong>{selectedUni?.name}</strong>.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* MCQ Modal */}
            {isMcqModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">{editingMcq ? 'Edit Question' : 'Add New Question'}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedItem?.title} · {selectedUni?.name}</p>
                            </div>
                            <button onClick={() => setIsMcqModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Question</label>
                                <RichTextEditor value={mcqForm.question} onChange={(val) => setMcqForm({ ...mcqForm, question: val })} placeholder="Enter question text..." height="h-40" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Difficulty</label>
                                    <select value={mcqForm.difficulty} onChange={(e) => setMcqForm({ ...mcqForm, difficulty: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-50 border border-gray-100 rounded-xl font-bold outline-none">
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Correct Option</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl">
                                        {['A', 'B', 'C', 'D'].map(opt => (
                                            <button key={opt} onClick={() => setMcqForm({ ...mcqForm, correct_option: opt })}
                                                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${mcqForm.correct_option === opt ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400'}`}>{opt}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">University Association</label>
                                <select value={mcqForm.university_id ?? ''} onChange={(e) => setMcqForm({ ...mcqForm, university_id: e.target.value ? parseInt(e.target.value) : null })}
                                    className="w-full px-5 py-3 bg-slate-50 border border-gray-100 rounded-xl font-bold outline-none">
                                    <option value="">Universal (all universities)</option>
                                    {universitiesList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Answer Options</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {['a', 'b', 'c', 'd'].map(opt => (
                                        <div key={opt} className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">{opt}</span>
                                            <input type="text" value={(mcqForm as any)[`option_${opt}`]}
                                                onChange={(e) => setMcqForm({ ...mcqForm, [`option_${opt}`]: e.target.value })}
                                                className="w-full pl-10 pr-5 py-3 bg-slate-50 border border-gray-100 rounded-xl font-bold outline-none" placeholder={`Option ${opt.toUpperCase()}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Explanation</label>
                                <RichTextEditor value={mcqForm.explanation} onChange={(val) => setMcqForm({ ...mcqForm, explanation: val })} placeholder="Explain the correct answer..." height="h-32" />
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-gray-100 flex justify-end gap-4">
                            <button onClick={() => setIsMcqModalOpen(false)} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleSaveMcq} className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg text-sm">
                                <Save className="w-4 h-4" />{editingMcq ? 'Save Changes' : 'Add Question'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900">Transfer Questions</h3>
                            <button onClick={() => setIsTransferModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination Subject</label>
                                <select value={transferTarget.subjectId} onChange={(e) => setTransferTarget({ ...transferTarget, subjectId: e.target.value, topicId: '', subtopicId: '' })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-gray-100 rounded-2xl font-bold outline-none">
                                    <option value="">Select Subject</option>
                                    {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination Topic</label>
                                <select value={transferTarget.topicId} disabled={!transferTarget.subjectId} onChange={(e) => setTransferTarget({ ...transferTarget, topicId: e.target.value, subtopicId: '' })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-gray-100 rounded-2xl font-bold outline-none disabled:opacity-50">
                                    <option value="">Select Topic</option>
                                    {topicsList.filter(t => t.subject_id === parseInt(transferTarget.subjectId)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination Subtopic (Optional)</label>
                                <select value={transferTarget.subtopicId} disabled={!transferTarget.topicId} onChange={(e) => setTransferTarget({ ...transferTarget, subtopicId: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-gray-100 rounded-2xl font-bold outline-none disabled:opacity-50">
                                    <option value="">None (Topic Level)</option>
                                    {subtopicsList.filter(st => st.topic_id === parseInt(transferTarget.topicId)).map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setIsTransferModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancel</button>
                                <button onClick={handleBulkTransfer} disabled={!transferTarget.topicId} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50">
                                    Transfer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {isRenameModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900">Rename</h3>
                            <button onClick={() => setIsRenameModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveHierarchyName(); if (e.key === 'Escape') setIsRenameModalOpen(false); }}
                                className="w-full px-6 py-4 bg-slate-50 border border-gray-100 rounded-2xl font-bold outline-none text-slate-800" placeholder="New name..." />
                            <div className="flex gap-4">
                                <button onClick={() => setIsRenameModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase">Cancel</button>
                                <button onClick={handleSaveHierarchyName} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
