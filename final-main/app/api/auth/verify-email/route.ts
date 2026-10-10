// GET /api/auth/verify-email?token=xxx
// Verifies the user's email token and activates their account

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token || !/^[a-f0-9]{64}$/.test(token)) {
            return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
        }

        await connectToDatabase();

        const user = await User.findOneAndUpdate({
            verification_token: token,
            verification_token_expiry: { $gt: new Date() },
            role: 'student',
            status: 'pending',
            email_verified: false,
        }, {
            $set: { email_verified: true, status: 'active' },
            $unset: { verification_token: 1, verification_token_expiry: 1 },
        }, { returnDocument: 'after', runValidators: true });

        if (!user) {
            return NextResponse.redirect(new URL('/login?error=expired_token', req.url));
        }

        return NextResponse.redirect(new URL('/login?verified=true', req.url));

    } catch {
        console.error('[VERIFY EMAIL] Verification failed');
        return NextResponse.redirect(new URL('/login?error=server_error', req.url));
    }
}
