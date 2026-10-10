import {getServerSession,type AuthOptions,type Session} from 'next-auth';
import {headers} from 'next/headers';
import {resolveMobileUser,publicUser,isAuthRejection} from '@/lib/mobile-auth';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';

/** Preserve web NextAuth sessions; adapt verified mobile tokens to the same API session shape. */
export async function getPortalSession(options:AuthOptions):Promise<Session | null>{
 const authorization=(await headers()).get('authorization');
 if(authorization?.startsWith('Bearer ')){
   try{const {user,expires}=await resolveMobileUser(authorization.slice(7));return {user:publicUser(user),expires};}catch(e){if(isAuthRejection(e))return null;throw e;}
 }
 const session=await getServerSession(options);
 if(typeof session?.user?.id!=='string'||!session.user.id)return null;
 await connectToDatabase();
 const user=await User.findOne({id:session.user.id}).select('id email full_name role status email_verified avatar_url institution_id tour_completed').lean();
 if(!user||user.status!=='active'||!user.email_verified||!['student','institution_admin','super_admin'].includes(user.role))return null;
 return {...session,user:publicUser(user)};
}
