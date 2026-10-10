'use client';

import React, { useState, useEffect } from 'react';
import { Search, Building2, Target as TargetIcon, ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AssignmentUniversitySelector() {
    const [universities, setUniversities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [institutionId, setInstitutionId] = useState<number | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const profileRes = await fetch('/api/mongo/profile');
                const profileData = await profileRes.json();
                const instId = profileData.data?.institution_id;
                setInstitutionId(instId);

                // Fetch universities that the institution has access to
                const uniRes = await fetch('/api/mongo/universities?active=true');
                const uniData = await uniRes.json();
                
                // Get access rules to filter which ones are unlocked
                if (instId) {
                    const accessRes = await fetch(`/api/mongo/institutions/university-access?institution_id=${instId}`);
                    const accessData = await accessRes.json();
                    
                    // A university is ONLY available for assignment if it has been UNLOCKED in the management section.
                    // By default (no rule), it is considered locked.
                    const unlockedIds = (accessData.rules || [])
                        .filter((a: any) => a.is_locked === false)
                        .map((a: any) => a.university_id);
                    
                    setUniversities((uniData.universities || []).filter((u: any) => unlockedIds.includes(u.id)));
                } else {
                    setUniversities([]);
                }
            } catch (err: any) {
                console.error(err);
                toast.error("Failed to load universities");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const filteredUnis = universities.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-12">
                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">Task Assignments</h1>
                <p className="text-slate-500 text-lg mt-2 font-medium">Select a university to assign topics and subtopics to your students.</p>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search universities..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-teal-100">
                    <Building2 className="w-3.5 h-3.5" />
                    {filteredUnis.length} Unlocked Universities
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-6 animate-pulse">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl mb-4" />
                            <div className="h-6 bg-slate-100 rounded-lg w-3/4 mb-2" />
                            <div className="h-4 bg-slate-50 rounded-lg w-1/2" />
                        </div>
                    ))
                ) : filteredUnis.length === 0 ? (
                    <div className="col-span-full p-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                        <h3 className="text-xl font-bold text-slate-900 mb-1">No universities available</h3>
                        <p className="text-slate-500 font-medium">Make sure you have unlocked universities in the Management section.</p>
                    </div>
                ) : (
                    filteredUnis.map(uni => (
                        <Link 
                            key={uni.id} 
                            href={`/institution-admin/assignments/${uni.id}`}
                            className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform overflow-hidden border border-teal-100/50">
                                {uni.logo_url ? (
                                    <img src={uni.logo_url} alt={uni.name} className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Building2 className="w-8 h-8 text-teal-600" />
                                )}
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-teal-600 transition-colors line-clamp-1">{uni.name}</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6">{uni.city || 'Academic Hub'}</p>
                            
                            <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-teal-600">
                                Assign Tasks <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
