import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname,join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// Freeze expectations at the deployed commit while another editorial change is in progress.
const sha=process.argv[2];
assert.match(sha||'',/^[a-f0-9]{40}$/,'Pass the full deployed content SHA');
assert.equal(process.env.QA_BASE,'https://pirogorsk.ru');
const root=resolve('.'),output=resolve('qa/content-daily-20261107');
const snapshot=await mkdtemp(join(tmpdir(),'pirogorsk-daily-prod-'));
const files=['scripts/verify-content-month.mjs','src/data/monthly-articles.json','src/data/monthly-article-meta.json','src/data/monthly-article-figures.json','src/data/article-updates.json','research/content-month-202611/topic-map.json','research/backlog-intake-20261031/A6.txt'];
const provenance={commit:sha,checkedAt:new Date().toISOString(),files:[]};
try{
 for(const path of files){
  const bytes=execFileSync('git',['show',`${sha}:${path}`],{cwd:root,maxBuffer:16*1024*1024});
  const target=join(snapshot,path);await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
  provenance.files.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 await symlink(join(root,'node_modules'),join(snapshot,'node_modules'),'dir');
 await symlink(join(root,'site'),join(snapshot,'site'),'dir');
 await writeFile(join(output,'production-inputs.json'),JSON.stringify(provenance,null,2)+'\n');
 const result=spawnSync(process.execPath,['scripts/verify-content-month.mjs'],{cwd:snapshot,env:{...process.env,PIROGORSK_QA_OUTPUT:output},stdio:'inherit'});
 if(result.error)throw result.error;
 process.exitCode=result.status??1;
}finally{await rm(snapshot,{recursive:true,force:true});}
