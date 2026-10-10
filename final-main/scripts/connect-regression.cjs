// Runs the actual /connect server route with an in-memory User boundary.
// The shared package location is checked without importing or contacting services.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),workspaceRoot=path.resolve(root,'..');
function load(file,mocks={}){
 const module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const localRequire=id=>Object.hasOwn(mocks,id)?mocks[id]:require(id);
 new Function('require','module','exports',source)(localRequire,module,module.exports);return module.exports;
}
async function main(){
 const routeFile='app/connect/page.tsx';
 const routeSource=fs.readFileSync(path.join(root,routeFile),'utf8');
 assert.match(routeSource,/from\s+['"]@aptivo\/connect['"]/,'route must import the shared package');
 assert.match(routeSource,/from\s+['"]@\/components\/connect\/ConnectShell['"]/,'route must retain the portal shell');

 const workspace=JSON.parse(fs.readFileSync(path.join(workspaceRoot,'package.json'),'utf8'));
 assert.ok(workspace.workspaces.includes('final-main')&&workspace.workspaces.includes('Connect'),'both source folders must remain workspace packages');
 const mainPackage=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 assert.equal(mainPackage.dependencies['@aptivo/connect'],'file:../Connect');
 const connectRoot=path.join(workspaceRoot,'Connect');
 const connectPackage=JSON.parse(fs.readFileSync(path.join(connectRoot,'package.json'),'utf8'));
 assert.equal(connectPackage.name,'@aptivo/connect');assert.equal(connectPackage.version,'0.1.0');
 assert.equal(connectPackage.exports['.'],'./src/ConnectPage.tsx');
 const resolved=fs.realpathSync(require.resolve('@aptivo/connect',{paths:[root]}));
 assert.ok(resolved.startsWith(fs.realpathSync(path.join(connectRoot,'src'))+path.sep),'package import must resolve to live sibling source');
 const portalReact=fs.realpathSync(require.resolve('react/package.json',{paths:[root]}));
 const connectReact=fs.realpathSync(require.resolve('react/package.json',{paths:[connectRoot]}));
 assert.equal(connectReact,portalReact,'Connect must resolve the portal React installation through its peer dependency');
 const css=fs.readFileSync(path.join(root,'app/globals.css'),'utf8');
 assert.match(css,/@source[^;]*Connect/i,'Tailwind must scan the external Connect source');

 let session=null,document=null,findCalls=0,connectCalls=0;
 const redirect=destination=>{throw Object.assign(new Error(`redirect:${destination}`),{destination});};
 const exports=load(routeFile,{
  'next/navigation':{redirect},
  'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'},
  '@aptivo/connect':function ConnectPage(){return null;},
  '@/components/connect/ConnectShell':function ConnectShell(){return null;},
  '@/lib/portalSession':{getPortalSession:async()=>session},
  '@/lib/authOptions':{authOptions:{}},
  '@/lib/mongodb/connection':async()=>{connectCalls++;},
  '@/lib/mongodb/models/User':{findOne:filter=>{findCalls++;assert.deepEqual(filter,{id:session.user.id});return{lean:async()=>document};}}
 });
 const render=exports.default;
 async function redirected(destination){await assert.rejects(()=>render(),error=>error.destination===destination);}
 session=null;findCalls=connectCalls=0;await redirected('/login');assert.equal(findCalls,0);assert.equal(connectCalls,0);
 for(const id of [undefined,null,'',4,{}]){session={user:{id}};findCalls=connectCalls=0;await redirected('/login');assert.equal(findCalls,0);assert.equal(connectCalls,0);}

 session={user:{id:'user-1',role:'student'}};
 for(const bad of [null,{role:'student',status:'pending',email_verified:true},{role:'student',status:'suspended',email_verified:true},{role:'student',status:'deleted',email_verified:true},{role:'student',status:'inactive',email_verified:true},{role:'student',status:'active',email_verified:false},{role:'student',status:'unknown',email_verified:true}]){
  document=bad;await redirected('/login?error=ACCOUNT_UNAVAILABLE');
 }
 document=null;await redirected('/login?error=ACCOUNT_UNAVAILABLE');

 document={id:'user-1',role:'student',status:'active',email_verified:true,full_name:'Current Name',avatar_url:'/avatar.png'};
 session={user:{id:'user-1',role:'super_admin',name:'Old Session Name'}};
 const page=await render();assert.equal(page.type.name,'ConnectShell');assert.equal(page.props.userName,'Current Name');assert.equal(page.props.userAvatar,'/avatar.png');
 assert.equal(page.props.children.type.name,'ConnectPage','student page must render the package component inside the shell');
 for(const role of ['super_admin','institution_admin']){
  document={...document,role};session={user:{id:'user-1',role:'student'}};
  await redirected(role==='super_admin'?'/admin/dashboard':'/institution-admin');
 }
 document={...document,role:'unknown'};await redirected('/login?error=ACCOUNT_UNAVAILABLE');

 session={user:{id:'db-error'}};
 const dbError=new Error('mock database failure');
 // Verify that database failures do not render the app; route errors propagate to Next's error boundary.
 const broken=load(routeFile,{
  'next/navigation':{redirect},'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'},
  '@aptivo/connect':function ConnectPage(){},'@/components/connect/ConnectShell':function ConnectShell(){},
  '@/lib/portalSession':{getPortalSession:async()=>session},'@/lib/authOptions':{authOptions:{}},
  '@/lib/mongodb/connection':async()=>{throw dbError;},'@/lib/mongodb/models/User':{findOne:()=>({lean:async()=>document})}
 });
 await assert.rejects(()=>broken.default(),error=>error===dbError);
 console.log('PASS: Connect source ownership, workspace package resolution, external CSS scan, and server route access guard');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
