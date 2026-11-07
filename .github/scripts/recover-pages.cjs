const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

const reportPath = '.pages-recovery.json';
const requiredChecks = [
  'Run npm run check', 'Run npm run build', 'Run npm test',
  'Run npm run test:worker', 'Run npm run test:browser',
  'Run node scripts/verify-seo.mjs', 'Run node scripts/verify-catalog-polish.mjs',
  'Check deployed Worker against Pages artifact', 'Run node scripts/indexnow.mjs manifest',
];
const deploymentStep = 'Run actions/deploy-pages@v5';

function validateSource(run, jobs, artifacts, comparison) {
  assert.equal(run.path, '.github/workflows/pages.yml');
  assert.equal(run.head_branch, 'main');
  assert.equal(run.status, 'completed');
  assert.equal(run.conclusion, 'failure');
  const job = jobs.find(item => item.name === 'deploy');
  assert(job, 'Source deployment job missing');
  const index = job.steps.findIndex(step => step.name === deploymentStep);
  assert(index >= 0 && job.steps[index].conclusion === 'failure', 'Source must have failed at Pages publication');
  for (const name of requiredChecks) {
    assert(job.steps.slice(0, index).some(step => step.name === name && step.conclusion === 'success'), `Source check did not pass: ${name}`);
  }
  const optionalSkips = ['Save processed Astro images', 'Save browser failure evidence'];
  for (const step of job.steps.slice(0, index)) {
    assert(step.conclusion === 'success' || (step.conclusion === 'skipped' && optionalSkips.includes(step.name)), `Source step did not pass: ${step.name}`);
  }
  assert(['ahead', 'identical'].includes(comparison.status), 'Recovery revision must contain the tested source');
  assert(comparison.files.length < 300, 'Compare response may be truncated');
  // A recovery revision may change publishing/evidence, never the tested website.
  for (const file of comparison.files) {
    for (const filename of [file.filename, file.previous_filename].filter(Boolean)) {
      assert(/^(?:\.github\/|qa\/|research\/|BACKLOG\.md$|BUILD-STATE\.md$)/.test(filename), `Website differs from tested artifact: ${filename}`);
    }
  }
  const matches = artifacts.filter(item => item.name === `github-pages-${run.id}-${run.run_attempt}`);
  assert.equal(matches.length, 1, 'Expected one Pages artifact for the tested attempt');
  const artifact = matches[0];
  assert.equal(artifact.expired, false, 'Source artifact expired');
  assert.equal(artifact.workflow_run?.id, run.id);
  assert.equal(artifact.workflow_run?.head_sha, run.head_sha);
  assert.match(artifact.digest, /^sha256:[a-f0-9]{64}$/);
  return artifact;
}

async function inspect({ github, core, context, sourceId }) {
  assert.match(sourceId ?? '', /^\d+$/);
  const repo = context.repo;
  const { data: run } = await github.rest.actions.getWorkflowRun({ ...repo, run_id: Number(sourceId) });
  assert.equal(run.repository?.full_name, `${repo.owner}/${repo.repo}`);
  const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRunAttempt, { ...repo, run_id: run.id, attempt_number: run.run_attempt, per_page: 100 });
  const artifacts = await github.paginate(github.rest.actions.listWorkflowRunArtifacts, { ...repo, run_id: run.id, per_page: 100 });
  const { data: comparison } = await github.rest.repos.compareCommitsWithBasehead({ ...repo, basehead: `${run.head_sha}...${context.sha}` });
  const artifact = validateSource(run, jobs, artifacts, comparison);
  const report = {
    sourceRunId: run.id, sourceAttempt: run.run_attempt, testedSourceSha: run.head_sha,
    artifactId: artifact.id, artifactName: artifact.name, artifactDigest: artifact.digest,
    deploymentWorkflowSha: context.sha, recoveryRunId: context.runId,
    startedAt: new Date().toISOString(), statuses: [],
  };
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  core.setOutput('artifact_id', String(artifact.id));
  core.info(`All source checks passed before Pages failed; reusing ${artifact.name} (${artifact.digest}).`);
  return report;
}

async function publish({ github, core, context, report, now = Date.now, wait = ms => new Promise(resolve => setTimeout(resolve, ms)), timeout = 1200000, save = async () => {} }) {
  const oidcToken = await core.getIDToken();
  core.setSecret(oidcToken);
  const repo = context.repo;
  const { data } = await github.request('POST /repos/{owner}/{repo}/pages/deployments', {
    ...repo, artifact_id: report.artifactId, pages_build_version: context.sha, oidc_token: oidcToken,
  });
  report.deploymentId = String(data.id || data.status_url?.split('/').pop() || context.sha);
  report.pageUrl = data.page_url;
  const endpoint = { ...repo, deploymentId: report.deploymentId };
  const deadline = now() + timeout;
  let errors = 0;
  await save(report);
  while (now() < deadline) {
    let status;
    try {
      const response = await github.request('GET /repos/{owner}/{repo}/pages/deployments/{deploymentId}', endpoint);
      status = response.data.status;
      errors = 0;
    } catch (error) {
      core.warning(`Pages status request failed (HTTP ${error.status ?? 'network'}).`);
      if (++errors >= 10) throw new Error('Pages status unavailable after 10 consecutive requests');
    }
    if (status && status !== report.statuses.at(-1)?.status) {
      report.statuses.push({ status, at: new Date(now()).toISOString() });
      core.info(`Pages: ${status}`);
      await save(report);
    }
    if (status === 'succeed') {
      report.completedAt = new Date(now()).toISOString();
      await save(report);
      core.setOutput('page_url', report.pageUrl);
      return report;
    }
    if (['deployment_failed', 'deployment_content_failed', 'deployment_cancelled', 'deployment_lost'].includes(status)) {
      throw new Error(`Pages publication failed: ${status}`);
    }
    await wait(Math.min(10000, deadline - now()));
  }
  await github.request('POST /repos/{owner}/{repo}/pages/deployments/{deploymentId}/cancel', endpoint);
  throw new Error(`Pages publication timed out after ${timeout / 60000} minutes; cancellation requested`);
}

async function deploy(args) {
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const save = value => fs.writeFile(reportPath, JSON.stringify(value, null, 2) + '\n');
  try { return await publish({ ...args, report, save }); }
  catch (error) { report.error = error.message; await save(report); throw error; }
}

module.exports = { validateSource, inspect, publish, deploy, requiredChecks, deploymentStep };
