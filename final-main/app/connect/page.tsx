import ConnectPage from '@aptivo/connect';
import { redirect } from 'next/navigation';
import ConnectShell from '@/components/connect/ConnectShell';
import { getPortalSession } from '@/lib/portalSession';
import { authOptions } from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';

export const metadata = { title: 'Connect | Aptivo' };

export default async function StudentConnectPage() {
    const session = await getPortalSession(authOptions);
    if (typeof session?.user?.id !== 'string' || !session.user.id) redirect('/login');

    await connectToDatabase();
    const user = await User.findOne({ id: session.user.id }).lean();
    if (!user || user.status !== 'active' || !user.email_verified) redirect('/login?error=ACCOUNT_UNAVAILABLE');
    if (user.role === 'super_admin') redirect('/admin/dashboard');
    if (user.role === 'institution_admin') redirect('/institution-admin');
    if (user.role !== 'student') redirect('/login?error=ACCOUNT_UNAVAILABLE');

    return <ConnectShell userName={user.full_name} userAvatar={user.avatar_url}><ConnectPage viewer={{ id: String(user.id ?? session.user.id!), name: user.full_name, role: user.role }} /></ConnectShell>;
}
