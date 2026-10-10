import {NextRequest,NextResponse} from 'next/server';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import connectToDatabase from '@/lib/mongodb/connection';
import {User} from '@/lib/mongodb/models';
import {assertAccount,issueMobileToken,mobileCors,publicUser} from '@/lib/mobile-auth';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export async function OPTIONS(){return new NextResponse(null,{status:204,headers:mobileCors});}
export async function POST(req:NextRequest){
 try{
  const {id_token}=await req.json();if(typeof id_token!=='string'||id_token.length>16000)return NextResponse.json({error:'A Google ID token is required.'},{status:400,headers:mobileCors});
  const audience=[process.env.GOOGLE_CLIENT_ID,process.env.MOBILE_GOOGLE_CLIENT_ID].filter(Boolean) as string[];
  if(!audience.length)return NextResponse.json({error:'Google sign-in is not configured.'},{status:503,headers:mobileCors});
  const {payload}=await jwtVerify(id_token,googleKeys,{algorithms:['RS256'],issuer:['https://accounts.google.com','accounts.google.com'],audience});
  if(payload.email_verified!==true||typeof payload.email!=='string')return NextResponse.json({error:'Google email is not verified.'},{status:401,headers:mobileCors});
  await connectToDatabase();const user=await User.findOne({email:payload.email.toLowerCase().trim()});
  // New-account intent and password setup belong to the existing portal OAuth flow.
  if(!user||user.status==='deleted')return NextResponse.json({error:'Create your account using Continue with Google in the app.',code:'NOT_REGISTERED'},{status:403,headers:mobileCors});
  if(['suspended','blocked','inactive'].includes(user.status))return NextResponse.json({error:'Account is unavailable.'},{status:403,headers:mobileCors});
  if(user.role!=='student')return NextResponse.json({error:'A student account is required.'},{status:403,headers:mobileCors});
  if(!user.email_verified){user.email_verified=true;user.status='active';user.provider='google';await user.save();}
  assertAccount(user);return NextResponse.json({success:true,token:await issueMobileToken(user),user:publicUser(user)},{headers:mobileCors});
 }catch{return NextResponse.json({success:false,error:'Google sign-in could not be verified.'},{status:401,headers:mobileCors});}
}
