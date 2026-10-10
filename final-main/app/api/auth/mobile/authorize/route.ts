import {NextRequest,NextResponse} from 'next/server';
import {getToken} from 'next-auth/jwt';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/authOptions';
import connectToDatabase from '@/lib/mongodb/connection';
import {createHash,randomBytes} from 'crypto';
export async function GET(req:NextRequest){
 const challenge=req.nextUrl.searchParams.get('challenge')||'',state=req.nextUrl.searchParams.get('state')||'',redirectUri=req.nextUrl.searchParams.get('redirect_uri')||'aptivo://auth/complete';
 if(!/^[a-f0-9]{64}$/.test(challenge)||!/^[a-f0-9-]{36}$/.test(state))return NextResponse.json({error:'Invalid mobile authorization request'},{status:400});
 const session=await getServerSession(authOptions);
 if(!session?.user||session.user.role!=='student')return NextResponse.json({error:'A student session is required'},{status:401});
 const token=await getToken({req,secret:process.env.NEXTAUTH_SECRET,raw:true});
 if(!token)return NextResponse.json({error:'Session missing'},{status:401});
 const db=await connectToDatabase();const tickets=db.connection.collection('mobile_session_handoffs');
 await tickets.createIndex({expiresAt:1},{expireAfterSeconds:0});
 const code=randomBytes(32).toString('hex');
 await tickets.insertOne({codeHash:createHash('sha256').update(code).digest('hex'),challenge,token,expiresAt:new Date(Date.now()+60000)});
 const destination=new URL('aptivo://auth/complete');destination.searchParams.set('code',code);destination.searchParams.set('state',state);
 let destinationUrl='aptivo://auth/complete';
 try { const parsed=new URL(redirectUri); if(['aptivo:','exp:','http:','https:'].includes(parsed.protocol)) destinationUrl=redirectUri; } catch {}
 const responseUrl=new URL(destinationUrl); responseUrl.searchParams.set('code',code); responseUrl.searchParams.set('state',state);
 const response=NextResponse.redirect(responseUrl);response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
}
