'use client';

import React, { useState, useEffect } from 'react';
import {
    Trophy, Flame, Zap, Target, TrendingUp,
    Star, Crown, ListOrdered, Calendar, Info, Award, User as UserIcon
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

export default function LeaderboardPage() {
    const { isSidebarCollapsed } = useUI();
    const [user, setUser] = useState<any>(null);
    const [selectedLeague, setSelectedLeague] = useState<'bronze' | 'silver' | 'gold'>('bronze');
    const [userLeague, setUserLeague] = useState<'bronze' | 'silver' | 'gold' | null>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [myXP, setMyXP] = useState<number>(0);
    const [myRank, setMyRank] = useState<number | null>(null);
    const [leagueCounts, setLeagueCounts] = useState({ bronze: 0, silver: 0, gold: 0 });
    const [isLocalLoading, setIsLocalLoading] = useState<boolean>(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);

    // Load data when tab changes or initially
    useEffect(() => {
        loadData(selectedLeague);
    }, [selectedLeague]);

    const loadData = async (leagueKey: 'bronze' | 'silver' | 'gold') => {
        setIsLocalLoading(true);
        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);
        if (activeUser) setUser(activeUser);

        try {
            const res = await AnalyticsService.getLeagueStatus(leagueKey);
            if (res) {
                setLeaderboard(res.leagueLeaderboard || []);
                setUserLeague(res.myLeague || 'bronze');
                setLeagueCounts(res.leagueCounts || { bronze: 0, silver: 0, gold: 0 });
                
                // If it's the initial load, auto-select user's current league
                if (userLeague === null) {
                    setSelectedLeague(res.myLeague || 'bronze');
                }

                if (leagueKey === res.myLeague) {
                    setMyXP(res.myXP || 0);
                    setMyRank(res.myRank || null);
                } else {
                    setMyRank(null);
                }
            }
        } catch (e) {
            console.error('Failed to load league data:', e);
        } finally {
            setIsLocalLoading(false);
            setHasLoadedOnce(true);
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
    const isMeInTop12 = leaderboard.slice(0, 12).some(student => student.student_id === user?.id);

    return (
        <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar userRole="student" />

            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="flex-1 pt-28 lg:pt-24 pb-28 sm:pb-16 px-3 sm:px-8 overflow-x-hidden">
                    <div className="max-w-5xl mx-auto">

                        {/* ── HERO HEADER ── */}
                        <div className="text-center mb-10 relative">
                            <div className="absolute inset-0 -top-12 flex items-center justify-center pointer-events-none">
                                <div className={`w-[600px] h-56 ${selectedLeague === 'gold' ? 'bg-yellow-300/10' : selectedLeague === 'silver' ? 'bg-slate-300/10' : 'bg-amber-300/10'} blur-3xl rounded-full transition-all duration-500`} />
                            </div>

                            <div className="relative">
                                <div className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 shadow-sm">
                                    <Trophy className="w-3.5 h-3.5 text-yellow-500 animate-bounce" />
                                    Live League Standings
                                </div>
                                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-none mb-3">
                                    Aptivo Leagues
                                </h1>
                                <p className="text-slate-500 text-base max-w-xl mx-auto font-medium mb-6">
                                    Earn XP through Practice sessions, test sections, and examinations. Higher arena and higher XP decide the ranking.
                                </p>

                                {/* League Tabs */}
                                <div className="grid w-full max-w-md grid-cols-3 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl gap-1.5 shadow-inner mb-6">
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
                                                className={`relative min-w-0 justify-center px-1.5 sm:px-3 py-3 rounded-xl text-xs sm:text-sm font-black transition-all duration-300 flex items-center gap-1 sm:gap-2 ${
                                                    isSelected
                                                        ? 'bg-white text-slate-900 shadow-md scale-105'
                                                        : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                <span className="text-lg">{theme.emoji}</span>
                                                <span className="capitalize truncate">{leagueKey}</span>
                                                <span className="hidden sm:inline text-xs opacity-60 bg-slate-200 px-2 py-0.5 rounded-full">
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

                        {/* ── UPDATE SCHEDULE BANNER ── */}
                        <div className="flex justify-center mb-6">
                            <p className="text-emerald-600 text-sm font-bold bg-emerald-50 py-1.5 px-5 rounded-full inline-flex items-center gap-2 border border-emerald-100 shadow-sm">
                                <Calendar className="w-4 h-4" />
                                Leaderboard updates every Wednesday and Sunday
                            </p>
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

                                <div className="flex w-full flex-wrap items-center justify-center gap-3 md:w-auto md:flex-nowrap md:justify-end shrink-0">
                                    {/* Arena ranking info */}
                                    <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-3 text-center shadow-sm w-full sm:w-40 shrink-0">
                                        <TrendingUp className="w-4.5 h-4.5 text-emerald-500 mx-auto mb-1 animate-pulse" />
                                        <p className="font-black text-slate-800 text-xs sm:text-sm leading-none whitespace-nowrap">Simple Rank</p>
                                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider mt-1.5">Arena + XP</p>
                                    </div>

                                    {/* User XP Standings */}
                                    {userLeague === selectedLeague && (
                                        <>
                                            <div className="bg-white border border-slate-200/80 rounded-2xl px-2 sm:px-4 py-3 text-center shadow-sm w-[calc(50%-0.375rem)] sm:w-32 shrink-0">
                                                <Zap className="w-4 h-4 text-amber-500 mx-auto mb-1 animate-pulse" />
                                                <p className="font-black text-slate-800 text-xs sm:text-sm leading-none">{myXP} XP</p>
                                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider mt-1.5">Your Score</p>
                                            </div>
                                            <div className="bg-white border border-slate-200/80 rounded-2xl px-2 sm:px-4 py-3 text-center shadow-sm w-[calc(50%-0.375rem)] sm:w-32 shrink-0">
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
                                <div className="flex items-end justify-center gap-1.5 sm:gap-6 max-w-3xl mx-auto">
                                    {[1, 0, 2].map((idx) => {
                                        const isFirst = idx === 0;
                                        return (
                                            <div key={idx} className={`flex min-w-0 flex-col items-center flex-1 max-w-[220px] ${isFirst ? 'scale-105 z-10' : 'scale-95'} animate-pulse`}>
                                                <div className="w-full bg-white border border-slate-100 rounded-3xl p-2.5 sm:p-5 flex flex-col items-center text-center shadow-sm">
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
                                <div className="flex items-end justify-center gap-1.5 sm:gap-6 max-w-3xl mx-auto">
                                    {podiumSlots.map(({ data, rankIndex, cfg, rankLabel }, i) => {
                                        if (!data) return <div key={i} className="flex-1 max-w-[180px] hidden sm:block" />;
                                        const isFirst = rankIndex === 0;
                                        const isMe = user?.id === data.student_id;

                                        return (
                                            <div key={data.student_id} className={`flex min-w-0 flex-col items-center flex-1 max-w-[220px] transition-all duration-500 ${isFirst ? 'scale-105 z-10' : 'scale-95'}`}>
                                                
                                                {/* Crown or Icon */}
                                                {isFirst && (
                                                    <div className="mb-2">
                                                        <Crown className="w-8 h-8 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-bounce" />
                                                    </div>
                                                )}

                                                {/* User Info Card */}
                                                <div className={`w-full bg-white border border-slate-200 rounded-3xl p-2.5 sm:p-5 flex flex-col items-center text-center shadow-md relative overflow-hidden ${isMe ? 'ring-2 ring-teal-500 border-transparent' : ''}`}>
                                                    {isMe && (
                                                        <div className="absolute top-2 right-2 bg-teal-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                                                            You
                                                        </div>
                                                    )}

                                                    {/* Avatar */}
                                                    <div className="relative mb-3">
                                                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${cfg.avatarBg} ring-4 ${cfg.ring} ring-offset-2 ring-offset-white flex items-center justify-center shadow-inner`}>
                                                            <span className="font-black text-white text-lg sm:text-xl">
                                                                {getInitials(data.student_name)}
                                                            </span>
                                                        </div>
                                                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${isFirst ? 'bg-yellow-500 text-slate-900' : 'bg-slate-200 text-slate-700'} flex items-center justify-center font-black text-xs border border-white shadow-sm`}>
                                                            {data.rank}
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
                        {selectedLeague !== 'gold' && (
                            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                    <span className="text-slate-800 font-black text-sm flex items-center gap-2">
                                        <ListOrdered className="w-4 h-4 text-slate-500" />
                                        League Standings (Top 12)
                                    </span>
                                    <span className="hidden sm:inline text-slate-400 text-[10px] font-black uppercase tracking-wider">Total XP Score</span>
                                </div>

                            {(!hasLoadedOnce || isLocalLoading) ? (
                                /* List Skeleton Loader */
                                <div className="divide-y divide-slate-100 animate-pulse">
                                    {[1, 2, 3, 4, 5].map((idx) => (
                                        <div key={idx} className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4">
                                            <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
                                            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                                            <div className="flex-1">
                                                <div className="h-4 w-28 bg-slate-200 rounded-md" />
                                            </div>
                                            <div className="h-5 w-12 bg-slate-200 rounded-md shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            ) : rest.length === 0 ? (
                                <div className="py-16 flex flex-col items-center text-slate-350 gap-2">
                                    <Trophy className="w-10 h-10 opacity-30" />
                                    <p className="text-sm font-bold text-slate-400">No more students in this league yet.</p>
                                    <p className="text-xs text-slate-400">Complete lessons to claim your spot!</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {rest.map((student, idx) => {
                                        const isMe = user?.id === student.student_id;
                                        
                                        return (
                                            <div
                                                key={student.student_id}
                                                className={`flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 transition-all duration-200 relative group ${
                                                    isMe ? 'bg-teal-50/60 border-l-4 border-teal-500' : 'hover:bg-slate-50 border-l-4 border-transparent'
                                                }`}
                                            >
                                                {/* Rank position */}
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                                                    isMe
                                                        ? 'bg-teal-500 text-white shadow-sm'
                                                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                                                }`}>
                                                    {student.rank}
                                                </div>

                                                {/* Avatar initials */}
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 ring-2 ${
                                                    isMe
                                                        ? 'bg-teal-500 text-white ring-teal-200'
                                                        : 'bg-slate-100 text-slate-600 ring-slate-200'
                                                }`}>
                                                    {getInitials(student.student_name)}
                                                </div>

                                                {/* Name + indicators */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`font-black text-sm truncate ${isMe ? 'text-teal-700' : 'text-slate-800'}`}>
                                                            {student.student_name}
                                                        </p>
                                                        {isMe && (
                                                            <span className="bg-teal-100 text-teal-700 text-[8px] font-black px-1.5 py-0.5 rounded-full">YOU</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* XP score */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className={`font-black text-base ${isMe ? 'text-teal-600' : 'text-slate-700'}`}>
                                                        {student.weekly_xp}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">XP</span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Pinned "My Rank" card at the bottom of the list if the user is outside the top 12 */}
                                    {!isMeInTop12 && myRank !== null && userLeague === selectedLeague && (
                                        <div className="bg-teal-50/70 border-t-2 border-dashed border-teal-200 flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500" />
                                            
                                            {/* Rank position */}
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 bg-teal-500 text-white shadow-sm animate-pulse">
                                                {myRank}
                                            </div>

                                            {/* Avatar initials */}
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 ring-2 bg-teal-500 text-white ring-teal-200">
                                                {getInitials(user?.full_name)}
                                            </div>

                                            {/* Name + indicators */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-sm truncate text-teal-700">
                                                        {user?.full_name}
                                                    </p>
                                                    <span className="bg-teal-100 text-teal-700 text-[8px] font-black px-1.5 py-0.5 rounded-full">YOU</span>
                                                </div>
                                            </div>

                                            {/* XP score */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="font-black text-base text-teal-600">
                                                    {myXP}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">XP</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        )}

                        {/* ── PRIVACY OPT-OUT DIALOG ── */}
                        <div className="mt-8 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3">
                            <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-xs text-slate-700">Privacy & Settings</h4>
                                <p className="text-slate-500 text-xs mt-0.5">
                                    Want to opt out of the competitive leaderboards? You can toggle your visibility status to private under Profile Settings at any time to hide your name.
                                </p>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}
