import { NextResponse } from 'next/server';

// Account creation belongs to NextAuth's verified Google OAuth callback.
export async function POST() {
    return NextResponse.json({ error: 'Use Continue with Google to register.' }, { status: 410 });
}
