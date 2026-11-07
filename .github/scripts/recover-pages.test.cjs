const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSource, publish, requiredChecks, deploymentStep } = require('./recover-pages.cjs');

function source() {
  const run = { id: 123, run_attempt: 1, head_sha: 'a'.repeat(40), head_branch: 'main', path: '.github/workflows/pages.yml', status: 'completed', conclusion: 'failure' };
  const steps = requiredChecks.map(name => ({ name, conclusion: 'success' }));
  steps.push({ name: deploymentStep, conclusion: 'failure' });
  return {
    run, jobs: [{ name: 'deploy', steps }],
    artifacts: [{ id: 456, name: 'github-pages-123-1', expired: false, digest: 'sha256:' + 'b'.repeat(64), workflow_run: { id: 123, head_sha: run.head_sha } }],
    comparison: { status: 'ahead', files: [{ filename: '.github/workflows/recover-pages.yml' }] },
  };
}
const validate = input => validateSource(input.run, input.jobs, input.artifacts, input.comparison);

test('accepts the exact artifact after all source checks passed', () => {
  assert.equal(validate(source()).id, 456);
});

test('rejects failed tests, changed website, missing checks and expired artifacts', () => {
  const failed = source(); failed.jobs[0].steps[0].conclusion = 'failure';
  assert.throws(() => validate(failed), /Source check did not pass/);
  const missing = source(); missing.jobs[0].steps.shift();
  assert.throws(() => validate(missing), /Source check did not pass/);
  const changed = source(); changed.comparison.files.push({ filename: 'src/data/catalog.ts' });
  assert.throws(() => validate(changed), /Website differs/);
  const expired = source(); expired.artifacts[0].expired = true;
  assert.throws(() => validate(expired), /Source artifact expired/);
  const wrong = source(); wrong.artifacts[0].workflow_run.head_sha = 'c'.repeat(40);
  assert.throws(() => validate(wrong));
});

function publisher(statusAt) {
  let time = 0;
  const calls = [], masked = [], outputs = {};
  return {
    calls, masked, outputs, elapsed: () => time,
    args: {
      github: { request: async (route, input) => {
        calls.push({ route, input });
        if (route.endsWith('/cancel')) return { data: {} };
        if (route.startsWith('POST ')) return { data: { id: 'deployment-1', page_url: 'https://example.test/' } };
        return { data: { status: statusAt(time) } };
      } },
      core: { getIDToken: async () => 'test-oidc', setSecret: token => masked.push(token), info() {}, warning() {}, setOutput: (key, value) => { outputs[key] = value; } },
      context: { repo: { owner: 'owner', repo: 'repo' }, sha: 'd'.repeat(40) },
      report: { artifactId: 456, statuses: [] },
      now: () => time, wait: async ms => { time += ms; },
    },
  };
}

test('publishes after more than ten minutes without the deploy-pages timeout cap', async () => {
  const fixture = publisher(time => time >= 650000 ? 'succeed' : 'syncing_files');
  const report = await publish(fixture.args);
  assert.equal(fixture.elapsed(), 650000);
  assert.equal(report.statuses.at(-1).status, 'succeed');
  assert.deepEqual(fixture.masked, ['test-oidc']);
  assert.equal(fixture.calls[0].input.artifact_id, 456);
  assert.equal(fixture.calls[0].input.pages_build_version, fixture.args.context.sha);
  assert.equal(fixture.outputs.page_url, 'https://example.test/');
  assert(!fixture.calls.some(call => call.route.endsWith('/cancel')));
});

test('terminal publication failure never reports success', async () => {
  const fixture = publisher(() => 'deployment_content_failed');
  await assert.rejects(publish(fixture.args), /deployment_content_failed/);
  assert.equal(fixture.outputs.page_url, undefined);
});

test('twenty-minute deadline cancels deployment and reports timeout', async () => {
  const fixture = publisher(() => 'syncing_files');
  await assert.rejects(publish(fixture.args), /timed out after 20 minutes/);
  assert.equal(fixture.elapsed(), 1200000);
  assert(fixture.calls.at(-1).route.endsWith('/cancel'));
  assert.equal(fixture.outputs.page_url, undefined);
});
