import {NextRequest,NextResponse} from 'next/server';
import {POST as register} from '@/app/api/auth/register/route';
import {mobileCors} from '@/lib/mobile-auth';
export async function OPTIONS(){return new NextResponse(null,{status:204,headers:mobileCors});}
export async function POST(req:NextRequest){const body=await req.json();if(typeof body.email!=='string'||typeof body.password!=='string'||typeof body.full_name!=='string')return NextResponse.json({success:false,error:'Email, password and full name are required.'},{status:400,headers:mobileCors});const response=await register(new NextRequest(req.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:body.email,password:body.password,full_name:body.full_name,role:'student'})}));const data=await response.json();return NextResponse.json({...data,success:response.ok},{status:response.status,headers:mobileCors});}
