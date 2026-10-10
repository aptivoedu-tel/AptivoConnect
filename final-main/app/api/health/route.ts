import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';

/**
 * GET /api/health
 * Minimal keep-alive endpoint.
 * Called by Vercel Cron every 5 minutes to prevent cold starts.
 * Returns only { ok: true } — no DB metadata exposed.
 */
export async function GET() {
    try {
        await connectToDatabase();
        return NextResponse.json({ ok: true });
    } catch {
        // Don't leak internal error — just signal unhealthy
        return NextResponse.json({ ok: false }, { status: 503 });
    }
}
