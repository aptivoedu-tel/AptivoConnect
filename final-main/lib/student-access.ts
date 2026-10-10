import { User } from '@/lib/mongodb/models';

/** Read access for a student's own records or their assigned administrator. */
export async function canReadStudent(user: any, studentId: string) {
  if (user.id === studentId || user.role === 'super_admin') return true;
  if (user.role !== 'institution_admin' || !user.institution_id) return false;
  return !!await User.exists({ id: studentId, institution_id: user.institution_id });
}
