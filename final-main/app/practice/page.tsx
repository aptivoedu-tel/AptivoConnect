'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import StudentPageSkeleton from '@/components/ui/StudentPageSkeleton';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';
import { 
    Search, 
    ChevronDown, 
    ChevronUp, 
    Calculator, 
    FlaskConical, 
    BookOpen, 
    GraduationCap, 
    Laptop, 
    Globe, 
    TrendingUp, 
    Heart, 
    Brain,
    Palette,
    Zap,
    Atom,
    Dna,
    Languages,
    History,
    Microscope,
    Lightbulb
} from 'lucide-react';

// EXTENDED SUBJECT MAPPING (High-Variety Khan-style)
const SUBJECT_CONFIG: Record<string, { icon: any, color: string, bgColor: string }> = {
    'mathematics': { icon: Calculator, color: 'text-amber-500', bgColor: 'bg-amber-500' },
    'math': { icon: Calculator, color: 'text-amber-500', bgColor: 'bg-amber-500' },
    'physics': { icon: Zap, color: 'text-blue-500', bgColor: 'bg-blue-500' },
    'chemistry': { icon: FlaskConical, color: 'text-emerald-500', bgColor: 'bg-emerald-500' },
    'biology': { icon: Dna, color: 'text-green-500', bgColor: 'bg-green-500' },
    'science': { icon: Microscope, color: 'text-emerald-600', bgColor: 'bg-emerald-600' },
    'english': { icon: BookOpen, color: 'text-rose-500', bgColor: 'bg-rose-500' },
    'verbal': { icon: Languages, color: 'text-rose-400', bgColor: 'bg-rose-400' },
    'test prep': { icon: GraduationCap, color: 'text-orange-500', bgColor: 'bg-orange-500' },
    'mcat': { icon: GraduationCap, color: 'text-orange-600', bgColor: 'bg-orange-600' },
    'sat': { icon: GraduationCap, color: 'text-orange-400', bgColor: 'bg-orange-400' },
    'computing': { icon: Laptop, color: 'text-indigo-500', bgColor: 'bg-indigo-500' },
    'computer': { icon: Laptop, color: 'text-indigo-500', bgColor: 'bg-indigo-500' },
    'history': { icon: History, color: 'text-violet-500', bgColor: 'bg-violet-500' },
    'social': { icon: Globe, color: 'text-violet-400', bgColor: 'bg-violet-400' },
    'economics': { icon: TrendingUp, color: 'text-teal-500', bgColor: 'bg-teal-500' },
    'iq': { icon: Brain, color: 'text-purple-500', bgColor: 'bg-purple-500' },
    'general knowledge': { icon: Lightbulb, color: 'text-yellow-600', bgColor: 'bg-yellow-600' },
    'life skills': { icon: Heart, color: 'text-pink-500', bgColor: 'bg-pink-500' },
};

function getSubjectConfig(name: string) {
    const lower = name.toLowerCase();
    for (const key in SUBJECT_CONFIG) {
        if (lower.includes(key)) return SUBJECT_CONFIG[key];
    }
    return { icon: Palette, color: 'text-slate-500', bgColor: 'bg-slate-500' };
}

export default function PracticePage() {
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [hierarchy, setHierarchy] = useState<any[]>([]);

    useEffect(() => {
        const init = async () => {
            const currentUser = AuthService.getCurrentUser() || await AuthService.syncSession();
            if (!currentUser) { router.push('/login'); return; }
            setUser(currentUser);

            try {
                const [hierRes, mcqRes] = await Promise.all([
                    fetch('/api/mongo/admin/hierarchy?type=all'),
                    fetch('/api/mongo/mcqs?counts_only=true'),
                ]);

                const hierData = await hierRes.json();
                const mcqData = await mcqRes.json();

                const subjects: any[] = (hierData.subjects || []).filter((s: any) => s.is_active);
                const topics: any[] = (hierData.topics || []).filter((t: any) => t.is_active);
                const subtopics: any[] = (hierData.subtopics || []).filter((s: any) => s.is_active);
                
                const counts = mcqData.counts || { subtopics: {}, topics: {}, universities: {} };

                const topicIdsWithQ = new Set<string>(Object.keys(counts.topics));
                const subtopicIdsWithQ = new Set<string>(Object.keys(counts.subtopics));

                subtopics.forEach((st: any) => {
                    if (subtopicIdsWithQ.has(st.id.toString())) topicIdsWithQ.add(st.topic_id.toString());
                });

                const built = subjects.map((subj: any) => {
                    const subjTopics = topics
                        .filter((t: any) => t.subject_id === subj.id && topicIdsWithQ.has(t.id.toString()))
                        .sort((a: any, b: any) => a.sequence_order - b.sequence_order)
                        .map((t: any) => {
                            const subs = subtopics
                                .filter((st: any) => st.topic_id === t.id && subtopicIdsWithQ.has(st.id.toString()))
                                .sort((a: any, b: any) => a.sequence_order - b.sequence_order)
                                .map((st: any) => ({ id: st.id, name: st.name }));

                            return { id: t.id, name: t.name, subtopics: subs };
                        });

                    return {
                        id: subj.id,
                        name: subj.name,
                        config: getSubjectConfig(subj.name),
                        topics: subjTopics,
                    };
                }).filter((s: any) => s.topics.length > 0);

                setHierarchy(built);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [router]);

    const filtered = hierarchy
        .map(subj => {
            const q = searchTerm.toLowerCase();
            if (!q) return subj;
            const matchedTopics = subj.topics
                .map((t: any) => ({
                    ...t,
                    subtopics: t.subtopics.filter((st: any) => st.name.toLowerCase().includes(q)),
                }))
                .filter((t: any) =>
                    t.name.toLowerCase().includes(q) ||
                    t.subtopics.length > 0 ||
                    subj.name.toLowerCase().includes(q)
                );
            if (!subj.name.toLowerCase().includes(q) && matchedTopics.length === 0) return null;
            return { ...subj, topics: matchedTopics };
        })
        .filter(Boolean) as any[];

    if (loading) return <StudentPageSkeleton isSidebarCollapsed={isSidebarCollapsed} />;

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            <Sidebar userRole="student" />

            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Student'} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="p-3 sm:p-6 lg:p-12 mt-28 lg:mt-24 overflow-x-hidden">
                    <div className="w-full space-y-10">
                        
                        {/* Hero Section */}
                        <div className="mb-12">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Courses</h1>
                            <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
                                Personalized learning resource for all ages. Master topics at your own pace with our comprehensive curriculum.
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-12 max-w-xl group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="What do you want to learn today?"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-white border-2 border-slate-200 rounded-2xl text-base font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 shadow-sm transition-all"
                            />
                        </div>

                        {/* Hierarchy Content */}
                        {filtered.length === 0 ? (
                            <div className="text-center py-20">
                                <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold italic">No courses found matching your search.</p>
                            </div>
                        ) : (
                            <div className="columns-1 md:columns-2 xl:columns-3 gap-8">
                                {filtered.map((subj, idx) => (
                                    <div key={subj.id} className="break-inside-avoid mb-8">
                                        <KhanAccordion 
                                            subject={subj} 
                                            router={router}
                                            searchMode={!!searchTerm}
                                        />
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

function KhanAccordion({ subject, router, searchMode }: { subject: any, router: any, searchMode: boolean }) {
    const [isOpen, setIsOpen] = useState(true);
    const { icon: Icon, color, bgColor } = subject.config;

    // Flatten topics and subtopics for the grid
    const allItems: any[] = [];
    subject.topics.forEach((t: any) => {
        allItems.push({ type: 'topic', id: t.id, name: t.name });
        t.subtopics.forEach((st: any) => {
            allItems.push({ type: 'subtopic', id: st.id, name: st.name });
        });
    });

    return (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm transition-shadow hover:shadow-md">
            {/* Header */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between group py-2"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110`}>
                        <Icon className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 transition-colors uppercase tracking-tight">
                        {subject.name}
                    </h2>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {/* Content Body */}
            {isOpen && (
                <div className="mt-8 ml-2 sm:ml-16 animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 border-t border-slate-100 pt-8">
                        {allItems.map((item, i) => (
                            <button
                                key={i}
                                onClick={() => router.push(item.type === 'topic' ? `/practice/session/${item.id}` : `/practice/session/subtopic/${item.id}`)}
                                className={`text-left text-[13px] font-bold transition-all hover:underline leading-tight ${
                                    item.type === 'topic' ? 'text-slate-900 font-extrabold' : 'text-slate-500'
                                }`}
                            >
                                {item.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
