'use client';

export default function ConnectError({ reset }: { reset: () => void }) {
    return (
        <main className="mx-auto max-w-xl space-y-4 px-6 py-20">
            <h1 className="text-2xl font-bold text-slate-900">Connect is temporarily unavailable</h1>
            <p className="text-slate-600">We could not connect to Aptivo right now. Please try again shortly.</p>
            <button onClick={reset} className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700">Try again</button>
            <a href="/dashboard" className="block text-teal-800 underline">Back to Aptivo</a>
        </main>
    );
}
