'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUI } from '@/lib/context/UIContext';
import { Plus, Search, Globe, Trash2, Edit2, X, CheckCircle, Upload, Image as ImageIcon, FileText, Save, Layout, Target as TargetIcon, Book } from 'lucide-react';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';

type TestSection = {
    id: number;
    name: string;
    region: string;
    country: string;
    logo_url?: string;
    is_active: boolean;
    is_public: boolean;
    is_independent: boolean;
    test_pattern_markdown?: string;
    mcqCount?: number;
    examCount?: number;
};

export default function TestSectionsPage() {
    const router = useRouter();
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [sections, setSections] = React.useState<TestSection[]>([]);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [logoFile, setLogoFile] = React.useState<File | null>(null);
    const [editingSection, setEditingSection] = React.useState<TestSection | null>(null);
    const [isPatternModalOpen, setIsPatternModalOpen] = React.useState(false);
    const [patternData, setPatternData] = React.useState({ id: 0, name: '', markdown: '' });
    const { isSidebarCollapsed } = useUI();

    const [formData, setFormData] = React.useState({
        name: '',
        region: '',
        country: '',
        logo_url: '',
        is_public: true,
        is_independent: false,
    });

    React.useEffect(() => { fetchSections(); }, []);

    const fetchSections = async () => {
        setGlobalLoading(true, 'Loading Global Exams...');
        try {
            const res = await fetch('/api/mongo/test-sections?limit=200&include_counts=true');
            const text = await res.text();
            console.log('[TestSections] API status:', res.status, 'body:', text.substring(0, 500));
            if (res.ok) {
                const data = JSON.parse(text);
                console.log('[TestSections] Loaded sections:', data.sections?.length);
                if (data.sections) setSections(data.sections);
            } else {
                console.error('[TestSections] API error:', res.status, text);
                // Try without counts as a fallback
                const fallback = await fetch('/api/mongo/test-sections?limit=200');
                if (fallback.ok) {
                    const data = await fallback.json();
                    console.log('[TestSections] Fallback loaded:', data.sections?.length);
                    if (data.sections) setSections(data.sections);
                }
            }
        } catch (error) {
            console.error('[TestSections] Fetch error:', error);
        } finally {
            setGlobalLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setGlobalLoading(true, 'Saving Global Exam...');
        try {
            let logo_url = formData.logo_url;

            if (logoFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', logoFile);
                uploadFormData.append('bucket', 'test-section-logos');
                const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadFormData });
                if (!uploadRes.ok) throw new Error('Logo upload failed');
                const uploadData = await uploadRes.json();
                logo_url = uploadData.publicUrl;
            }

            const body = {
                name: formData.name,
                region: formData.region,
                country: formData.country,
                logo_url,
                is_public: formData.is_public,
                is_independent: formData.is_independent
            };
            const method = editingSection ? 'PATCH' : 'POST';
            const res = await fetch('/api/mongo/test-sections', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...(editingSection && { id: editingSection.id }), ...body, ...(method === 'POST' && { is_active: true }) })
            });

            if (!res.ok) throw new Error('Failed to save Global Exam');
            setIsModalOpen(false);
            setEditingSection(null);
            setFormData({ name: '', region: '', country: '', logo_url: '', is_public: true, is_independent: false });
            setLogoFile(null);
            fetchSections();
            toast.success('Global Exam saved successfully');
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setGlobalLoading(false);
        }
    };

    const toggleActiveStatus = async (id: number, currentStatus: boolean) => {
        try {
            await fetch('/api/mongo/test-sections', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_active: !currentStatus })
            });
            toast.success(`Section ${!currentStatus ? 'Activated' : 'Deactivated'}`);
            fetchSections();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this Global Exam? This cannot be undone.')) return;
        try {
            const res = await fetch(`/api/mongo/test-sections?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            toast.success('Global Exam deleted');
            fetchSections();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleSavePattern = async () => {
        setGlobalLoading(true, 'Saving Pattern...');
        try {
            const res = await fetch('/api/mongo/test-sections', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: patternData.id, test_pattern_markdown: patternData.markdown })
            });
            if (!res.ok) throw new Error('Failed to update pattern');
            toast.success('Pattern updated successfully');
            setIsPatternModalOpen(false);
            fetchSections();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setGlobalLoading(false);
        }
    };

    const filtered = sections.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.region || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.country || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Global Exams</h1>
                                <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Manage global test categories — MDCAT, SAT, Line Tests, and more.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="text-sm">Add Global Exam</span>
                            </button>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-6 flex items-center gap-4">
                            <Search className="w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, region, or country..."
                                className="flex-1 outline-none text-slate-700 font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? null : filtered.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-slate-400">No Global Exams found.</div>
                            ) : (
                                filtered.map(s => (
                                    <div key={s.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-50 overflow-hidden flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0 relative">
                                                {s.logo_url ? (
                                                    <>
                                                        <img
                                                            src={s.logo_url}
                                                            alt={s.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                e.currentTarget.nextElementSibling?.classList.add('flex');
                                                            }}
                                                        />
                                                        <span className="hidden w-full h-full items-center justify-center font-black text-sm uppercase">
                                                            {s.name.substring(0, 2)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="font-black text-sm uppercase">{s.name.substring(0, 2)}</span>
                                                )}
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingSection(s);
                                                        setFormData({
                                                            name: s.name,
                                                            region: s.region || '',
                                                            country: s.country || '',
                                                            logo_url: s.logo_url || '',
                                                            is_public: s.is_public ?? true,
                                                            is_independent: s.is_independent ?? false
                                                        });
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{s.name}</h2>
                                            <div className="flex gap-1.5">
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-md border border-emerald-200">
                                                    {s.mcqCount || 0} Qs
                                                </span>
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded-md border border-indigo-200">
                                                    {s.examCount || 0} Tests
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 mb-4">{s.region}{s.country ? `, ${s.country}` : ''}</p>

                                        <div className="flex flex-col gap-2">
                                            {s.is_independent ? (
                                                <>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => router.push(`/admin/test-sections/${s.id}/hierarchy`)}
                                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <Layout className="w-3 h-3" /> Hierarchy
                                                        </button>
                                                        <button
                                                            onClick={() => router.push(`/admin/test-sections/${s.id}/question-bank`)}
                                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-purple-50 border border-purple-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-purple-600 hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <Search className="w-3 h-3" /> QB
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => router.push(`/admin/test-sections/${s.id}/lessons`)}
                                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-amber-50 border border-amber-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <Book className="w-3 h-3" /> Lessons
                                                        </button>
                                                        <button
                                                            onClick={() => router.push(`/admin/test-sections/${s.id}/exams`)}
                                                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <TargetIcon className="w-3 h-3" /> Exams
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => { setPatternData({ id: s.id, name: s.name, markdown: s.test_pattern_markdown || '' }); setIsPatternModalOpen(true); }}
                                                            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-900 hover:text-white transition-all"
                                                        >
                                                            <FileText className="w-3 h-3" /> Pattern
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setPatternData({ id: s.id, name: s.name, markdown: s.test_pattern_markdown || '' }); setIsPatternModalOpen(true); }}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 transition-all"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" /> Pattern
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/admin/test-sections/${s.id}/exams`)}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <TargetIcon className="w-3.5 h-3.5" /> Exams
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                                            <button
                                                onClick={() => toggleActiveStatus(s.id, s.is_active)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${s.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-600 hover:text-white'}`}
                                            >
                                                <CheckCircle className={`w-3.5 h-3.5 ${s.is_active ? 'fill-emerald-500/20' : ''}`} />
                                                {s.is_active ? 'Live' : 'Hidden'}
                                            </button>
                                            {s.is_public === false && (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md">HIDDEN</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>

                {/* Add/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-xl font-bold text-slate-800">{editingSection ? 'Edit Global Exam' : 'Add New Global Exam'}</h3>
                                <button onClick={() => { setIsModalOpen(false); setEditingSection(null); setFormData({ name: '', region: '', country: '', logo_url: '', is_public: true, is_independent: false }); setLogoFile(null); }} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Global Exam Name *</label>
                                    <input required type="text" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. MDCAT, SAT, Line Test" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Region</label>
                                        <input type="text" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. South Asia" value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Country</label>
                                        <input type="text" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Pakistan" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700">Public Visibility</label>
                                            <p className="text-xs text-slate-500">Show to students</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.is_public} onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })} />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                        </label>
                                    </div>

                                    <div className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100 flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700">Independent</label>
                                            <p className="text-[10px] text-slate-500 font-medium">Strictly Isolated Hierarchy & QB</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.is_independent} onChange={(e) => setFormData({ ...formData, is_independent: e.target.checked })} />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Logo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                                            {logoFile ? (
                                                <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-cover" />
                                            ) : formData.logo_url ? (
                                                <img src={formData.logo_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-6 h-6 text-gray-300" />
                                            )}
                                        </div>
                                        <label htmlFor="logo-upload" className="flex-1">
                                            <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-50/50 transition-colors">
                                                <Upload className="w-4 h-4 text-emerald-600" />
                                                <span className="text-sm font-bold text-emerald-600">{logoFile ? logoFile.name : 'Upload Logo'}</span>
                                            </div>
                                            <input id="logo-upload" type="file" className="hidden" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {editingSection ? 'Update Global Exam' : 'Create Global Exam'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Pattern Modal */}
                {isPatternModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border border-slate-200">
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">Test Pattern</h3>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{patternData.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={handleSavePattern} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 text-sm">
                                        <Save className="w-4 h-4" /> Save
                                    </button>
                                    <button onClick={() => setIsPatternModalOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 flex overflow-hidden">
                                <div className="flex-1 flex flex-col lg:border-r border-slate-100 bg-slate-50/30 overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-white">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Markdown Editor</span>
                                    </div>
                                    <textarea
                                        value={patternData.markdown}
                                        onChange={(e) => setPatternData({ ...patternData, markdown: e.target.value })}
                                        className="flex-1 p-8 bg-transparent outline-none font-mono text-sm leading-relaxed text-slate-700 resize-none overflow-y-auto"
                                        placeholder="Define the test structure, marks distribution, and sections here. Use markdown tables."
                                    />
                                </div>
                                <div className="hidden lg:flex flex-1 flex-col bg-white overflow-hidden">
                                    <div className="p-4 border-b border-slate-100">
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Live Preview</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-8 prose prose-slate max-w-none prose-sm font-sans custom-scrollbar">
                                        {patternData.markdown ? (
                                            <MarkdownRenderer content={patternData.markdown} />
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40">
                                                <FileText className="w-16 h-16 mb-4" />
                                                <p className="text-sm font-bold uppercase tracking-widest">No pattern defined yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
