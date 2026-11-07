import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const dir = 'qa/pages-recovery-20261107';
const baseline = JSON.parse(await fs.readFile('qa/sprint-20261107f/live-readback.json', 'utf8'));
const [runId] = process.argv.slice(2);
const report = { checkedAt: new Date().toISOString(), mode: runId ? 'after-drill' : 'before-drill', pages: [], assets: [], links: [] };
const get = async path => {
  const response = await fetch(new URL(path, baseline.base), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, path);
  return Buffer.from(await response.arrayBuffer());
};
if (runId) {
  assert.match(runId, /^\d+$/);
  const run = JSON.parse(execFileSync('gh', ['run', 'view', runId, '--json', 'databaseId,workflowName,headSha,status,conclusion,url,jobs'], { encoding: 'utf8' }));
  assert.equal(run.workflowName, 'Recover Pages');
  assert.equal(run.status, 'completed');
  assert.equal(run.conclusion, 'success');
  for (const name of ['Validate tested source and unchanged website', 'Publish tested artifact with twenty-minute polling', 'Verify published Pages and Worker compatibility', 'Notify IndexNow after publication']) {
    assert(run.jobs.some(job => job.steps.some(step => step.name === name && step.conclusion === 'success')), name);
  }
  const evidence = JSON.parse(await fs.readFile(`${dir}/evidence/.pages-recovery.json`, 'utf8'));
  assert.equal(evidence.mode, 'drill');
  assert.equal(evidence.sourceConclusion, 'success');
  assert.equal(evidence.sourceRunId, 42341955531);
  assert.equal(evidence.testedSourceSha, baseline.expectedSha);
  assert.equal(evidence.artifactId, 13562727503);
  assert.equal(evidence.artifactDigest, 'sha256:d38e6535041167050416b87d6afc5123a12a209d6ae5fa5c4058b8fa549a4f2b');
  assert.equal(evidence.recoveryRunId, Number(runId));
  assert.equal(evidence.deploymentWorkflowSha, run.headSha);
  assert.equal(evidence.statuses.at(-1).status, 'succeed');
  assert(evidence.completedAt);
  report.recovery = { ...run, evidence };
}
for (const kind of ['pages', 'assets']) {
  for (const expected of baseline[kind]) {
    const bytes = await get(expected.path);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha256, expected.sha256, expected.path);
    report[kind].push({ path: expected.path, bytes: bytes.length, sha256 });
  }
}
for (const link of baseline.links) { await get(link.path); report.links.push({ path: link.path, status: 200 }); }
report.release = JSON.parse((await get('/release.json')).toString());
assert.deepEqual(report.release, baseline.release);
const blog = (await get('/blog/')).toString();
report.journalArticles = new Set([...blog.matchAll(/href="(\/journal\/[^"?#]+\/)"/g)].map(match => match[1])).size;
assert.equal(report.journalArticles, 82);
report.sitemapUrls = [...(await get('/sitemap.xml')).toString().matchAll(/<loc>/g)].length;
assert.equal(report.sitemapUrls, 277);
await fs.writeFile(`${dir}/${report.mode}.json`, JSON.stringify(report, null, 2) + '\n');
console.log(`${report.mode} PASS: ${report.pages.length} HTML / ${report.assets.length} assets SHA256; ${report.links.length} links; blog82/sitemap277/release unchanged.`);
