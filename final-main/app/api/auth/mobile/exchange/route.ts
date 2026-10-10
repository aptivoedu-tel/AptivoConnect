import {NextRequest,NextResponse} from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import {createHash} from 'crypto';
import {decode} from 'next-auth/jwt';
import {User} from '@/lib/mongodb/models';
import {issueMobileToken,publicUser,mobileCors} from '@/lib/mobile-auth';
export async function POST(req:NextRequest){
 const {code,verifier}=await req.json();
 if(typeof code!=='string'||!/^[a-f0-9]{64}$/.test(code)||typeof verifier!=='string'||verifier.length<64||verifier.length>128)return NextResponse.json({error:'Invalid exchange'},{status:400});
 const db=await connectToDatabase();
 const result=await db.connection.collection('mobile_session_handoffs').findOneAndDelete({codeHash:createHash('sha256').update(code).digest('hex'),challenge:createHash('sha256').update(verifier).digest('hex'),expiresAt:{$gt:new Date()}});
 const ticket=result?.value||result;
 if(!ticket?.token)return NextResponse.json({error:'Authorization expired or already used. Please sign in again.'},{status:401});
 const payload=await decode({token:ticket.token,secret:process.env.NEXTAUTH_SECRET!});
 if(!payload?.email)return NextResponse.json({error:'Session expired. Please sign in again.'},{status:401,headers:mobileCors});
 const user=await User.findOne({email:payload.email,id:payload.id}).lean();
 try{return NextResponse.json({success:true,token:await issueMobileToken(user),user:publicUser(user)},{headers:mobileCors});}
 catch{return NextResponse.json({error:'A verified, active student account is required.'},{status:403,headers:mobileCors});}
}
