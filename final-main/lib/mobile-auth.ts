import {SignJWT,jwtVerify} from 'jose';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb/connection';
import {User} from '@/lib/mongodb/models';

export const mobileCors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Cache-Control':'no-store'};
export function isAuthRejection(error:any){return ['INVALID_CREDENTIALS','ACCOUNT_SUSPENDED','EMAIL_NOT_VERIFIED','PENDING_APPROVAL','STUDENT_ACCOUNT_REQUIRED','INVALID_TOKEN'].includes(error?.message)||/^ERR_(JWT|JWS|JOSE)/.test(error?.code||'');}
export function assertAccount(user:any){
 if(!user)throw new Error('INVALID_CREDENTIALS');
 if(['suspended','blocked','deleted','inactive'].includes(user.status))throw new Error('ACCOUNT_SUSPENDED');
 if(!user.email_verified)throw new Error('EMAIL_NOT_VERIFIED');
 if(user.role==='institution_admin'&&user.status==='pending')throw new Error('PENDING_APPROVAL');
}
export async function authenticateCredentials(email:unknown,password:unknown){
 if(typeof email!=='string'||typeof password!=='string'||!email.trim()||!password)return null;
 await connectToDatabase();
 const normalized=email.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const user=await User.findOne({email:{$regex:new RegExp(`^${normalized}$`,'i')}}).lean() as any;
 if(!user?.password||!await bcrypt.compare(password,user.password))return null;
 assertAccount(user);return user;
}
export function publicUser(user:any){return {id:String(user.id||user._id),email:user.email,name:user.full_name,role:user.role,status:user.status,email_verified:user.email_verified,avatar_url:user.avatar_url,institution_id:user.institution_id,tour_completed:user.tour_completed||false};}
export async function issueMobileToken(user:any){
 assertAccount(user);if(user.role!=='student')throw new Error('STUDENT_ACCOUNT_REQUIRED');
 const secret=process.env.NEXTAUTH_SECRET;if(!secret)throw new Error('SERVER_CONFIGURATION');
 return new SignJWT({...publicUser(user),kind:'mobile'}).setProtectedHeader({alg:'HS256'}).setIssuer('aptivo').setAudience('aptivo-mobile').setSubject(String(user.id||user._id)).setIssuedAt().setExpirationTime('30d').sign(new TextEncoder().encode(secret));
}
export async function resolveMobileUser(token:string){
 const secret=process.env.NEXTAUTH_SECRET;if(!secret)throw new Error('SERVER_CONFIGURATION');
 const {payload}=await jwtVerify(token,new TextEncoder().encode(secret),{algorithms:['HS256'],issuer:'aptivo',audience:'aptivo-mobile'});
 if(payload.kind!=='mobile'||typeof payload.id!=='string'||typeof payload.email!=='string')throw new Error('INVALID_TOKEN');
 await connectToDatabase();const user=await User.findOne({id:payload.id,email:payload.email}).lean() as any;assertAccount(user);
 if(user.role!=='student')throw new Error('STUDENT_ACCOUNT_REQUIRED');
 return {user,expires:new Date(Number(payload.exp)*1000).toISOString()};
}
