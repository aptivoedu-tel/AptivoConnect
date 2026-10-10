'use client';

import React, { useState, useEffect } from 'react';
import {
    Trophy, Flame, Zap, Target, TrendingUp,
    Star, Crown, ChevronUp, ChevronDown, ListOrdered, Calendar, Info, Award, User as UserIcon
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { AuthService } from '@/lib/services/authService';
import { useUI } from '@/lib/context/UIContext';

function getInitials(name: string) {
    if (!name) return '??';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

const LEAGUE_THEMES: Record<string, {
    bg: string;
    border: string;
    text: string;
    badge: string;
    accent: string;
    shadow: string;
    gradient: string;
    description: string;
    label: string;
    emoji: string;
    iconColor: string;
    podium: Array<{ avatarBg: string; ring: string; pillar: string }>;
}> = {
    bronze: {
        label: 'Bronze League',
        emoji: '🥉',
        bg: 'bg-gradient-to-br from-amber-50/60 to-orange-50/40',
        border: 'border-amber-200',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-800 border border-amber-300',
        accent: 'bg-amber-600',
        shadow: 'shadow-amber-500/10',
        gradient: 'from-amber-600 via-orange-500 to-amber-700',
        iconColor: 'text-amber-600',
        description: 'First arena. Higher XP means a higher Bronze rank.',
        podium: [
            {
                avatarBg: 'from-amber-500 via-amber-400 to-amber-600',
                ring: 'ring-amber-500',
                pillar: 'bg-gradient-to-b from-amber-200 to-amber-100 border-amber-300',
            },
            {
                avatarBg: 'from-amber-400 to-amber-500',
                ring: 'ring-amber-400',
                pillar: 'bg-gradient-to-b from-amber-150 to-amber-50 border-amber-200',
            },
            {
                avatarBg: 'from-orange-400 to-amber-500',
                ring: 'ring-orange-400',
                pillar: 'bg-gradient-to-b from-amber-100 to-amber-50/50 border-amber-100',
            }
        ]
    },
    silver: {
        label: 'Silver League',
        emoji: '🥈',
        bg: 'bg-gradient-to-br from-slate-50 to-slate-100/50',
        border: 'border-slate-300',
        text: 'text-slate-700',
        badge: 'bg-slate-100 text-slate-800 border border-slate-300',
        accent: 'bg-slate-500',
        shadow: 'shadow-slate-500/10',
        gradient: 'from-slate-500 via-zinc-400 to-slate-600',
        iconColor: 'text-slate-600',
        description: 'Second arena. Silver ranks above Bronze; higher XP decides rank inside Silver.',
        podium: [
            {
                avatarBg: 'from-slate-400 via-slate-300 to-slate-500',
                ring: 'ring-slate-400',
                pillar: 'bg-gradient-to-b from-slate-200 to-slate-100 border-slate-300',
            },
            {
                avatarBg: 'from-slate-350 to-slate-400',
                ring: 'ring-slate-300',
                pillar: 'bg-gradient-to-b from-slate-150 to-slate-50 border-slate-200',
            },
            {
                avatarBg: 'from-zinc-300 to-slate-400',
                ring: 'ring-zinc-300',
                pillar: 'bg-gradient-to-b from-slate-100 to-slate-50/50 border-slate-100',
            }
        ]
    },
    gold: {
        label: 'Gold League',
        emoji: '🥇',
        bg: 'bg-gradient-to-br from-yellow-50/60 to-amber-50/40',
        border: 'border-yellow-250',
        text: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
        accent: 'bg-yellow-500',
        shadow: 'shadow-yellow-500/10',
        gradient: 'from-yellow-500 via-amber-400 to-yellow-600',
        iconColor: 'text-yellow-600',
        description: 'Top arena. Gold ranks above Silver and Bronze; higher XP decides rank inside Gold.',
        podium: [
            {
                avatarBg: 'from-yellow-400 via-amber-400 to-yellow-500',
                ring: 'ring-yellow-400',
                pillar: 'bg-gradient-to-b from-yellow-200 to-yellow-100 border-yellow-300',
            },
            {
                avatarBg: 'from-yellow-300 to-yellow-450',
                ring: 'ring-yellow-300',
                pillar: 'bg-gradient-to-b from-yellow-150 to-yellow-50 border-yellow-200',
            },
            {
                avatarBg: 'from-amber-300 to-yellow-400',
                ring: 'ring-amber-300',
                pillar: 'bg-gradient-to-b from-yellow-100 to-yellow-50/50 border-yellow-100',
            }
        ]
    }
};

export default function AdminLeaderboardPage() {
    const { isSidebarCollapsed } = useUI();
    const [user, setUser] = useState<any>(null);
    const [selectedLeague, setSelectedLeague] = useState<'bronze' | 'silver' | 'gold'>('bronze');
    const [userLeague, setUserLeague] = useState<'bronze' | 'silver' | 'gold' | null>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [detailedRankings, setDetailedRankings] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    
    const [myXP, setMyXP] = useState<number>(0);
    const [myRank, setMyRank] = useState<number | null>(null);
    const [leagueCounts, setLeagueCounts] = useState({ bronze: 0, silver: 0, gold: 0 });
    const [isLocalLoading, setIsLocalLoading] = useState<boolean>(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);
    const [isBackfilling, setIsBackfilling] = useState<boolean>(false);
    const [backfillResult, setBackfillResult] = useState<string | null>(null);

    // Load data when tab changes or initially
    useEffect(() => {
        loadData(selectedLeague);
    }, [selectedLeague]);

    const loadData = async (leagueKey: 'bronze' | 'silver' | 'gold') => {
        setIsLocalLoading(true);
        setPage(1);
        setDetailedRankings([]);
        
        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);
        if (activeUser) setUser(activeUser);

        try {
            // Fetch visual podium data (top 12 for the selected league)
            const res = await AnalyticsService.getLeagueStatus(leagueKey);
            if (res) {
                setLeaderboard(res.leagueLeaderboard || []);
                // Don't override selectedLeague — admin controls the tab themselves
                setUserLeague(res.myLeague || 'bronze');
                setLeagueCounts(res.leagueCounts || { bronze: 0, silver: 0, gold: 0 });
                // We don't set myXP/myRank for admins as they are not ranked students
            }
            
            // Fetch detailed paginated data for the selected league
            await fetchDetailedRankings(leagueKey, 1, false);

        } catch (e) {
            console.error('Failed to load league data:', e);
        } finally {
            setIsLocalLoading(false);
            setHasLoadedOnce(true);
        }
    };

    const fetchDetailedRankings = async (leagueKey: string, targetPage: number, append: boolean = false) => {
        try {
            setIsLoadingMore(append);
            const url = `/api/mongo/admin/student-rankings?league=${leagueKey}&page=${targetPage}&limit=12`;
            const res = await fetch(url);
            const data = await res.json();

            if (!res.ok) {
                console.error('[AdminLeaderboard] API error:', data);
                return;
            }

            console.log('[AdminLeaderboard] Fetched rankings:', { league: leagueKey, page: targetPage, count: data.rankings?.length, pagination: data.pagination });

            if (data.rankings && Array.isArray(data.rankings)) {
                setDetailedRankings(prev => append ? [...prev, ...data.rankings] : data.rankings);
                setHasMore(data.pagination ? targetPage < data.pagination.pages : false);
            }
        } catch (e) {
            console.error('Failed to load detailed rankings', e);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchDetailedRankings(selectedLeague, nextPage, true);
    };

    // Manual Admin reset trigger via query parameter
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('triggerReset') === 'true') {
                fetch('/api/mongo/leagues/process-reset', { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        console.log('Manual Reset Checked:', data);
                        alert('League rankings refreshed successfully.');
                        window.location.href = '/admin/students';
                    })
                    .catch(err => {
                        console.error('Reset error:', err);
                        alert('Error running manual reset.');
                    });
            }
        }
    }, []);

    const handleBackfillXP = async () => {
        if (!confirm('This will RECALCULATE and OVERWRITE the league_xp for ALL students from their historical practice/exam records. Continue?')) return;
        setIsBackfilling(true);
        setBackfillResult(null);
        try {
            const res = await fetch('/api/mongo/leagues/backfill-xp', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                setBackfillResult(`✅ Done! Backfilled XP for ${data.topStudents?.length ?? 0}+ students. Top: ${data.topStudents?.slice(0,3).map((s: any) => `${s.name} (${s.xp} XP)`).join(', ')}`);
                // Reload leaderboard data
                loadData(selectedLeague);
            } else {
                setBackfillResult(`❌ Error: ${data.error}`);
            }
        } catch (e: any) {
            setBackfillResult(`❌ Error: ${e.message}`);
        } finally {
            setIsBackfilling(false);
        }
    };

    const currentTheme = LEAGUE_THEMES[selectedLeague] || LEAGUE_THEMES.bronze;

    // Podium ordering (2nd, 1st, 3rd)
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3, 12);

    const podiumSlots = [
        { data: top3[1], rankIndex: 1, cfg: currentTheme.podium[1], rankLabel: '2nd' },
        { data: top3[0], rankIndex: 0, cfg: currentTheme.podium[0], rankLabel: '1st' },
        { data: top3[2], rankIndex: 2, cfg: currentTheme.podium[2], rankLabel: '3rd' },
    ];

    // Check if the current user is visible in the top 12 list
    const isMeInTop12 = leaderboard.some(student => student.student_id === user?.id);

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar userRole="super_admin" />

            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="flex-1 pt-28 lg:pt-24 pb-16 px-4 sm:px-8">
                    <div className="max-w-5xl mx-auto">

                        {/* ── HERO HEADER ── */}
                        <div className="text-center mb-10 relative">
                            <div className="absolute inset-0 -top-12 flex items-center justify-center pointer-events-none">
                                <div className={`w-[600px] h-56 ${selectedLeague === 'gold' ? 'bg-yellow-300/10' : selectedLeague === 'silver' ? 'bg-slate-300/10' : 'bg-amber-300/10'} blur-3xl rounded-full transition-all duration-500`} />
                            </div>

                            <div className="relative">
                                <div className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 shadow-sm">
                                    <Trophy className="w-3.5 h-3.5 text-yellow-500 animate-bounce" />
                                    Admin View: Live League Standings
                                </div>
                                <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-none mb-3">
                                    Aptivo Leagues
                                </h1>
                                <p className="text-slate-500 text-base max-w-xl mx-auto font-medium mb-6">
                                    Earn XP through Practice sessions, test sections, and examinations. Higher arena and higher XP decide the ranking.
                                </p>

                                {/* League Tabs */}
                                <div className="inline-flex p-1.5 bg-slate-100 border border-slate-200 rounded-2xl gap-2 shadow-inner mb-6">
                                    {(['bronze', 'silver', 'gold'] as const).map((leagueKey) => {
                                        const isSelected = selectedLeague === leagueKey;
                                        const isUserCurrent = userLeague === leagueKey;
                                        const theme = LEAGUE_THEMES[leagueKey];

                                        return (
                                            <button
                                                key={leagueKey}
                                                onClick={() => {
                                                    setLeaderboard([]);
                                                    setIsLocalLoading(true);
                                                    setSelectedLeague(leagueKey);
                                                }}
                                                className={`relative px-5 py-3 rounded-xl text-sm font-black transition-all duration-300 flex items-center gap-2 ${
                                                    isSelected
                                                        ? 'bg-white text-slate-900 shadow-md scale-105'
                                                        : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                <span className="text-lg">{theme.emoji}</span>
                                                <span className="capitalize">{leagueKey}</span>
                                                <span className="text-xs opacity-60 bg-slate-200 px-2 py-0.5 rounded-full">
                                                    {leagueCounts[leagueKey] || 0}
                                                </span>
                                                {isUserCurrent && (
                                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-500 rounded-full ring-2 ring-white" title="Your current league" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* ── LEAGUE DASHBOARD BANNER ── */}
                        <div className={`border rounded-3xl p-6 sm:p-8 mb-10 shadow-lg relative overflow-hidden transition-all duration-500 ${currentTheme.bg} ${currentTheme.border}`}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-5 text-center md:text-left flex-col md:flex-row">
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-md bg-white border ${currentTheme.border}`}>
                                        {currentTheme.emoji}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 justify-center md:justify-start">
                                            <h2 className="text-2xl font-black text-slate-800">{currentTheme.label}</h2>
                                            {userLeague === selectedLeague && (
                                                <span className="bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    Current League
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-600 text-sm mt-1 max-w-md">
                                            {currentTheme.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {/* Arena ranking info */}
                                    <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-3 text-center shadow-sm w-36 sm:w-40 shrink-0">
                                        <TrendingUp className="w-4.5 h-4.5 text-emerald-500 mx-auto mb-1 animate-pulse" />
                                        <p className="font-black text-slate-800 text-xs sm:text-sm leading-none whitespace-nowrap">Simple Rank</p>
                                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider mt-1.5">Arena + XP</p>
                                    </div>

                                    {/* User XP Standings */}
                                    {userLeague === selectedLeague && (
                                        <>
                                            <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 text-center shadow-sm w-28 sm:w-32 shrink-0">
                                                <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1 animate-pulse" />
                                                <p className="font-black text-slate-800 text-xs sm:text-sm leading-none">{myXP} XP</p>
                                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider mt-1.5">Your Score</p>
                                            </div>
                                            <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 text-center shadow-sm w-28 sm:w-32 shrink-0">
                                                <Award className="w-4 h-4 text-teal-600 mx-auto mb-1" />
                                                <p className="font-black text-slate-800 text-xs sm:text-sm leading-none">#{myRank || '-'}</p>
                                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider mt-1.5">Your Rank</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── LEADERBOARD PODIUM ── */}
                        {(!hasLoadedOnce || isLocalLoading) ? (
                            /* Podium Skeleton Loader */
                            <div className="mb-12">
                                <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-3xl mx-auto">
                                    {[1, 0, 2].map((idx) => {
                                        const isFirst = idx === 0;
                                        return (
                                            <div key={idx} className={`flex flex-col items-center flex-1 max-w-[220px] ${isFirst ? 'scale-105 z-10' : 'scale-95'} animate-pulse`}>
                                                <div className="w-full bg-white border border-slate-100 rounded-3xl p-4 sm:p-5 flex flex-col items-center text-center shadow-sm">
                                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-200 mb-3" />
                                                    <div className="h-4 w-20 bg-slate-200 rounded-md mb-2" />
                                                    <div className="h-5 w-12 bg-slate-200 rounded-md" />
                                                </div>
                                                <div className={`w-full mt-3 rounded-t-2xl bg-slate-200 border-t border-x border-slate-200 ${isFirst ? 'h-24' : idx === 1 ? 'h-16' : 'h-12'}`} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : top3.length > 0 ? (
                            <div className="mb-12">
                                <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-3xl mx-auto">
                                    {podiumSlots.map(({ data, rankIndex, cfg, rankLabel }, i) => {
                                        if (!data) return <div key={i} className="flex-1 max-w-[180px] hidden sm:block" />;
                                        const isFirst = rankIndex === 0;
                                        const isMe = user?.id === data.student_id;

                                        return (
                                            <div key={data.student_id} className={`flex flex-col items-center flex-1 max-w-[220px] transition-all duration-500 ${isFirst ? 'scale-105 z-10' : 'scale-95'}`}>
                                                
                                                {/* Crown or Icon */}
                                                {isFirst && (
                                                    <div className="mb-2">
                                                        <Crown className="w-8 h-8 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-bounce" />
                                                    </div>
                                                )}

                                                {/* User Info Card */}
                                                <div className={`w-full bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col items-center text-center shadow-md relative overflow-hidden ${isMe ? 'ring-2 ring-teal-500 border-transparent' : ''}`}>
                                                    {isMe && (
                                                        <div className="absolute top-2 right-2 bg-teal-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                                                            You
                                                        </div>
                                                    )}

                                                    {/* Avatar */}
                                                    <div className="relative mb-3">
                                                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${cfg.avatarBg} ring-4 ${cfg.ring} ring-offset-2 ring-offset-white flex items-center justify-center shadow-inner overflow-hidden`}>
                                                            {data.avatar_url ? (
                                                                <img
                                                                    src={data.avatar_url}
                                                                    alt={data.student_name}
                                                                    className="w-full h-full object-cover rounded-full"
                                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                />
                                                            ) : null}
                                                            <span className={`font-black text-white text-lg sm:text-xl ${data.avatar_url ? 'hidden' : ''}`}>
                                                                {getInitials(data.student_name)}
                                                            </span>
                                                        </div>
                                                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${isFirst ? 'bg-yellow-500 text-slate-900' : 'bg-slate-200 text-slate-700'} flex items-center justify-center font-black text-xs border border-white shadow-sm`}>
                                                            {rankIndex + 1}
                                                        </div>
                                                    </div>

                                                    {/* Name */}
                                                    <p className="font-black text-slate-800 text-sm leading-tight mb-1 line-clamp-1 w-full">
                                                        {data.student_name}
                                                    </p>

                                                    {/* XP */}
                                                    <p className={`font-black text-lg ${currentTheme.iconColor} leading-none flex items-center gap-0.5 justify-center`}>
                                                        {data.weekly_xp} <span className="text-[10px] font-bold text-slate-400">XP</span>
                                                    </p>
                                                </div>

                                                {/* Pillar representing rank */}
                                                <div className={`w-full mt-3 rounded-t-2xl border-t border-x ${cfg.pillar} flex items-center justify-center ${isFirst ? 'h-24' : rankIndex === 1 ? 'h-16' : 'h-12'}`}>
                                                    <span className="font-black text-2xl opacity-20 text-slate-800 select-none">
                                                        {rankLabel}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}

                        {/* ── RANKS 4-12 LIST ── */}
                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <span className="text-slate-800 font-black text-sm flex items-center gap-2">
                                    <ListOrdered className="w-4 h-4 text-slate-500" />
                                    League Standings (Top 12)
                                </span>
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Total XP Score</span>
                            </div>

                            {(!hasLoadedOnce || isLocalLoading) ? (
                                /* List Skeleton Loader */
                                <div className="divide-y divide-slate-100 animate-pulse">
                                    {[1, 2, 3, 4, 5].map((idx) => (
                                        <div key={idx} className="flex items-center gap-4 px-6 py-4">
                                            <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
                                            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                                            <div className="flex-1">
                                                <div className="h-4 w-28 bg-slate-200 rounded-md" />
                                            </div>
                                            <div className="h-5 w-12 bg-slate-200 rounded-md shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            ) : detailedRankings.length === 0 ? (
                                <div className="py-16 flex flex-col items-center text-slate-350 gap-2">
                                    <Trophy className="w-10 h-10 opacity-30" />
                                    <p className="text-sm font-bold text-slate-400">No active students in this league yet.</p>
                                    <p className="text-xs text-slate-400">Complete lessons to claim your spot!</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {detailedRankings.map((student, idx) => {
                                        // Rank is calculated based on the global array index since detailedRankings contains all loaded pages appended together.
                                        const rank = idx + 1;
                                        const isMe = user?.id === student.id;
                                        const isExpanded = expandedRow === student.id;
                                        
                                        return (
                                            <div key={student.id} className="flex flex-col transition-all duration-200">
                                                <div
                                                    onClick={() => setExpandedRow(isExpanded ? null : student.id)}
                                                    className={`flex items-center gap-4 px-6 py-4 cursor-pointer relative group ${
                                                        isMe ? 'bg-teal-50/60 border-l-4 border-teal-500' : 'hover:bg-slate-50 border-l-4 border-transparent'
                                                    } ${isExpanded ? 'bg-slate-50' : ''}`}
                                                >
                                                    {/* Rank position */}
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                                                        isMe ? 'bg-teal-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                                                    }`}>
                                                        {rank}
                                                    </div>

                                                    {/* Avatar */}
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 ring-2 overflow-hidden ${
                                                        isMe ? 'bg-teal-500 text-white ring-teal-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
                                                    }`}>
                                                        {student.avatar && student.avatar.startsWith('http') ? (
                                                            <img
                                                                src={student.avatar}
                                                                alt={student.name}
                                                                className="w-full h-full rounded-full object-cover"
                                                                onError={(e) => {
                                                                    const el = e.currentTarget;
                                                                    el.style.display = 'none';
                                                                    el.parentElement!.innerText = getInitials(student.name);
                                                                }}
                                                            />
                                                        ) : getInitials(student.name)}
                                                    </div>

                                                    {/* Name + indicators */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className={`font-black text-sm truncate ${isMe ? 'text-teal-700' : 'text-slate-800'}`}>
                                                                {student.name}
                                                            </p>
                                                            {isMe && <span className="bg-teal-100 text-teal-700 text-[8px] font-black px-1.5 py-0.5 rounded-full">YOU</span>}
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{student.email}</p>
                                                    </div>

                                                    {/* XP score */}
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className="flex items-center gap-1.5 text-right">
                                                            <span className={`font-black text-base ${isMe ? 'text-teal-600' : 'text-slate-700'}`}>
                                                                {student.league_xp}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">XP</span>
                                                        </div>
                                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                    </div>
                                                </div>

                                                {/* EXPANDED DETAILS PANEL */}
                                                {isExpanded && (
                                                    <div className="bg-white px-6 py-6 border-t border-slate-100">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                            
                                                            {/* User Identity */}
                                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Identity & Registration</h4>
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <p className="text-xs text-slate-500">Full Name</p>
                                                                        <p className="text-sm font-bold text-slate-800">{student.name}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-slate-500">Email Address</p>
                                                                        <p className="text-sm font-bold text-slate-800">{student.email}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-slate-500">Registration Date</p>
                                                                        <p className="text-sm font-bold text-slate-800">{new Date(student.registration_date).toLocaleDateString()}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Engagement Stats */}
                                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Platform Engagement</h4>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <p className="text-xs text-slate-500">Last Active</p>
                                                                        <p className="text-sm font-bold text-slate-800">{new Date(student.last_active_date).toLocaleDateString()}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-slate-500">Total Sessions</p>
                                                                        <p className="text-sm font-bold text-slate-800">{student.total_practice_sessions}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-slate-500">Questions Tried</p>
                                                                        <p className="text-sm font-bold text-slate-800">{student.questions_attempted}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-slate-500">Current Streak</p>
                                                                        <div className="flex items-center gap-1">
                                                                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                                                                            <p className="text-sm font-bold text-slate-800">{student.current_streak} Days</p>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-slate-500">Accuracy</p>
                                                                        <p className="text-sm font-bold text-slate-800">{student.accuracy}%</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-slate-500">Total Practice Time</p>
                                                                        <p className="text-sm font-bold text-slate-800">{Math.round(student.total_time / 60)} mins</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* University Breakdowns */}
                                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 lg:col-span-1 md:col-span-2">
                                                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">University Breakdowns</h4>
                                                                {student.registered_universities && student.registered_universities.length > 0 ? (
                                                                    <div className="mb-4">
                                                                        <p className="text-xs text-slate-500 mb-1">Registered Universities</p>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {student.registered_universities.map((uni: string, i: number) => (
                                                                                <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                                                                                    {uni}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-slate-500 mb-4">No university enrollments.</p>
                                                                )}

                                                                <p className="text-xs text-slate-500 mb-1">Time Spent by University</p>
                                                                {student.time_by_uni && student.time_by_uni.length > 0 ? (
                                                                    <div className="space-y-2">
                                                                        {student.time_by_uni.map((tu: any, i: number) => (
                                                                            <div key={i} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                                                                                <span className="text-xs font-bold text-slate-700">{tu.name}</span>
                                                                                <span className="text-xs font-black text-slate-500 font-mono">{Math.round(tu.time / 60)}m</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-slate-400">No practice time recorded yet.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Pagination / Load More */}
                            {hasMore && (
                                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-center">
                                    <button 
                                        onClick={handleLoadMore}
                                        disabled={isLoadingMore}
                                        className="bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-xl text-sm font-black hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {isLoadingMore ? 'Loading...' : 'Load More Students'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── ADMIN TOOLS ── */}
                        <div className="mt-8 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-xs text-slate-700">Admin Tools</h4>
                                    <p className="text-slate-500 text-xs mt-0.5">
                                        Use the button below to recalculate Lifetime XP for all students from their historical practice session and exam attempt records.
                                        Run this once to backfill existing data, then XP updates automatically on each session.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <button
                                    onClick={handleBackfillXP}
                                    disabled={isBackfilling}
                                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-4 py-2 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Zap className="w-3.5 h-3.5" />
                                    {isBackfilling ? 'Backfilling XP...' : 'Backfill XP from History'}
                                </button>
                                <button
                                    onClick={() => fetch('/api/mongo/leagues/process-reset', { method: 'POST' }).then(() => loadData(selectedLeague))}
                                    className="bg-slate-700 hover:bg-slate-900 text-white text-xs font-black px-4 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-2"
                                >
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    Refresh League Ranks
                                </button>
                            </div>
                            {backfillResult && (
                                <p className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2">{backfillResult}</p>
                            )}
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}
