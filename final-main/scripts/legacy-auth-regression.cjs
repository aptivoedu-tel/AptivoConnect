// Tests the legacy admin auth surface with a mocked shared Mongo connection.
// No real environment values or database records are read.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,mocks={}){
 const module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const localRequire=id=>Object.hasOwn(mocks,id)?mocks[id]:require(id);
 new Function('require','module','exports',source)(localRequire,module,module.exports);return module.exports;
}
async function signed(jose,payload,secret,alg='HS256'){
 return new jose.SignJWT(payload).setProtectedHeader({alg}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(secret));
}
async function main(){
 const jose=await import('jose');process.env.JWT_SECRET='isolated-auth-test-key';process.env.ADMIN_EMAIL='legacy@example.test';process.env.ADMIN_PASSWORD='legacy-plaintext';
 let admin={email:'admin@example.test',passwordHash:'mock-hash'},dbError=null,cookieToken=null;const lookups=[],connects=[];
 const auth=load('lib/auth.ts',{
  jose, 'bcryptjs':{compare:async(password,hash)=>password==='hashed-password'&&hash==='mock-hash'},
  'next/headers':{cookies:async()=>({get:name=>{assert.equal(name,'aptivo-admin-session');return cookieToken?{value:cookieToken}:undefined;}})},
  '@/lib/mongodb/connection':async()=>{connects.push('connect');if(dbError)throw dbError;},
  '@/models/Admin':{Admin:{findOne:async filter=>{lookups.push(filter);if(dbError)throw dbError;return admin?.email===filter.email?admin:null;}}}
 });

 assert.equal(await auth.validateCredentials(' ADMIN@example.test ','hashed-password'),true);
 assert.deepEqual(lookups.at(-1),{email:'admin@example.test'});
 assert.equal(await auth.validateCredentials('admin@example.test','wrong-password'),false);
 admin=null;assert.equal(await auth.validateCredentials('legacy@example.test','legacy-plaintext'),false,'environment plaintext must never authenticate');
 admin={email:'admin@example.test',passwordHash:'mock-hash'};

 const token=await auth.createSession(' ADMIN@example.test ');
 assert.deepEqual(await auth.verifySession(token),{email:'admin@example.test',role:'admin'});
 cookieToken=token;assert.deepEqual(await auth.getSessionFromCookies(),{email:'admin@example.test',role:'admin'});
 const before=lookups.length;
 for(const payload of [{email:'admin@example.test',role:'super_admin'},{email:7,role:'admin'},{role:'admin'},{email:'',role:'admin'}]){
  assert.equal(await auth.verifySession(await signed(jose,payload,'isolated-auth-test-key')),null);
 }
 assert.equal(lookups.length,before,'invalid claims must be rejected before the database lookup');
 assert.equal(await auth.verifySession(await signed(jose,{email:'admin@example.test',role:'admin'},'wrong-test-key')),null);
 assert.equal(await auth.verifySession(await signed(jose,{email:'admin@example.test',role:'admin'},'isolated-auth-test-key','HS384')),null,'only HS256 is accepted');

 admin=null;assert.equal(await auth.verifySession(token),null,'a deleted Admin row invalidates an otherwise valid token');
 admin={email:'admin@example.test',passwordHash:'mock-hash'};
 dbError=new Error('mock database unavailable');
 assert.equal(await auth.validateCredentials('admin@example.test','legacy-plaintext'),false,'database errors never fall back to environment credentials');
 assert.equal(await auth.verifySession(token),null,'database errors fail closed for sessions');
 dbError=null;

 delete process.env.JWT_SECRET;
 assert.equal(await auth.verifySession(token),null,'missing signing secret rejects existing tokens');
 await assert.rejects(()=>auth.createSession('admin@example.test'),/JWT_SECRET is not configured/);

 const ambassador=load('lib/ambassador-auth.ts',{'./auth':auth});
 for(const name of ['COOKIE_NAME','createSession','verifySession','validateCredentials','getSessionFromCookies','getSessionCookieConfig','getLogoutCookieConfig']) assert.equal(ambassador[name],auth[name]);
 assert.equal(auth.COOKIE_NAME,'aptivo-admin-session');
 assert.equal(auth.getLogoutCookieConfig().maxAge,0);
 assert.equal(auth.getSessionCookieConfig('x').maxAge,60*60*24);
 assert.ok(connects.length>0);
 console.log('PASS: admin auth requires the configured secret and current hashed Admin record; legacy helper shares the same cookie/session implementation');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
