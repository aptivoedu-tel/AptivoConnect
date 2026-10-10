import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';

function safeReturnPath(value: string | null) {
    return value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
        ? value
        : '/dashboard';
}

/** Consumes a one-time browser handoff and restores the existing web session in WebView. */
export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code') ?? '';
    const verifier = request.nextUrl.searchParams.get('verifier') ?? '';
    if (!/^[a-f0-9]{64}$/.test(code) || verifier.length < 64 || verifier.length > 128) {
        return NextResponse.redirect(new URL('/login?error=mobile_auth_failed', request.url));
    }

    const database = await connectToDatabase();
    const ticket = await database.connection.collection('mobile_session_handoffs').findOneAndDelete({
        codeHash: createHash('sha256').update(code).digest('hex'),
        challenge: createHash('sha256').update(verifier).digest('hex'),
        expiresAt: { $gt: new Date() },
    });
    const handoff = ticket?.value ?? ticket;
    if (!handoff?.token || typeof handoff.token !== 'string') {
        return NextResponse.redirect(new URL('/login?error=mobile_auth_expired', request.url));
    }

    const response = NextResponse.redirect(new URL(safeReturnPath(request.nextUrl.searchParams.get('returnTo')), request.url));
    const secure = new URL(request.url).protocol === 'https:';
    response.cookies.set({
        name: secure ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
        value: handoff.token,
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
    });
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
}
