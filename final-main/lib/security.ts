import { User } from '@/lib/mongodb/models';
import connectToDatabase from '@/lib/mongodb/connection';

/**
 * Verifies that the authenticated session has permission to access a target institution.
 * - super_admin: access to all institutions
 * - institution_admin: access to their own institution only
 * - student/other: no access to institution administrative actions
 */
export function verifyInstitutionAccess(session: any, targetInstitutionId: number | string | null | undefined): boolean {
    if (!session || !session.user) return false;
    
    const role = session.user.role;
    const userInstId = session.user.institution_id;

    if (role === 'super_admin') return true;

    if (role === 'institution_admin') {
        if (targetInstitutionId === null || targetInstitutionId === undefined) {
            return false;
        }
        return Number(userInstId) === Number(targetInstitutionId);
    }

    return false;
}

/**
 * Verifies that the authenticated session has permission to access a target user's data.
 * - super_admin: access to all users
 * - institution_admin: access to users within their own institution only
 * - student/other: access to their own data only
 */
export async function verifyUserAccess(session: any, targetUserId: string): Promise<boolean> {
    if (!session || !session.user) return false;

    const role = session.user.role;
    const currentUserId = session.user.id;
    const userInstId = session.user.institution_id;

    // 1. super_admin can access any user
    if (role === 'super_admin') return true;

    // 2. Users can access their own data
    if (currentUserId === targetUserId) return true;

    // 3. institution_admin can access users belonging to the same institution
    if (role === 'institution_admin') {
        await connectToDatabase();
        const targetUser = await User.findOne({ id: targetUserId }).lean() as any;
        if (!targetUser) return false;
        
        return Number(userInstId) === Number(targetUser.institution_id);
    }

    return false;
}
