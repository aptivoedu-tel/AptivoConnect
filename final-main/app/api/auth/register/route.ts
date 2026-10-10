// POST /api/auth/register
// Registers a new user and sends a verification email

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';
import { sendEmail } from '@/lib/mail';
import { verificationEmailTemplate } from '@/lib/emailTemplates';
import { sanitizeString } from '@/lib/validation';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return NextResponse.json({ error: 'A registration object is required.' }, { status: 400 });
        }
        if ((body.role !== undefined && body.role !== 'student') ||
            ['institution_id', 'institution_name', 'institution_type'].some(field => body[field] != null)) {
            return NextResponse.json({ error: 'Public registration is for students. Institution access must be granted by an authorized administrator.' }, { status: 403 });
        }
        const { password } = body;
        if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) || body.email.length > 254 ||
            typeof body.full_name !== 'string' || !body.full_name.trim() || body.full_name.length > 200 ||
            typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
            return NextResponse.json({ error: 'Provide a valid email, full name, and a password of at least 8 characters and at most 72 bytes.' }, { status: 400 });
        }
        const email = body.email.toLowerCase().trim();
        const full_name = body.full_name.trim();

        await connectToDatabase();

        // Check duplicate
        const existing = await User.findOne({ email });
        const isUnverifiedExisting = !!existing && existing.role === 'student' && existing.status === 'pending' && !existing.email_verified;
        if (existing && (existing.role !== 'student' || (!isUnverifiedExisting && existing.status !== 'deleted'))) {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiry = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

        const newStatus = 'pending';
        let newUser;

        if (existing) {
            // Recheck eligibility atomically so a concurrent suspension or role grant wins.
            newUser = await User.findOneAndUpdate({
                _id: existing._id, role: 'student', status: existing.status, email_verified: existing.email_verified,
            }, {
                $set: { full_name, role: 'student', status: newStatus, email_verified: false, is_solo: true,
                    password: hashedPassword, verification_token: verificationToken, verification_token_expiry: verificationExpiry },
                $unset: { institution_id: 1 },
            }, { returnDocument: 'after', runValidators: true });
            if (!newUser) {
                return NextResponse.json({ error: 'Account changed. Please try again.' }, { status: 409 });
            }
        } else {
            newUser = await User.create({
                id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                email,
                full_name,
                role: 'student',
                status: newStatus,
                email_verified: false,
                is_solo: true,
                password: hashedPassword,
                provider: 'credentials',
                verification_token: verificationToken,
                verification_token_expiry: verificationExpiry,
                created_at: new Date(),
            });
        }

        // Send verification email
        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://aptivo.tech';
        const verificationLink = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

        try {
            await sendEmail({
                to: email,
                subject: 'Verify Your Email – APTIVO',
                html: verificationEmailTemplate(sanitizeString(full_name), verificationLink),
            });
        } catch (emailErr) {
            console.error('[REGISTER] Email send failed:', emailErr);
            // Don't fail registration if email fails — just log it
        }

        return NextResponse.json({
            success: true,
            alreadyExisted: isUnverifiedExisting, // true = existing unverified account, false = brand new
            message: isUnverifiedExisting
                ? 'An account with this email already exists but was not verified. We\'ve resent the verification link — please check your inbox (or if not found, check spam folder).'
                : 'Account created! Please check your email to verify your account (or if not found, check spam folder).',
            user: {
                name: newUser.full_name,
                role: newUser.role,
            }
        }, { status: 201 });

    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        console.error('[REGISTER] Registration failed');
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
