import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GitHubPlanLibrary, PLAN_REPOSITORY, PlanAccessError, PlanConflictError, encodeUtf8Base64, decodeUtf8Base64 } from '../src/utils/githubPlans';
import { example } from './fixture';
const sha = (n: number) => n.toString(16).padStart(40,'0');
function fakeGitHub() {
  let head=sha(1), tree=sha(2), count=10;
  let index:any={version:1,plans:[]};
  const blobs=new Map<string,string>(), trees=new Map<string,any[]>(), commits=new Map<string,any>();
  const calls:{path:string;method:string;body:any}[]=[];
  const request:typeof fetch=async(url,options={})=>{
    assert.ok(String(url).startsWith(`https://api.github.com/repos/${PLAN_REPOSITORY}`));
    assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');
    const path=String(url).split(PLAN_REPOSITORY)[1], method=options.method||'GET';
    const body=options.body?JSON.parse(String(options.body)):undefined;
    calls.push({path,method,body});
    let result:any;
    if(path==='')result={private:true,full_name:PLAN_REPOSITORY,default_branch:'main',permissions:{push:true}};
    else if(path==='/git/ref/heads/main')result={object:{sha:head}};
    else if(path.startsWith('/git/commits/')&&method==='GET')result={tree:{sha:tree}};
    else if(path.startsWith('/contents/'))return new Response(JSON.stringify(index));
    else if(path==='/git/blobs'){const id=sha(++count);blobs.set(id,body.content);result={sha:id};}
    else if(path.startsWith('/git/blobs/'))result={content:blobs.get(path.split('/').at(-1)!)};
    else if(path==='/git/trees'){const id=sha(++count);trees.set(id,body.tree);result={sha:id};}
    else if(path==='/git/commits'){const id=sha(++count);commits.set(id,body);result={sha:id};}
    else if(path==='/git/refs/heads/main'){
      assert.equal(body.force,false);const commit=commits.get(body.sha);assert.equal(commit.parents[0],head);
      const elements=trees.get(commit.tree)!;
      index=JSON.parse(elements.find(e=>e.path==='library/index.json').content);
      head=body.sha;tree=commit.tree;result={object:{sha:head}};
    }else throw new Error(`Unexpected request ${path}`);
    return new Response(JSON.stringify(result),{status:200});
  };
  return {request,calls,get index(){return index;}};
}
test('UTF-8 plans preserve Spanish and symbols',()=>{const text='Cámaras, ñ, revisión — 🔒';assert.equal(decodeUtf8Base64(encodeUtf8Base64(text)),text);});
test('public repositories are rejected before reading files',async()=>{
  const library=new GitHubPlanLibrary('test',async()=>new Response(JSON.stringify({private:false,full_name:PLAN_REPOSITORY})));
  await assert.rejects(()=>library.list(),PlanAccessError);await assert.rejects(()=>library.connect(),PlanAccessError);
});
test('expired access clears the credential and stops further requests',async()=>{
  let calls=0;const library=new GitHubPlanLibrary('test',async()=>{calls++;return new Response('',{status:401});});
  await assert.rejects(()=>library.connect(),PlanAccessError);await assert.rejects(()=>library.connect(),PlanAccessError);assert.equal(calls,1);
});
test('save and open preserve the full editable plan; catalog and file commit together',async()=>{
  const mock=fakeGitHub(),library=new GitHubPlanLibrary('test',mock.request);
  const saved=await library.save(example,' Cámaras Ñuñoa ',' Seguridad ');
  assert.equal(saved.name,'Cámaras Ñuñoa');assert.equal(saved.folder,'Seguridad');
  const write=mock.calls.find(c=>c.path==='/git/trees')!;assert.equal(write.body.tree.length,2);
  assert.equal(write.body.tree[1].path,`library/plans/${saved.id}.cadmap`);
  const loaded=await library.open(saved);assert.deepEqual(loaded.document,example);
  assert.equal((await library.list())[0].revision,saved.revision);
});
test('stale saves and archives do not overwrite a more recent version',async()=>{
  const mock=fakeGitHub(),library=new GitHubPlanLibrary('test',mock.request);
  const first=await library.save(example,'Plano','General');
  const updated=await library.save(example,'Plano revisado','General',first);
  assert.notEqual(updated.revision,first.revision);
  const writes=mock.calls.filter(c=>c.method==='POST').length;
  await assert.rejects(()=>library.save(example,'Antiguo','General',first),PlanConflictError);
  await assert.rejects(()=>library.archive(first,true),PlanConflictError);
  assert.equal(mock.calls.filter(c=>c.method==='POST').length,writes);
});
test('archive and restore retain files and avoid permanent deletion',async()=>{
  const mock=fakeGitHub(),library=new GitHubPlanLibrary('test',mock.request);
  const first=await library.save(example,'Plano','General');
  const archived=await library.archive(first,true);assert.equal(archived.archived,true);assert.equal(archived.sha,first.sha);
  const restored=await library.archive(archived,false);assert.equal(restored.archived,false);
  assert.deepEqual((await library.open(restored)).document,example);
  assert.ok(!mock.calls.some(c=>c.method==='DELETE'));
});
test('an oversized plan is rejected before any network request',async()=>{
  const mock=fakeGitHub(),library=new GitHubPlanLibrary('test',mock.request);
  await assert.rejects(()=>library.save({...example,rawImageSrc:'data:image/png;base64,'+'A'.repeat(21*1024*1024)},'Grande','General'),/20 MB/);
  assert.equal(mock.calls.length,0);
});
test('a simultaneous branch update becomes a recoverable conflict',async()=>{
  const mock=fakeGitHub();const request:typeof fetch=(url,options)=>String(url).endsWith('/git/refs/heads/main')?Promise.resolve(new Response('',{status:422})):mock.request(url,options);
  await assert.rejects(()=>new GitHubPlanLibrary('test',request).save(example,'Plano','General'),PlanConflictError);
  assert.equal(mock.index.plans.length,0);
});

test('browser fetch is invoked without a library instance as its receiver',async()=>{
  let called=false;
  const browserFetch:typeof fetch=async function(this:unknown){
    assert.equal(this,undefined,'Native browser fetch rejects a custom instance receiver');
    called=true;
    return new Response(JSON.stringify({private:true,full_name:PLAN_REPOSITORY,default_branch:'main',permissions:{push:true}}));
  };
  await new GitHubPlanLibrary('test',browserFetch).connect();
  assert.equal(called,true);
});
