'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
import { Save, CheckCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Layers, BookOpen, FileText } from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';

type HierarchyNode = {
    id: number;
    name: string;
    type: 'subject' | 'topic' | 'subtopic';
    children?: HierarchyNode[];
    isSelected?: boolean;
    expanded?: boolean;
};

type BaseTree = Omit<HierarchyNode, 'isSelected' | 'expanded'> & {
    children?: BaseTree[];
};

export default function TestSectionContentMapperPage() {
    const [loading, setLoading] = useState(true);
    const [testSections, setTestSections] = useState<any[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
    const [selectedFallbackId, setSelectedFallbackId] = useState<number | null>(null);
    const [strictlyNoFallback, setStrictlyNoFallback] = useState(false);
    const [repeatOnEmpty, setRepeatOnEmpty] = useState(false);
    const [globalSessionLimit, setGlobalSessionLimit] = useState(10);
    const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(['all']);
    const [isDifficultyOpen, setIsDifficultyOpen] = useState(false);
    
    const [baseTree, setBaseTree] = useState<BaseTree[]>([]);
    const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [mappingLoadFailed, setMappingLoadFailed] = useState(false);
    const { isSidebarCollapsed } = useUI();

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [sectionRes, contentRes] = await Promise.all([
                    fetch('/api/mongo/test-sections?include_counts=true'),
                    fetch('/api/mongo/content')
                ]);

                if (sectionRes.ok && contentRes.ok) {
                    const sectionData = await sectionRes.json();
                    const contentData = await contentRes.json();

                    const sections = sectionData.sections || [];
                    const subjects = contentData.subjects || [];
                    const topics = contentData.topics || [];
                    const subtopics = contentData.subtopics || [];

                    setTestSections(sections);

                    if (subjects && topics && subtopics) {
                        const tree: BaseTree[] = subjects.map((sub: any) => ({
                            id: sub.id,
                            name: sub.name,
                            type: 'subject' as const,
                            children: topics
                                .filter((t: any) => t.subject_id === sub.id)
                                .map((t: any) => ({
                                    id: t.id,
                                    name: t.name,
                                    type: 'topic' as const,
                                    children: subtopics
                                        .filter((st: any) => st.topic_id === t.id)
                                        .map((st: any) => ({
                                            id: st.id,
                                            name: st.name,
                                            type: 'subtopic' as const,
                                        }))
                                }))
                        }));
                        setBaseTree(tree);
                        setHierarchy(applySelection(tree, new Set(), new Set(), true));
                    }
                }
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const applySelection = (tree: BaseTree[], selectedSubtopicIds: Set<number>, selectedTopicIds: Set<number>, firstLoad = false): HierarchyNode[] => {
        return tree.map((sub, sIdx) => {
            const updatedTopics: HierarchyNode[] = (sub.children || []).map((topic, tIdx) => {
                const updatedSubtopics: HierarchyNode[] = (topic.children || []).map(st => ({
                    ...st,
                    type: 'subtopic' as const,
                    isSelected: selectedSubtopicIds.has(Number(st.id)),
                }));

                const isTopicSelected = updatedSubtopics.length > 0
                    ? updatedSubtopics.some(st => st.isSelected)
                    : selectedTopicIds.has(Number(topic.id));

                return {
                    ...topic,
                    type: 'topic' as const,
                    isSelected: isTopicSelected,
                    expanded: false,
                    children: updatedSubtopics,
                };
            });

            const isSubjectSelected = updatedTopics.some(t => t.isSelected);

            return {
                ...sub,
                type: 'subject' as const,
                isSelected: isSubjectSelected,
                expanded: firstLoad ? true : isSubjectSelected,
                children: updatedTopics,
            };
        });
    };

    const loadMappings = useCallback(async (sectionId: number) => {
        if (!sectionId || baseTree.length === 0) return;
        setLoading(true);
        setStatusMsg(null);
        setMappingLoadFailed(false);
        try {
            const res = await fetch(`/api/test-section-mapper?test_section_id=${sectionId}`);
            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Failed to load mappings');

            const mappings: any[] = json.data || [];

            if (mappings.length > 0) {
                setStatusMsg({ type: 'success', text: `Loaded ${mappings.length} existing mappings.` });
            }

            const selectedSubtopicIds = new Set<number>(
                mappings.filter((m: any) => m.subtopic_id != null).map((m: any) => m.subtopic_id as number)
            );

            const selectedTopicIds = new Set<number>(
                mappings.filter((m: any) => m.topic_id != null && m.subtopic_id == null).map((m: any) => m.topic_id as number)
            );

            if (mappings.length > 0) {
                if (mappings[0].session_limit != null) {
                    setGlobalSessionLimit(mappings[0].session_limit);
                }
                if (mappings[0].difficulty_level) {
                    const level = mappings[0].difficulty_level as string;
                    setSelectedDifficulties(level.includes(',') ? level.split(',') : [level]);
                } else {
                    setSelectedDifficulties(['all']);
                }
            } else {
                setGlobalSessionLimit(10);
                setSelectedDifficulties(['all']);
            }

            const currentSection = testSections.find(s => s.id === sectionId);
            if (currentSection) {
                setSelectedFallbackId(currentSection.fallback_test_section_id || null);
                setStrictlyNoFallback(currentSection.strictly_no_fallback || false);
                setRepeatOnEmpty(currentSection.repeat_on_empty || false);
            }

            setHierarchy(applySelection(baseTree, selectedSubtopicIds, selectedTopicIds, false));
        } catch (e) {
            console.error('Load mappings error:', e);
            setStatusMsg({ type: 'error', text: 'CRITICAL: Failed to load existing mappings. Please do not save to avoid overwriting data.' });
            setMappingLoadFailed(true);
            setHierarchy(applySelection(baseTree, new Set(), new Set(), false));
        } finally {
            setLoading(false);
        }
    }, [baseTree, testSections]);

    useEffect(() => {
        if (selectedSectionId) {
            loadMappings(selectedSectionId);
        }
    }, [selectedSectionId, loadMappings]);

    const toggleNode = (nodeType: string, nodeId: number) => {
        setHierarchy(prev => {
            const clone = JSON.parse(JSON.stringify(prev)) as HierarchyNode[];
            if (nodeType === 'subject') {
                const node = clone.find(n => n.id === nodeId);
                if (node) node.expanded = !node.expanded;
            } else if (nodeType === 'topic') {
                for (const sub of clone) {
                    const topic = sub.children?.find(t => t.id === nodeId);
                    if (topic) { topic.expanded = !topic.expanded; break; }
                }
            }
            return clone;
        });
    };

    const handleSelection = (type: 'subject' | 'topic' | 'subtopic', id: number, parentId?: number, grandParentId?: number) => {
        setHierarchy(prev => {
            const newHierarchy: HierarchyNode[] = JSON.parse(JSON.stringify(prev));

            if (type === 'subject') {
                const sub = newHierarchy.find(s => s.id === id);
                if (sub) {
                    const newState = !sub.isSelected;
                    sub.isSelected = newState;
                    sub.children?.forEach(topic => {
                        topic.isSelected = newState;
                        topic.children?.forEach(st => st.isSelected = newState);
                    });
                }
            } else if (type === 'topic') {
                const sub = newHierarchy.find(s => s.id === parentId);
                if (sub) {
                    const topic = sub.children?.find(t => t.id === id);
                    if (topic) {
                        const newState = !topic.isSelected;
                        topic.isSelected = newState;
                        topic.children?.forEach(st => st.isSelected = newState);
                        sub.isSelected = sub.children?.some(t => t.isSelected) ?? false;
                    }
                }
            } else if (type === 'subtopic') {
                const sub = newHierarchy.find(s => s.id === grandParentId);
                if (sub) {
                    const topic = sub.children?.find(t => t.id === parentId);
                    if (topic) {
                        const st = topic.children?.find(s => s.id === id);
                        if (st) {
                            st.isSelected = !st.isSelected;
                            topic.isSelected = topic.children?.some(c => c.isSelected) ?? false;
                            sub.isSelected = sub.children?.some(c => c.isSelected) ?? false;
                        }
                    }
                }
            }
            return newHierarchy;
        });
    };

    const toggleDifficulty = (value: string) => {
        if (value === 'all') {
            setSelectedDifficulties(['all']);
        } else {
            let newSelection = [...selectedDifficulties];
            if (newSelection.includes('all')) {
                newSelection = [value];
            } else {
                if (newSelection.includes(value)) {
                    newSelection = newSelection.filter(v => v !== value);
                    if (newSelection.length === 0) newSelection = ['all'];
                } else {
                    newSelection.push(value);
                }
            }
            const allSpecific = ['easy', 'medium', 'hard'];
            const hasAll = allSpecific.every(l => newSelection.includes(l));
            setSelectedDifficulties(hasAll ? ['all'] : newSelection);
        }
    };

    const handleSave = async () => {
        if (!selectedSectionId) return;
        setSaving(true);
        setStatusMsg(null);

        const difficultyString = selectedDifficulties.join(',');

        const rows: any[] = [];
        hierarchy.forEach(subject => {
            subject.children?.forEach(topic => {
                topic.children?.forEach(subtopic => {
                    if (subtopic.isSelected) {
                        rows.push({
                            test_section_id: selectedSectionId,
                            subject_id: subject.id,
                            topic_id: topic.id,
                            subtopic_id: subtopic.id,
                            is_active: true,
                            session_limit: globalSessionLimit,
                            difficulty_level: difficultyString
                        });
                    }
                });

                if (topic.isSelected && (!topic.children || topic.children.length === 0)) {
                    rows.push({
                        test_section_id: selectedSectionId,
                        subject_id: subject.id,
                        topic_id: topic.id,
                        subtopic_id: null,
                        is_active: true,
                        session_limit: globalSessionLimit,
                        difficulty_level: difficultyString
                    });
                }
            });
        });

        try {
            const res = await fetch('/api/test-section-mapper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    test_section_id: selectedSectionId,
                    rows
                })
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to preserve historical patterns.');

            if (selectedSectionId) {
                await fetch('/api/mongo/test-sections', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: selectedSectionId,
                        fallback_test_section_id: selectedFallbackId,
                        strictly_no_fallback: strictlyNoFallback,
                        repeat_on_empty: repeatOnEmpty
                    })
                });
                
                setTestSections(prev => prev.map(s => 
                    s.id === selectedSectionId ? { 
                        ...s, 
                        fallback_test_section_id: selectedFallbackId,
                        strictly_no_fallback: strictlyNoFallback,
                        repeat_on_empty: repeatOnEmpty
                    } : s
                ));
            }

            setStatusMsg({ type: 'success', text: 'Propagating logic to global clusters... Success.' });
        } catch (e: any) {
            console.error(e);
            setStatusMsg({ type: 'error', text: `Failed to save: ${e.message}` });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Test Section Content Mapper</h1>
                            <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Assign granular content permissions to Test Sections.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Target Test Section</label>
                                <select
                                    value={selectedSectionId || ''}
                                    onChange={(e) => setSelectedSectionId(parseInt(e.target.value))}
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 transition-all font-bold text-slate-700 text-sm"
                                >
                                    <option value="">-- Choose a Test Section --</option>
                                    {testSections.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.mcqCount || 0})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Inheritance Fallback</label>
                                <select
                                    disabled={!selectedSectionId}
                                    value={strictlyNoFallback ? (repeatOnEmpty ? 'repeat' : 'strict') : (selectedFallbackId || '')}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === 'strict') {
                                            setSelectedFallbackId(null);
                                            setStrictlyNoFallback(true);
                                            setRepeatOnEmpty(false);
                                        } else if (val === 'repeat') {
                                            setSelectedFallbackId(null);
                                            setStrictlyNoFallback(true);
                                            setRepeatOnEmpty(true);
                                        } else {
                                            setSelectedFallbackId(val ? parseInt(val) : null);
                                            setStrictlyNoFallback(false);
                                            setRepeatOnEmpty(false);
                                        }
                                    }}
                                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 transition-all font-bold text-slate-700 text-sm disabled:opacity-50"
                                >
                                    <option value="">No Fallback (Universal Only)</option>
                                    <option value="strict">Strict (Self-Only)</option>
                                    <option value="repeat">Strict (Self-Only + Repeat Mode)</option>
                                    {testSections
                                        .filter(s => s.id !== selectedSectionId)
                                        .map(s => (
                                            <option key={s.id} value={s.id}>Inherit from {s.name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>

                        {selectedSectionId && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-violet-600">
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Content Hierarchy</h2>
                                        </div>
                                    </div>

                                    {!testSections.find(s => s.id === selectedSectionId)?.is_independent && (
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                        <div className="flex items-center justify-between gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Limit</span>
                                            <input
                                                type="number"
                                                value={globalSessionLimit}
                                                onChange={(e) => setGlobalSessionLimit(parseInt(e.target.value) || 10)}
                                                className="w-12 bg-transparent outline-none text-center font-black text-violet-600 border-b border-violet-100 focus:border-violet-600 transition-colors"
                                            />
                                        </div>

                                        <div className="relative z-50">
                                            <div
                                                className="flex items-center justify-between gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 cursor-pointer min-w-[150px] hover:border-violet-300 transition-colors"
                                                onClick={() => setIsDifficultyOpen(!isDifficultyOpen)}
                                            >
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Difficulty</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-violet-600">
                                                        {selectedDifficulties.includes('all') ? 'All Levels' : `${selectedDifficulties.length} Selected`}
                                                    </span>
                                                    <ChevronDown className={`w-3 h-3 text-violet-600 transition-transform ${isDifficultyOpen ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>

                                            {isDifficultyOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setIsDifficultyOpen(false)} />
                                                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
                                                        {[
                                                            { value: 'all', label: 'All Levels' },
                                                            { value: 'easy', label: 'Basic' },
                                                            { value: 'medium', label: 'Intermediate' },
                                                            { value: 'hard', label: 'Advanced' },
                                                        ].map((opt, i, arr) => (
                                                            <div
                                                                key={opt.value}
                                                                className={`flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}
                                                                onClick={() => toggleDifficulty(opt.value)}
                                                            >
                                                                <span className="text-xs font-bold text-slate-700">{opt.label}</span>
                                                                {selectedDifficulties.includes(opt.value) && <CheckCircle className="w-4 h-4 text-violet-600" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleSave}
                                            disabled={saving || loading || mappingLoadFailed}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-violet-600 text-white font-black uppercase tracking-wider text-[11px] rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-violet-100 active:scale-95 disabled:opacity-50"
                                        >
                                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                    )}
                                </div>

                                {statusMsg && (
                                    <div className={`p-4 ${statusMsg.type === 'success' ? 'bg-green-50 text-emerald-700' : 'bg-red-50 text-red-700'} flex items-center gap-2 border-b border-gray-100`}>
                                        {statusMsg.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                                        {statusMsg.text}
                                    </div>
                                )}

                                <div className="p-6">
                                    {testSections.find(s => s.id === selectedSectionId)?.is_independent ? (
                                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500 text-center">
                                            <AlertCircle className="w-12 h-12 text-violet-300 mb-2" />
                                            <h3 className="text-lg font-black text-slate-800">Independent Global Exam</h3>
                                            <p className="text-sm font-medium max-w-md">
                                                This exam has its own private hierarchy and question bank. It cannot be mapped to the global content database. 
                                                <br/><br/>
                                                Please use the <b>Hierarchy</b>, <b>Question Bank</b>, and <b>Lessons</b> buttons on the Global Exams page to manage its content.
                                            </p>
                                        </div>
                                    ) : loading ? (
                                        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            <span className="text-sm font-medium">Loading mappings...</span>
                                        </div>
                                    ) : (
                                        <>
                                            {hierarchy.map(subject => (
                                                <div key={subject.id} className="mb-4 border border-gray-100 rounded-xl overflow-hidden">
                                                    <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={subject.isSelected ?? false}
                                                                onChange={() => handleSelection('subject', subject.id)}
                                                                className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500 cursor-pointer"
                                                            />
                                                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleNode('subject', subject.id)}>
                                                                <Layers className="w-4 h-4 text-slate-400" />
                                                                <span className="font-bold text-slate-800">{subject.name}</span>
                                                                {subject.isSelected && (
                                                                    <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                                                                        {subject.children?.filter((t: any) => t.isSelected).length} topics
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button onClick={() => toggleNode('subject', subject.id)} className="p-1">
                                                            {subject.expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                                        </button>
                                                    </div>

                                                    {subject.expanded && (
                                                        <div className="border-t border-gray-100 bg-white">
                                                            {subject.children?.map(topic => (
                                                                <div key={topic.id} className="ml-8 border-l-2 border-gray-100">
                                                                    <div className="flex items-center gap-3 p-3 hover:bg-violet-50/30 transition-colors">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={topic.isSelected ?? false}
                                                                            onChange={() => handleSelection('topic', topic.id, subject.id)}
                                                                            className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500 cursor-pointer"
                                                                        />
                                                                        <div className="flex-1 flex items-center justify-between cursor-pointer" onClick={() => toggleNode('topic', topic.id)}>
                                                                            <div className="flex items-center gap-2">
                                                                                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                                                                <span className="text-sm font-bold text-slate-700">{topic.name}</span>
                                                                                {topic.isSelected && topic.children && topic.children.length > 0 && (
                                                                                    <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
                                                                                        {topic.children.filter((st: any) => st.isSelected).length}/{topic.children.length}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {topic.children && topic.children.length > 0 && (
                                                                                topic.expanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {topic.expanded && (
                                                                        <div className="ml-8 mb-2 space-y-1">
                                                                            {topic.children?.map(subtopic => (
                                                                                <label key={subtopic.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={subtopic.isSelected ?? false}
                                                                                        onChange={() => handleSelection('subtopic', subtopic.id, topic.id, subject.id)}
                                                                                        className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500 cursor-pointer"
                                                                                    />
                                                                                    <FileText className="w-3 h-3 text-slate-300" />
                                                                                    <span className="text-sm text-slate-600">{subtopic.name}</span>
                                                                                </label>
                                                                            ))}
                                                                            {(!topic.children || topic.children.length === 0) && (
                                                                                <div className="text-xs italic text-slate-400 pl-9 py-1">No lessons available</div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {(!subject.children || subject.children.length === 0) && (
                                                                <div className="p-4 text-sm text-slate-400">No topics in this subject.</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {hierarchy.length === 0 && (
                                                <div className="text-center text-slate-400 py-10">No content found. Please add content in Hierarchy Manager.</div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {!selectedSectionId && (
                            <div className="text-center py-20 text-slate-400">
                                <ChevronDown className="w-10 h-10 mx-auto mb-4 text-gray-300" />
                                <p>Select a test section to start mapping content.</p>
                            </div>
                        )}
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}
