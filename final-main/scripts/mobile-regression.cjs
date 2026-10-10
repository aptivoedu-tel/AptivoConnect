// Execute real route/auth code with an isolated in-memory database boundary.
// No production connection, user record, or token is written by this test.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,mocks={}){
 const full=path.join(root,file),module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const localRequire=id=>Object.hasOwn(mocks,id)?mocks[id]:require(id);
 new Function('require','module','exports',source)(localRequire,module,module.exports);return module.exports;
}
async function main(){
 const jose=await import('jose');
 process.env.NEXTAUTH_SECRET='isolated-test-secret-not-used-in-any-environment';
 let account={id:'student-test',email:'student@example.test',role:'student',email_verified:true,status:'active',full_name:'Test Student'};
 let dbError=null;
 const auth=load('lib/mobile-auth.ts',{'jose':jose,'@/lib/mongodb/connection':async()=>{if(dbError)throw dbError;},'@/lib/mongodb/models':{User:{findOne:()=>({lean:async()=>account})}}});
 await assert.rejects(()=>auth.issueMobileToken({...account,email_verified:false}),/EMAIL_NOT_VERIFIED/);
 await assert.rejects(()=>auth.issueMobileToken({...account,role:'super_admin'}),/STUDENT_ACCOUNT_REQUIRED/);
 const token=await auth.issueMobileToken(account);
 assert.equal((await auth.resolveMobileUser(token)).user.id,account.id);
 const bad=await new jose.SignJWT({id:account.id,email:account.email,kind:'mobile'}).setProtectedHeader({alg:'HS256'}).setIssuer('aptivo').setAudience('aptivo-mobile').setExpirationTime('1h').sign(new TextEncoder().encode('another-secret'));
 await assert.rejects(()=>auth.resolveMobileUser(bad));
 const expired=await new jose.SignJWT({id:account.id,email:account.email,kind:'mobile'}).setProtectedHeader({alg:'HS256'}).setIssuer('aptivo').setAudience('aptivo-mobile').setExpirationTime(1).sign(new TextEncoder().encode(process.env.NEXTAUTH_SECRET));
 await assert.rejects(()=>auth.resolveMobileUser(expired));
 account={...account,status:'suspended'};
 await assert.rejects(()=>auth.resolveMobileUser(token),/ACCOUNT_SUSPENDED/);
 account={...account,status:'active'};dbError=new Error('Database unavailable');
 try{await auth.resolveMobileUser(token);assert.fail('Expected database error');}catch(e){assert.equal(auth.isAuthRejection(e),false);}
 dbError=null;
 console.log('PASS: verified student authentication, forged/expired token rejection, fresh account status, database-error classification');

 const policy=load('lib/attempt-policy.ts');
 assert.equal(policy.answersMatch(['3','1'],'1,3','mcq_multiple'),true);
 assert.equal(policy.answersMatch(['1'],'1,3','mcq_multiple'),false);
 assert.equal(policy.answersMatch('2',2,'mcq_single'),true);
 assert.equal(policy.nonnegativeSeconds(-1),0);
 assert.equal(policy.answerId('practice',7,9),policy.answerId('practice',7,9));
 assert.notEqual(policy.answerId('practice',7,9),policy.answerId('practice',8,9));

 const {NextRequest}=require('next/server');
 let session={user:{id:'student-test',role:'student'}},practice={id:7,student_id:'student-test',mcq_ids:[9],is_completed:false},answer=null,statsUpdates=0;
 const query=value=>({lean:async()=>value,then:(resolve)=>Promise.resolve(value).then(resolve)});
 const models={
   PracticeSession:{findOne:async()=>practice,findOneAndUpdate:async()=>practice},
   MCQ:{findOne:async()=>({id:9,correct_option:'B',explanation:'Reason'}),findOneAndUpdate:async()=>{statsUpdates++;}},
   MCQAttempt:{findOne:async()=>answer,find:()=>query(answer?[answer]:[]),create:async value=>{answer=value;return value;}}
 };
 const route=load('app/api/mongo/practice/attempt/route.ts',{'@/lib/portalSession':{getPortalSession:async()=>session},'@/lib/authOptions':{authOptions:{}},'@/lib/mongodb/connection':async()=>{},'@/lib/mongodb/models':models,'@/lib/attempt-policy':policy,'@/lib/student-access':{canReadStudent:async(u,id)=>u.id===id}});
 const request=(body)=>new NextRequest('http://localhost/api/mongo/practice/attempt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const body={practice_session_id:7,mcq_id:9,student_id:'student-test',selected_option:'B',time_spent_seconds:5};
 session=null;assert.equal((await route.POST(request(body))).status,401);
 session={user:{id:'student-test',role:'student'}};
 assert.equal((await route.POST(request({...body,student_id:'another-student'}))).status,404);
 assert.equal((await route.POST(request({...body,mcq_id:100}))).status,400);
 const first=await(await route.POST(request(body))).json();
 const retry=await(await route.POST(request({...body,selected_option:'A'}))).json();
 assert.equal(first.attempt.id,retry.attempt.id);assert.equal(retry.isCorrect,true);assert.equal(statsUpdates,1);
 console.log('PASS: answer ownership, question membership, saved-answer retry preserves the first answer and increments statistics once');

 let completed={id:7,student_id:'student-test',is_completed:true};
 const completion=load('app/api/mongo/practice/route.ts',{
   '@/lib/portalSession':{getPortalSession:async()=>session},'@/lib/authOptions':{authOptions:{}},'@/lib/mongodb/connection':async()=>{},'@/lib/attempt-policy':policy,
   '@/lib/mongodb/counter':{getNextSequence:async()=>1},'@/lib/mongodb/models/PracticeSession':{findOne:async()=>completed},'@/lib/mongodb/models/MCQAttempt':{},'@/lib/mongodb/models/LearningStreak':{},'@/lib/mongodb/models':{},'@/lib/services/xpService':{}
 });
 const again=await completion.PATCH(request({session_id:7,is_completed:true}));assert.equal(again.status,200);assert.equal((await again.json()).session.is_completed,true);
 console.log('PASS: repeat completion returns the existing result without writing XP or answers');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
