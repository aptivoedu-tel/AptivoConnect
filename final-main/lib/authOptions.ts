import { AuthOptions } from "next-auth";
import { cookies } from "next/headers";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import connectToDatabase from "@/lib/mongodb/connection";
import { User } from "@/lib/mongodb/models";
import {authenticateCredentials,publicUser} from '@/lib/mobile-auth';
import crypto from "crypto";

const secret = process.env.NEXTAUTH_SECRET;
if (!secret) {
    throw new Error("NEXTAUTH_SECRET environment variable is not configured. Please define it in your environment/variables.");
}

export const authOptions: AuthOptions = {
    secret: secret,
    session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const user = await authenticateCredentials(credentials?.email, credentials?.password);
                return user ? publicUser(user) : null;
            }
        })
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "google") {
                if (!user.email) return false;
                try {
                    await connectToDatabase();
                    let dbUser = await User.findOne({ email: user.email });
                    if (dbUser && ['suspended','blocked','inactive'].includes(dbUser.status)) return '/login?error=ACCOUNT_SUSPENDED';
                    if (dbUser && dbUser.role !== 'student' && (dbUser.status !== 'active' || !dbUser.email_verified)) {
                        return '/login?error=PENDING_APPROVAL';
                    }

                    const cookieStore = await cookies();
                    const intent = cookieStore.get('auth_intent')?.value;
                    cookieStore.delete('auth_intent');

                    if (!dbUser) {
                        if (intent !== 'register') {
                            console.log("[AUTH] Google login attempted for non-existent user:", user.email);
                            return `/login?error=not_registered&email=${encodeURIComponent(user.email)}`;
                        }

                        console.log("[AUTH] New Google user registration:", user.email);

                        const setPasswordToken = crypto.randomBytes(32).toString('hex');
                        const setPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000);

                        dbUser = await User.create({
                            id: `google_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                            email: user.email,
                            full_name: user.name || profile?.name || 'Google User',
                            role: 'student',
                            status: 'active', // Google already verified the email — no need for pending
                            email_verified: true,
                            is_solo: true,
                            provider: 'google',
                            avatar_url: profile?.picture || user.image || null,
                            set_password_token: setPasswordToken,
                            set_password_token_expiry: setPasswordExpiry,
                        });

                        const baseUrl = process.env.NEXTAUTH_URL || 'https://aptivo.tech';
                        const setPasswordLink = `${baseUrl}/set-password?token=${setPasswordToken}&email=${encodeURIComponent(user.email)}`;
                        return setPasswordLink;
                    } else if (dbUser.status === 'deleted') {
                        if (intent !== 'register') {
                            console.log("[AUTH] Google login attempted for deleted user:", user.email);
                            // Treat as 'not registered' — they need to go through register flow
                            return `/login?error=not_registered&email=${encodeURIComponent(user.email)}`;
                        } else {
                            console.log("[AUTH] Resurrecting soft-deleted Google user:", user.email);
                            dbUser.status = 'active'; // active since they auth'd with Google
                            dbUser.full_name = user.name || profile?.name || dbUser.full_name;
                            dbUser.provider = 'google';
                            dbUser.avatar_url = profile?.picture || user.image || dbUser.avatar_url;

                            const setPasswordToken = crypto.randomBytes(32).toString('hex');
                            const setPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000);
                            dbUser.set_password_token = setPasswordToken;
                            dbUser.set_password_token_expiry = setPasswordExpiry;
                            dbUser.updated_at = new Date();
                            await dbUser.save();

                            const baseUrl = process.env.NEXTAUTH_URL || 'https://aptivo.tech';
                            return `${baseUrl}/set-password?token=${setPasswordToken}&email=${encodeURIComponent(user.email)}`;
                        }
                    } else {
                        // User exists and is not deleted. 
                        // If they registered via email but never verified, Google login auto-verifies them.
                        let updated = false;
                        if (!dbUser.email_verified) {
                            dbUser.email_verified = true;
                            dbUser.status = 'active';
                            updated = true;
                        }
                        if (dbUser.provider !== 'google') {
                            dbUser.provider = 'google';
                            updated = true;
                        }
                        if (updated) {
                            await dbUser.save();
                            console.log("[AUTH] Auto-verified existing user via Google login:", user.email);
                        }
                    }

                    user.role = dbUser.role;
                    user.id = dbUser.id || dbUser._id.toString();
                    user.institution_id = dbUser.institution_id;
                    user.provider = 'google';
                    return true;
                } catch (err) {
                    console.error("[AUTH] Google signIn error:", err);
                    return '/login?error=server_error';
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                token.institution_id = user.institution_id;
                token.provider = user.provider;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role;
                session.user.id = token.id;
                session.user.institution_id = token.institution_id;
                session.user.provider = token.provider;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    debug: false,
};
