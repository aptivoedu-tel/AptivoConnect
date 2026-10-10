'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ChevronRight, ChevronDown, Layers, Hash, FileText,
    Search, Target as TargetIcon, Book,
    Save, ChevronLeft, X
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { toast } from 'sonner';
import { useUI } from '@/lib/context/UIContext';
import { useLoading } from '@/lib/context/LoadingContext';
import RichTextEditor from '@/components/shared/RichTextEditor';

type HierarchyItem = {
    id: string;
    dbId: number;
    type: 'subject' | 'topic' | 'subtopic';
    title: string;
    children?: HierarchyItem[];
    expanded?: boolean;
    content?: string;
};

export default function IndependentLessonsPage() {
    const params = useParams();
    const router = useRouter();
    const sectionId = parseInt(params.sectionId as string);
    const [user, setUser] = useState<any>(null);
    const [sectionName, setSectionName] = useState('');
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [data, setData] = useState<HierarchyItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<HierarchyItem | null>(null);
    const [lessonContent, setLessonContent] = useState('');
    const { isSidebarCollapsed } = useUI();

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
        setGlobalLoading(true, 'Syncing Content Library...');
        try {
            const [subRes, topRes, stRes] = await Promise.all([
                fetch(`/api/mongo/content?type=subjects&test_section_id=${sectionId}`).then(r => r.json()),
                fetch(`/api/mongo/content?type=topics&test_section_id=${sectionId}`).then(r => r.json()),
                fetch(`/api/mongo/content?type=subtopics&test_section_id=${sectionId}`).then(r => r.json()),
            ]);

            const subjects = subRes.subjects || [];
            const topics = topRes.topics || [];
            const subtopics = stRes.subtopics || [];

            const tree: HierarchyItem[] = subjects.map((s: any) => {
                const subjectTopics = topics.filter((t: any) => t.subject_id === s.id);
                const processedTopics = subjectTopics.map((t: any): HierarchyItem => {
                    const topicSubtopics = subtopics.filter((st: any) => st.topic_id === t.id);
                    const processedSubtopics: HierarchyItem[] = topicSubtopics.map((st: any): HierarchyItem => {
                        return { 
                            id: `st-${st.id}`, 
                            dbId: st.id, 
                            type: 'subtopic', 
                            title: st.name,
                            content: st.content_markdown || ''
                        };
                    });
                    return { 
                        id: `t-${t.id}`, 
                        dbId: t.id, 
                        type: 'topic', 
                        title: t.name, 
                        children: processedSubtopics, 
                        expanded: false,
                        content: t.content_markdown || ''
                    };
                });
                return { id: `s-${s.id}`, dbId: s.id, type: 'subject', title: s.name, children: processedTopics, expanded: true };
            });
            setData(tree);
        } catch (err) {
            console.error('Error loading hierarchy:', err);
            toast.error('Failed to load hierarchy');
        } finally {
            setGlobalLoading(false);
        }
    };

    const handleSaveLesson = async () => {
        if (!selectedItem || selectedItem.type === 'subject') return;

        setGlobalLoading(true, 'Publishing Updates...');
        try {
            const res = await fetch('/api/mongo/content', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedItem.dbId,
                    type: selectedItem.type,
                    content_markdown: lessonContent
                })
            });

            if (res.ok) {
                toast.success('Lesson content saved successfully');
                // Update local state
                setSelectedItem({ ...selectedItem, content: lessonContent });
                loadHierarchy(); // Refresh to keep in sync
            } else {
                throw new Error('Failed to save');
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setGlobalLoading(false);
        }
    };

    const toggleExpand = (itemId: string) => {
        setData(prev => {
            const updateItem = (items: HierarchyItem[]): HierarchyItem[] => {
                return items.map(item => {
                    if (item.id === itemId) return { ...item, expanded: !item.expanded };
                    if (item.children) return { ...item, children: updateItem(item.children) };
                    return item;
                });
            };
            return updateItem(prev);
        });
    };

    const renderTree = (items: HierarchyItem[], level = 0) => {
        return items.map(item => (
            <div key={item.id} className="select-none">
                <div 
                    onClick={() => {
                        if (item.type !== 'subject') {
                            setSelectedItem(item);
                            setLessonContent(item.content || '');
                        }
                        if (item.type !== 'subtopic') {
                            toggleExpand(item.id);
                        }
                    }}
                    className={`
                        flex items-center gap-2 py-2 px-3 rounded-xl cursor-pointer transition-all mb-1
                        ${selectedItem?.id === item.id ? 'bg-amber-100 text-amber-700 shadow-sm ring-1 ring-amber-200' : 'hover:bg-slate-100 text-slate-600'}
                    `}
                    style={{ marginLeft: `${level * 16}px` }}
                >
                    {item.type !== 'subtopic' && (
                        <span>{item.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                    )}
                    {item.type === 'subject' && <Layers className="w-4 h-4 text-purple-500" />}
                    {item.type === 'topic' && <Hash className="w-4 h-4 text-emerald-500" />}
                    {item.type === 'subtopic' && <FileText className="w-4 h-4 text-slate-400" />}
                    <span className={`text-sm ${item.type === 'subject' ? 'font-black uppercase tracking-tight' : 'font-bold'}`}>
                        {item.title}
                    </span>
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
                    <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col min-h-0">
                        {/* Header Area */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-4">
                                <button onClick={() => router.back()} className="p-3 bg-white rounded-2xl border border-gray-100 text-slate-400 hover:text-teal-600 transition-all shadow-sm">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                        <Book className="w-6 h-6 text-amber-500" />
                                        {sectionName || 'Independent'} Reading Material
                                    </h1>
                                    <p className="text-sm text-slate-500 font-medium">Create and manage educational content for each topic.</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedItem && (
                                    <button 
                                        onClick={handleSaveLesson}
                                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
                                    >
                                        <Save className="w-4 h-4" /> Save Lesson
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 flex gap-6 min-h-0">
                            {/* Left Sidebar: Hierarchy */}
                            <div className="w-80 flex flex-col gap-4 min-h-0">
                                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-3">
                                    <Search className="w-5 h-5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search topics..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-slate-700"
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1 bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm overflow-y-auto custom-scrollbar">
                                    <div className="mb-4 px-2 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hierarchy Tree</span>
                                    </div>
                                    {renderTree(data.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())))}
                                </div>
                            </div>

                            {/* Right Panel: Editor */}
                            <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                {selectedItem ? (
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-slate-50/30">
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900">{selectedItem.title}</h2>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editing Subtopic Content</p>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedItem(null)}
                                                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                                            <RichTextEditor 
                                                value={lessonContent}
                                                onChange={setLessonContent}
                                                placeholder="# Welcome to the Lesson\n\nWrite your content here using **Markdown**..."
                                                height="h-[600px]"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                        <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center mb-6">
                                            <Book className="w-10 h-10 text-amber-400" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 mb-2">Select a Subtopic</h3>
                                        <p className="text-slate-500 max-w-sm font-medium">Choose a subtopic from the tree on the left to start writing its reading material.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
