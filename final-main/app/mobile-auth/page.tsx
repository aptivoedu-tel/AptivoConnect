'use client';

import { GraduationCap, ShieldCheck } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function MobileAuth() {
    const params = useSearchParams();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const challenge = params.get('challenge') ?? '';
    const state = params.get('state') ?? '';
    const redirectUri = params.get('redirect_uri') ?? 'aptivo://auth/complete';
    const intent = params.get('intent') === 'register' ? 'register' : 'login';

    async function continueWithGoogle() {
        if (!/^[a-f0-9]{64}$/.test(challenge) || !/^[a-f0-9-]{36}$/.test(state)) {
            setError('This sign-in link has expired. Return to Aptivo and try again.');
            return;
        }
        setBusy(true);
        try {
            const secure = location.protocol === 'https:' ? '; Secure' : '';
            document.cookie = `auth_intent=${intent}; path=/; max-age=600; SameSite=Lax${secure}`;
            document.cookie = `mobile_auth_return=${encodeURIComponent(`/mobile-auth?${new URLSearchParams({ challenge, state, intent, redirect_uri: redirectUri })}`)}; path=/; max-age=3600; SameSite=Lax${secure}`;
            await signIn('google', { callbackUrl: `/api/auth/mobile/authorize?${new URLSearchParams({ challenge, state, redirect_uri: redirectUri })}` });
        } catch {
            setError('Google sign-in could not start. Please try again.');
            setBusy(false);
        }
    }

    return <main className="min-h-screen bg-slate-50 px-5 py-10 sm:p-8 flex items-center justify-center"><section className="w-full max-w-md overflow-hidden rounded-[2rem] border border-teal-100 bg-white shadow-xl shadow-teal-950/5"><div className="bg-teal-600 px-7 py-8 text-white sm:px-9"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><GraduationCap className="h-7 w-7" aria-hidden="true" /></div><p className="text-xs font-black uppercase tracking-[0.18em] text-teal-100">Aptivo student portal</p><h1 className="mt-2 text-3xl font-black tracking-tight">Continue with Aptivo</h1></div><div className="space-y-6 p-7 sm:p-9"><div><p className="text-base leading-7 text-slate-600">Sign in securely with your existing Aptivo Google account. You will return to the app automatically.</p><div className="mt-4 flex items-center gap-2 text-sm font-semibold text-teal-700"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Secure mobile sign-in</div></div>{error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}<button type="button" disabled={busy} onClick={continueWithGoogle} className="w-full rounded-2xl bg-teal-600 px-5 py-4 font-black text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70">{busy ? 'Connecting to Google…' : 'Continue with Google'}</button><p className="text-center text-xs leading-5 text-slate-500">New students complete Aptivo’s password setup after Google sign-in.</p></div></section></main>;
}

export default function Page() { return <Suspense><MobileAuth /></Suspense>; }
