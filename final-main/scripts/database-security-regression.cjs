// Offline regression checks for Mongo connection policy, fresh web sessions,
// ambassador isolation, and institution API authorization.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,mocks={}){
 const module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const localRequire=id=>Object.hasOwn(mocks,id)?mocks[id]:require(id);
 new Function('require','module','exports',source)(localRequire,module,module.exports);
 return module.exports;
}
function dbDns(){const calls=[];return{calls,promises:{setServers:servers=>{calls.push([...servers]);}},setServers:()=>{throw Error('global dns.setServers must not be used');},setDefaultResultOrder:()=>{}};}
function connectionModule(dns,mongoose){delete global.mongoose;return load('lib/mongodb/connection.ts',{dns,mongoose});}
function query(value,selected){return{select(fields){if(selected)selected.push(fields);return this;},sort(){return this;},lean:async()=>value,then(resolve,reject){return Promise.resolve(value).then(resolve,reject);}};}
async function main(){
 process.env.MONGODB_URI='mongodb://mock.invalid/test';
 delete process.env.MONGODB_DNS_SERVERS;

 // Default resolver stays untouched; simultaneous calls share one connect, then cache it.
 let resolveConnect,connectCount=0;const conn={id:'mock-connection'};const dnsDefault=dbDns();const mongooseDefault={connection:{readyState:0},connect:()=>{connectCount++;return new Promise(resolve=>{resolveConnect=()=>{mongooseDefault.connection.readyState=1;resolve(conn);};});}};
 const defaultConnect=connectionModule(dnsDefault,mongooseDefault).default;
 const first=defaultConnect(),second=defaultConnect();assert.equal(connectCount,1);assert.deepEqual(dnsDefault.calls,[]);
 resolveConnect();assert.deepEqual(await Promise.all([first,second]),[conn,conn]);
 assert.equal(await defaultConnect(),conn);assert.equal(connectCount,1);

 // Explicit DNS is opt-in, passed through as trimmed servers, and a failed attempt can retry.
 process.env.MONGODB_DNS_SERVERS=' 8.8.8.8, 1.1.1.1 ';
 const dnsConfigured=dbDns();let attempts=0;const mongooseRetry={connection:{readyState:0},connect:()=>{attempts++;if(attempts===1)return Promise.reject(new Error('mock SRV failure'));mongooseRetry.connection.readyState=1;return Promise.resolve(conn);}};
 const configuredConnect=connectionModule(dnsConfigured,mongooseRetry).default;
 await assert.rejects(configuredConnect,/mock SRV failure/);assert.equal(await configuredConnect(),conn);
 assert.deepEqual(dnsConfigured.calls,[['8.8.8.8','1.1.1.1'],['8.8.8.8','1.1.1.1']]);assert.equal(attempts,2);
 assert.equal(await configuredConnect(),conn);assert.equal(attempts,2);
 console.log('PASS: Mongo DNS is opt-in, concurrent connection calls share work, and failed connections retry');

 // Ambassador DB requires its own URI and never mutates global DNS or borrows the main URI.
 delete global.ambassadorMongooseConn;process.env.MONGODB_DNS_SERVERS='';
 process.env.MONGODB_URI='mongodb://main-db.mock.invalid/main';delete process.env.AMBASSADOR_MONGODB_URI;
 const ambassadorCalls=[],ambassadorDns=dbDns();const ambassadorModule=load('lib/ambassador-db.ts',{'dns':ambassadorDns,'mongoose':{createConnection:(uri,options)=>{ambassadorCalls.push({uri,options});return{readyState:1,asPromise:async()=>{}};}}});
 await assert.rejects(ambassadorModule.getAmbassadorConnection(),/AMBASSADOR_MONGODB_URI is not configured/);assert.equal(ambassadorCalls.length,0);
 process.env.AMBASSADOR_MONGODB_URI='mongodb://ambassador.mock.invalid/isolated';
 await ambassadorModule.getAmbassadorConnection();assert.equal(ambassadorCalls.length,1);assert.equal(ambassadorCalls[0].uri,process.env.AMBASSADOR_MONGODB_URI);assert.deepEqual(ambassadorDns.calls,[]);
 console.log('PASS: Ambassador storage requires its own URI and leaves process DNS configuration alone');

 // Web sessions are refreshed from the canonical User record; bearer auth stays delegated.
 let webSession=null,user=null,authorization=null,userLookups=0,mobileResolved=0;
 const publicUser=fresh=>({id:fresh.id,email:fresh.email,name:fresh.full_name,role:fresh.role,status:fresh.status,email_verified:fresh.email_verified,institution_id:fresh.institution_id});
 const portal=load('lib/portalSession.ts',{
  'next-auth':{getServerSession:async()=>webSession},'next/headers':{headers:async()=>({get:()=>authorization})},
  '@/lib/mobile-auth':{resolveMobileUser:async()=>{mobileResolved++;return{user:{id:'mobile-student',email:'mobile@example.test',full_name:'Mobile',role:'student',status:'active',email_verified:true},expires:'mobile-expiry'};},publicUser,isAuthRejection:error=>error?.message==='AUTH_REJECTED'},
  '@/lib/mongodb/connection':async()=>{},
  '@/lib/mongodb/models/User':{findOne:filter=>{userLookups++;assert.deepEqual(filter,{id:webSession.user.id});return query(user);}}
 });
 let freshSession=await portal.getPortalSession({});assert.equal(freshSession,null);assert.equal(userLookups,0);
 webSession={user:{id:'student-1',role:'super_admin',name:'Stale',institution_id:999},expires:'session-expiry'};
 user={id:'student-1',email:'s@example.test',full_name:'Fresh',role:'student',status:'active',email_verified:true,institution_id:3};
 freshSession=await portal.getPortalSession({});assert.equal(freshSession.user.role,'student');assert.equal(freshSession.user.name,'Fresh');assert.equal(freshSession.user.institution_id,3);assert.equal(freshSession.expires,'session-expiry');
 for(const blocked of [null,{...user,status:'pending'},{...user,status:'suspended'},{...user,status:'inactive'},{...user,status:'deleted'},{...user,email_verified:false}]){user=blocked;assert.equal(await portal.getPortalSession({}),null);}
 authorization='Bearer mocked-mobile-token';freshSession=await portal.getPortalSession({});assert.equal(freshSession.user.id,'mobile-student');assert.equal(freshSession.user.role,'student');assert.equal(freshSession.expires,'mobile-expiry');assert.equal(userLookups,7);assert.equal(mobileResolved,1);
 authorization=null;webSession={user:{id:'db-failure'}};const dbError=new Error('mock database unavailable');
 const failingPortal=load('lib/portalSession.ts',{'next-auth':{getServerSession:async()=>webSession},'next/headers':{headers:async()=>({get:()=>null})},'@/lib/mobile-auth':{resolveMobileUser:async()=>null,publicUser,isAuthRejection:()=>false},'@/lib/mongodb/connection':async()=>{throw dbError;},'@/lib/mongodb/models/User':{findOne:()=>query(user)}});
 await assert.rejects(failingPortal.getPortalSession({}),error=>error===dbError);
 console.log('PASS: web authorization uses current active/verified User state and propagates DB errors');

 // Institution CRUD boundary. Inputs and ownership are asserted through captured model calls.
 const {NextRequest}=require('next/server');let apiSession=null,portalCalls=0;const institutions=[{id:11,name:'Own'},{id:12,name:'Other'}],writes=[],filters=[],projections=[];
 const Institution={
  find:filter=>{filters.push(filter);return query(institutions.filter(row=>Object.entries(filter).every(([k,v])=>row[k]===v)),projections);},
  findOne:()=>query(institutions.at(-1)),
  create:async value=>{writes.push(['create',value]);return value;},
  findOneAndUpdate:async(filter,update)=>{writes.push(['update',filter,update]);return{...institutions.find(row=>row.id===filter.id),...update.$set};},
  deleteOne:async filter=>{writes.push(['delete',filter]);return{deletedCount:1};}
 };
 const institutionRoute=load('app/api/mongo/institutions/route.ts',{
  'next/server':require('next/server'),
  '@/lib/portalSession':{getPortalSession:async()=>{portalCalls++;return apiSession;}},'@/lib/authOptions':{authOptions:{}},
  '@/lib/mongodb/connection':async()=>{},'@/lib/mongodb/models/Institution':Institution,
  '@/lib/mongodb/counter':{Counter:{updateOne:async(...args)=>{writes.push(['counter-seed',...args]);}},getNextSequence:async()=>13}
 });
 const req=(method,url,body)=>new NextRequest(url,{method,headers:{'Content-Type':'application/json'},...(body===undefined||method==='GET'?{}:{body:JSON.stringify(body)})});
 const responseJson=async response=>({status:response.status,body:await response.json()});
 apiSession=null;
 for(const method of ['GET','POST','PATCH','DELETE']){const response=await institutionRoute[method](req(method,'http://localhost/api/mongo/institutions?id=11',{name:'x'}));assert.equal(response.status,401);}
 assert.equal(portalCalls,4,'every institution method must use fresh portal authorization');
 apiSession={user:{id:'admin-1',role:'institution_admin',institution_id:11}};
 let result=await responseJson(await institutionRoute.GET(req('GET','http://localhost/api/mongo/institutions')));
 assert.equal(result.status,200);assert.deepEqual(result.body.institutions.map(row=>row.id),[11]);
 assert.deepEqual(filters.at(-1),{id:11});
 for(const method of ['POST','PATCH','DELETE'])assert.equal((await institutionRoute[method](req(method,'http://localhost/api/mongo/institutions?id=11',{id:11,name:'Changed'}))).status,403);
 apiSession={user:{id:'student-1',role:'student',institution_id:11}};
 result=await responseJson(await institutionRoute.GET(req('GET','http://localhost/api/mongo/institutions')));
 assert.deepEqual(result.body.institutions.map(row=>row.id),[11]);assert.match(projections.at(-1),/id name institution_type logo_url is_active status/);assert.doesNotMatch(projections.at(-1),/contact_email|admin_email/);
 apiSession={user:{id:'root-1',role:'super_admin'}};
 result=await responseJson(await institutionRoute.POST(req('POST','http://localhost/api/mongo/institutions',{name:'Created',institution_type:'School'})));
 assert.equal(result.status,201);assert.equal(writes.findLast(write=>write[0]==='create')[1].name,'Created');assert.equal(writes.findLast(write=>write[0]==='create')[1].id,13);
 assert.equal((await institutionRoute.POST(req('POST','http://localhost/api/mongo/institutions',{name:'Unsafe',role:'super_admin'}))).status,400);
 assert.equal((await institutionRoute.PATCH(req('PATCH','http://localhost/api/mongo/institutions',{id:11,name:'Changed',is_active:false}))).status,200);
 assert.equal((await institutionRoute.PATCH(req('PATCH','http://localhost/api/mongo/institutions',{id:11,role:'student'}))).status,400);
 assert.equal((await institutionRoute.DELETE(req('DELETE','http://localhost/api/mongo/institutions?id=11'))).status,200);
 console.log('PASS: institution handlers require fresh sessions, scope GET, restrict writes, and reject non-allowlisted fields');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
