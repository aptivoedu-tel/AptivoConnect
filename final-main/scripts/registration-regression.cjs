// Runs the real registration handlers against an isolated in-memory User model.
// Database connection, email delivery, and network access are mocked.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,mocks={}){
 const full=path.join(root,file),module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const localRequire=id=>Object.hasOwn(mocks,id)?mocks[id]:require(id);
 new Function('require','module','exports',source)(localRequire,module,module.exports);return module.exports;
}
const clone=value=>value==null?value:structuredClone(value);
const matches=(doc,filter)=>Object.entries(filter).every(([key,value])=>{
 const actual=doc?.[key];
 if(value&&typeof value==='object'&&!Array.isArray(value))return Object.entries(value).every(([op,operand])=>op==='$gt'?actual>operand:actual===operand);
 return actual===value;
});
async function main(){
 const {NextRequest}=require('next/server');
 const db={users:[],findCalls:[],atomicCalls:[],createCalls:[],emailCalls:[],connectCalls:0};
 const User={
  findOne:async filter=>{db.findCalls.push(clone(filter));return clone(db.users.find(u=>matches(u,filter))||null);},
  findOneAndUpdate:async(filter,update)=>{db.atomicCalls.push({filter:clone(filter),update:clone(update)});const i=db.users.findIndex(u=>matches(u,filter));if(i<0)return null;const next=db.users[i];Object.assign(next,clone(update.$set||{}));for(const key of Object.keys(update.$unset||{}))delete next[key];return clone(next);},
  create:async value=>{db.createCalls.push(clone(value));const doc={_id:`id-${db.createCalls.length}`,...clone(value)};db.users.push(doc);return clone(doc);}
 };
 const route=load('app/api/auth/register/route.ts',{
  'bcryptjs':{hash:async value=>`hashed:${value}`},
  'crypto':require('crypto'),
  '@/lib/mongodb/connection':async()=>{db.connectCalls++;},
  '@/lib/mongodb/models/User':User,
  '@/lib/mail':{sendEmail:async value=>{db.emailCalls.push(value);}},
  '@/lib/emailTemplates':{verificationEmailTemplate:()=>'<mock>'},
  '@/lib/validation':{sanitizeString:value=>value}
 });
 const verify=load('app/api/auth/verify-email/route.ts',{
  '@/lib/mongodb/connection':async()=>{db.connectCalls++;},
  '@/lib/mongodb/models/User':User
 });
 const googleRegister=load('app/api/auth/google-register/route.ts',{
  'crypto':require('crypto'),
  '@/lib/mongodb/connection':async()=>{db.connectCalls++;},
  '@/lib/mongodb/models/User':User,
  '@/lib/mail':{sendEmail:async value=>{db.emailCalls.push(value);}},
  '@/lib/emailTemplates':{setPasswordEmailTemplate:()=>'<mock>'}
 });
 const post=(body)=>new NextRequest('http://localhost/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const rawPost=(raw)=>new NextRequest('http://localhost/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:raw});
 const payload=(overrides={})=>({email:'student@example.test',full_name:'Test Student',password:'password-123',...overrides});
 let before=db.connectCalls;
 for(const response of [await route.POST(rawPost('{bad json')),await route.POST(post(null)),await route.POST(post([])),await route.POST(post(payload({email:7}))),await route.POST(post(payload({full_name:{}}))),await route.POST(post(payload({password:9}))),await route.POST(post(payload({email:'not-an-email'}))),await route.POST(post(payload({full_name:'   '}))),await route.POST(post(payload({password:'short'}))),await route.POST(post(payload({password:'é'.repeat(37)})))]) assert.equal(response.status,400);
 assert.equal(db.connectCalls,before,'invalid registration input must not connect to DB');
 for(const denied of [{role:'institution_admin'},{role:'super_admin'},{role:''},{institution_id:9},{institution_name:'School'},{institution_type:'College'}]) assert.equal((await route.POST(post(payload(denied)))).status,403);
 assert.equal(db.connectCalls,before,'forbidden registration input must not connect to DB');
 assert.equal((await route.POST(post(payload({institution_id:null,institution_name:null,institution_type:null})))).status,201,'null institution fields are allowed');
 assert.equal(db.users.length,1);assert.equal(db.users[0].role,'student');assert.equal(db.users[0].status,'pending');assert.equal(db.users[0].email_verified,false);assert.equal(db.users[0].is_solo,true);assert.equal(db.users[0].institution_id,undefined);
 assert.equal(db.emailCalls.length,1);

 let userNumber=0;
 const protectedUser=(role,status,verified=true)=>({_id:`existing-${++userNumber}`,id:`existing-${userNumber}`,email:`${role}-${status}-${userNumber}@example.test`,full_name:'Existing',role,status,email_verified:verified,is_solo:false,institution_id:44,password:'old-hash'});
 for(const old of [protectedUser('institution_admin','pending',false),protectedUser('super_admin','active',false),protectedUser('student','suspended',false),protectedUser('student','inactive',false),protectedUser('institution_admin','deleted',false)]){
  db.users.push(clone(old));const count=db.createCalls.length;
  const response=await route.POST(post(payload({email:old.email})));
  assert.equal(response.status,409,`${old.role}/${old.status} must be protected`);assert.equal(db.createCalls.length,count);
 }
 const pending=protectedUser('student','pending',false);pending.email='retry@example.test';db.users.push(pending);
 let response=await route.POST(post(payload({email:pending.email,full_name:'Updated Student'})));
 assert.equal(response.status,201);assert.equal(db.createCalls.length,1);assert.equal(pending.status,'pending');
 assert.equal(pending.role,'student');assert.equal(pending.email_verified,false);assert.equal(pending.is_solo,true);assert.equal(pending.institution_id,undefined);assert.equal(pending.full_name,'Updated Student');
 const cas=db.atomicCalls.at(-1).filter;
 assert.equal(cas._id,pending._id);assert.equal(cas.role,'student');assert.equal(cas.status,'pending');assert.equal(cas.email_verified,false);

 const deleted=protectedUser('student','deleted',false);deleted.email='recover@example.test';db.users.push(deleted);
 response=await route.POST(post(payload({email:deleted.email})));
 assert.equal(response.status,201);assert.equal(deleted.status,'pending');assert.equal(deleted.role,'student');assert.equal(deleted.email_verified,false);assert.equal(deleted.is_solo,true);assert.equal(deleted.institution_id,undefined);

 // A concurrent role/status change after the initial lookup must fail its CAS.
 const raced=protectedUser('student','pending',false);raced.email='race@example.test';db.users.push(raced);
 const originalAtomic=User.findOneAndUpdate;
 User.findOneAndUpdate=async(filter,update)=>{raced.role='institution_admin';return originalAtomic(filter,update);};
 response=await route.POST(post(payload({email:raced.email})));
 assert.equal(response.status,409);assert.equal(raced.role,'institution_admin');assert.equal(raced.status,'pending');
 User.findOneAndUpdate=originalAtomic;
 console.log('PASS: registration rejects malformed/privileged input, creates solo pending students, and uses guarded recovery writes');

 db.users=[];db.atomicCalls=[];
 const addVerifyUser=(overrides={})=>{const item={_id:'verify-id',id:'verify-id',email:'verify@example.test',role:'student',status:'pending',email_verified:false,verification_token:'a'.repeat(64),verification_token_expiry:new Date(Date.now()+3600000),...overrides};db.users.push(item);return item;};
 const get=token=>new NextRequest(`http://localhost/api/auth/verify-email?token=${token}`);
 let verifyUser=addVerifyUser();const validToken=verifyUser.verification_token;response=await verify.GET(get(validToken));assert.equal(response.status,307);assert.match(response.headers.get('location'),/verified=true/);assert.equal(verifyUser.status,'active');assert.equal(verifyUser.email_verified,true);assert.equal(verifyUser.verification_token,undefined);
 response=await verify.GET(get(validToken));assert.match(response.headers.get('location'),/error=(expired|invalid)_token/);
 db.users=[];const concurrent=addVerifyUser();
 const attempts=await Promise.all([verify.GET(get(concurrent.verification_token)),verify.GET(get(concurrent.verification_token))]);
 assert.equal(attempts.filter(r=>r.headers.get('location').includes('verified=true')).length,1);
 db.users=[];
 for(const user of [addVerifyUser({role:'institution_admin'}),addVerifyUser({role:'student',status:'suspended'}),addVerifyUser({role:'student',status:'inactive'}),addVerifyUser({role:'student',status:'active'}),addVerifyUser({role:'student',email_verified:true}),addVerifyUser({role:'super_admin'})]){
  const oldStatus=user.status;const oldRole=user.role;const oldVerified=user.email_verified;const url=await verify.GET(get(user.verification_token));assert.match(url.headers.get('location'),/error=(expired|invalid)_token/);assert.equal(user.status,oldStatus);assert.equal(user.role,oldRole);assert.equal(user.email_verified,oldVerified);
 }
 const expired=addVerifyUser({verification_token:'b'.repeat(64),verification_token_expiry:new Date(Date.now()-1000)});
 response=await verify.GET(get(expired.verification_token));assert.match(response.headers.get('location'),/error=(expired|invalid)_token/);
 for(const malformed of ['x','g'.repeat(64),'']){response=await verify.GET(get(malformed));assert.match(response.headers.get('location'),/error=(expired|invalid)_token/);}
 const atomicVerify=db.atomicCalls.at(-1).filter;
 assert.equal(atomicVerify.role,'student');assert.equal(atomicVerify.status,'pending');assert.equal(atomicVerify.email_verified,false);assert.match(atomicVerify.verification_token,/^[a-f0-9]{64}$/);
 console.log('PASS: verification activates only pending unverified students with a valid 64-hex, unexpired token');

 before=db.connectCalls;const emails=db.emailCalls.length;
 response=await googleRegister.POST(new NextRequest('http://localhost/api/auth/google-register',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}));
 assert.equal(response.status,410);assert.equal(db.connectCalls,before);assert.equal(db.emailCalls.length,emails);
 console.log('PASS: retired Google registration endpoint returns 410 without DB or email work');

 // Existing Google accounts must not grant or restore privileged access.
 process.env.NEXTAUTH_SECRET='isolated-test-secret';
 const callbackUser={_id:'admin-id',id:'admin-id',email:'admin@example.test',role:'institution_admin',status:'pending',email_verified:false,save:async()=>{throw new Error('must not save');}};
 let cookieRead=0;
 const auth=load('lib/authOptions.ts',{
  'next-auth/providers/credentials':()=>({}),
  'next-auth/providers/google':()=>({}),
  'next/headers':{cookies:async()=>({get:()=>{cookieRead++;return{value:'register'};},delete:()=>{cookieRead++;}})},
  '@/lib/mongodb/connection':async()=>{},
  '@/lib/mongodb/models':{User:{findOne:async()=>callbackUser,create:async()=>{throw new Error('must not create');}}},
  '@/lib/mobile-auth':{authenticateCredentials:async()=>null,publicUser:value=>value},
  'crypto':require('crypto')
 });
 const signIn=auth.authOptions.callbacks.signIn;
 let decision=await signIn({user:{email:callbackUser.email},account:{provider:'google'}});
 assert.equal(decision,'/login?error=PENDING_APPROVAL');assert.equal(callbackUser.status,'pending');assert.equal(callbackUser.email_verified,false);assert.equal(cookieRead,0);
 callbackUser.role='institution_admin';callbackUser.status='deleted';callbackUser.email_verified=false;
 decision=await signIn({user:{email:callbackUser.email},account:{provider:'google'}});
 assert.equal(decision,'/login?error=PENDING_APPROVAL');assert.equal(callbackUser.status,'deleted');assert.equal(callbackUser.email_verified,false);
 callbackUser.role='super_admin';callbackUser.status='active';callbackUser.email_verified=true;callbackUser.provider='google';
 assert.equal(await signIn({user:{email:callbackUser.email},account:{provider:'google'}}),true,'approved admins retain Google sign-in');
 callbackUser.role='student';callbackUser.status='active';
 assert.equal(await signIn({user:{email:callbackUser.email},account:{provider:'google'}}),true,'students retain Google sign-in');
 assert.equal(await signIn({user:{},account:{provider:'google'}}),false,'Google sign-in requires an email');
 console.log('PASS: web Google callback leaves pending/deleted privileged accounts untouched');

 // Mock Google token verification so the mobile handler is exercised without contacting Google.
 const mobileUser={email:'admin@example.test',role:'institution_admin',status:'pending',email_verified:false,save:async()=>{throw new Error('must not save');}};
 const mobile=load('app/api/mobile/auth/google/route.ts',{
  'jose':{createRemoteJWKSet:()=>({}),jwtVerify:async()=>({payload:{email:mobileUser.email,email_verified:true}})},
  '@/lib/mongodb/connection':async()=>{},
  '@/lib/mongodb/models':{User:{findOne:async()=>mobileUser}},
  '@/lib/mobile-auth':{assertAccount:()=>{},issueMobileToken:async()=>{throw new Error('must not issue');},mobileCors:{},publicUser:value=>value}
 });
 process.env.GOOGLE_CLIENT_ID='mock-google-client-id';
 response=await mobile.POST(new NextRequest('http://localhost/api/mobile/auth/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id_token:'mock-token'})}));
 assert.equal(response.status,403);assert.equal(mobileUser.email_verified,false);assert.equal(mobileUser.status,'pending');
 console.log('PASS: mobile Google auth rejects privileged accounts before verification updates');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
