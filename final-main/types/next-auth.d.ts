import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            institution_id?: number;
            provider?: string;
        } & DefaultSession["user"];
    }

    interface User {
        role: string;
        institution_id?: number;
        provider?: string;
    }

    interface Profile {
        picture?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        institution_id?: number;
        provider?: string;
    }
}
