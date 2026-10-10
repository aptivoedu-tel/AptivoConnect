'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Search, Building2, BookOpen, Target as TargetIcon, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AuthService } from '@/lib/services/authService';

export default function UniversitySelectorPage() {
    const [universities, setUniversities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [lockedStates, setLockedStates] = useState<Record<number, boolean>>({});
    const [institutionId, setInstitutionId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'active' | 'all'>('active');

    useEffect(() => {
        const loadData = async () => {
            try {
                // 0. Get User Profile from MongoDB API
                const profileRes = await fetch('/api/mongo/profile');
                const profileData = await profileRes.json();

                if (!profileRes.ok) throw new Error("Failed to fetch profile");

                const instId = profileData.data?.institution_id;
                setInstitutionId(instId);

                if (!instId) {
                    toast.error("Institution link missing. You will not be able to manage university access.");
                }

                // 1. Fetch Universities from MongoDB - ALWAYS do this
                const uniRes = await fetch('/api/mongo/universities?active=true');
                const uniData = await uniRes.json();
                setUniversities(uniData.universities || []);

                // 2. Fetch Access States if instId exists
                if (instId) {
                    const accessRes = await fetch(`/api/mongo/institutions/university-access?institution_id=${instId}`);
                    const accessData = await accessRes.json();

                    const states: Record<number, boolean> = {};
                    accessData.rules?.forEach((a: any) => {
                        states[a.university_id] = a.is_locked;
                    });
                    setLockedStates(states);
                }
            } catch (err: any) {
                console.error(err);
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const toggleLock = async (uniId: number, currentLocked: boolean) => {
        const newLocked = !currentLocked;

        // Optimistic Update
        setLockedStates(prev => ({ ...prev, [uniId]: newLocked }));

        if (!institutionId) {
            toast.error('Institution ID not found');
            return;
        }

        try {
            const res = await fetch('/api/mongo/institutions/university-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    institution_id: institutionId,
                    university_id: uniId,
                    is_locked: newLocked
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update access');
            }

            toast.success(newLocked ? 'University Locked' : 'University Unlocked');
        } catch (error: any) {
            toast.error(error.message || 'Failed to update access');
            setLockedStates(prev => ({ ...prev, [uniId]: currentLocked })); // Revert
        }
    };

    const filteredUnis = universities.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                             (u.city || '').toLowerCase().includes(search.toLowerCase());
        
        const hasRule = lockedStates[u.id] !== undefined;
        const isActiveSelection = hasRule && lockedStates[u.id] === false;

        if (viewMode === 'active') {
            return matchesSearch && isActiveSelection;
        }
        
        // In Master Catalog, only show Public universities OR those that already have a rule (manually assigned)
        return matchesSearch && (u.is_public !== false || hasRule);
    });

    const activeCount = universities.filter(u => lockedStates[u.id] === false).length;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">University Management</h1>
                    <p className="text-slate-500 text-lg mt-2 font-medium">Oversee assessments and control student access permissions.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                <div className="flex gap-2 p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-2xl w-fit">
                    <button
                        onClick={() => setViewMode('active')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            viewMode === 'active' 
                            ? 'bg-white text-teal-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        Active Selection ({activeCount})
                    </button>
                    <button
                        onClick={() => setViewMode('all')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            viewMode === 'all' 
                            ? 'bg-white text-teal-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        Master Catalog ({universities.length})
                    </button>
                </div>

                <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex-1 w-full md:max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Find a specific university..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border-none rounded-xl outline-none focus:ring-0 text-sm font-bold transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Synchronizing Catalog...</p>
                    </div>
                ) : filteredUnis.length === 0 ? (
                    <div className="p-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Building2 className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">
                            {viewMode === 'active' ? "No active universities" : "No universities found"}
                        </h3>
                        <p className="text-slate-500 font-medium max-w-sm mx-auto mb-8">
                            {viewMode === 'active' 
                                ? "You haven't unlocked any universities yet. Switch to 'Master Catalog' to start managing your student access." 
                                : "We couldn't find any universities matching your search criteria."}
                        </p>
                        {viewMode === 'active' && (
                            <button 
                                onClick={() => setViewMode('all')}
                                className="px-8 py-3 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-teal-700 transition-all shadow-xl shadow-teal-100"
                            >
                                Browse Master Catalog
                            </button>
                        )}
                    </div>
                ) : (
                    filteredUnis.map(uni => {
                        const isLocked = lockedStates[uni.id] ?? true;
                        return (
                            <div key={uni.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 flex flex-col xl:flex-row xl:items-center justify-between shadow-sm hover:shadow-2xl hover:shadow-teal-50/50 transition-all gap-8 group">
                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                    <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 overflow-hidden border border-slate-100 shrink-0 group-hover:scale-105 transition-transform duration-500 shadow-inner">
                                        {uni.logo_url ? (
                                            <img src={uni.logo_url} alt={uni.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Building2 className="w-10 h-10" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-xl font-black text-slate-900 leading-tight truncate">{uni.name}</h3>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${isLocked ? 'text-rose-500 bg-rose-50 border-rose-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                                                {isLocked ? 'Closed' : 'Visible'}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">{uni.country || 'International Spectrum'} • {uni.city || 'Central Hub'}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 xl:justify-end border-t xl:border-t-0 pt-6 xl:pt-0 border-slate-50">
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <Link
                                            href={`/institution-admin/universities/${uni.id}/exams`}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                                        >
                                            <TargetIcon className="w-3.5 h-3.5" />
                                            Manage Exams
                                        </Link>
                                        <Link
                                            href={`/institution-admin/content-editor?university_id=${uni.id}`}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            Review Content
                                        </Link>
                                    </div>

                                    <div className="h-8 w-px bg-slate-100 hidden sm:block mx-2" />

                                    <button
                                        onClick={() => toggleLock(uni.id, isLocked)}
                                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-black transition-all text-[10px] uppercase tracking-widest shadow-xl active:scale-95 ${isLocked
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                                            : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100'
                                            }`}
                                    >
                                        {isLocked ? (
                                            <><Unlock className="w-4 h-4" /> Unlock Students</>
                                        ) : (
                                            <><Lock className="w-4 h-4" /> Lock Students</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
