import {NextResponse,type NextRequest} from 'next/server';
import {getToken} from 'next-auth/jwt';
import {jwtVerify} from 'jose';
import {isRateLimited} from '@/lib/rate-limit';

const publicPaths=['/mobile-auth','/ambassador','/ambassador-admin','/login','/register','/','/set-password','/forgot-password','/reset-password'];
const publicApis=['/api/auth','/api/mobile/auth','/api/health','/api/contact','/api/ambassadors','/api/mongo/v2-landing','/api/mongo/universities','/api/mongo/exams','/api/mongo/test-sections'];
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, PATCH, PUT, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin'};
function next(){return NextResponse.next({headers:cors});}
export async function middleware(request:NextRequest){
 const {pathname}=request.nextUrl;
 if(pathname.startsWith('/api/')&&request.method==='OPTIONS')return new NextResponse(null,{status:204,headers:cors});
 if(pathname.startsWith('/api/auth')||pathname.startsWith('/api/mobile/auth')){
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'127.0.0.1';
  if(isRateLimited(`auth_${ip}`,{windowMs:60000,max:100}))return NextResponse.json({error:'Too many requests. Please wait a minute.'},{status:429,headers:cors});
 }
 if(publicPaths.includes(pathname)||/^\/(university|test-sections)\/\d+\/pattern/.test(pathname)||pathname.startsWith('/_next')||/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf)$/.test(pathname))return next();
 if(pathname==='/api/mongo/institutions'||publicApis.some(p=>pathname===p||pathname.startsWith(p+'/')))return next();
 const secret=process.env.NEXTAUTH_SECRET;if(!secret)return NextResponse.json({error:'Server configuration error'},{status:500,headers:cors});
 let token:any=null;const authorization=request.headers.get('authorization');
 if(authorization?.startsWith('Bearer ')){
  try{const {payload}=await jwtVerify(authorization.slice(7),new TextEncoder().encode(secret),{algorithms:['HS256'],issuer:'aptivo',audience:'aptivo-mobile'});if(payload.kind==='mobile'&&payload.role==='student'&&payload.email_verified===true)token=payload;}catch{/* API session adapter performs fresh account checks as well. */}
 }else token=await getToken({req:request,secret});
 if(!token)return pathname.startsWith('/api/')?NextResponse.json({error:'Unauthorized'},{status:401,headers:cors}):NextResponse.redirect(new URL('/login',request.url));
 if(pathname.startsWith('/api/mongo/admin/')&&!['super_admin','institution_admin'].includes(token.role))return NextResponse.json({error:'Forbidden'},{status:403,headers:cors});
 if(pathname.startsWith('/admin')&&!['super_admin','institution_admin'].includes(token.role))return NextResponse.redirect(new URL('/dashboard',request.url));
 if(pathname.startsWith('/institution-admin')&&!['super_admin','institution_admin'].includes(token.role))return NextResponse.redirect(new URL('/dashboard',request.url));
 return next();
}
export const config={matcher:['/dashboard/:path*','/admin/:path*','/university/:path*','/profile/:path*','/institution-admin/:path*','/analytics/:path*','/practice/:path*','/progress/:path*','/set-password','/api/:path*']};
