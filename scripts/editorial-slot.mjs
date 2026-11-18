import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const timeZone = 'Europe/Kaliningrad';
const dateFormat = new Intl.DateTimeFormat('sv-SE', { timeZone, dateStyle: 'short' });
const unfinished = new Set(['preparing', 'pushed']);
const terminal = new Set(['published', 'deferred']);

export function selectEditorialSlot(topics, releases, now = new Date()) {
  const date = dateFormat.format(now);
  const byDate = new Map(topics.map(topic => [topic.date, topic]));
  if (byDate.size !== topics.length || new Set(topics.map(topic => topic.id)).size !== topics.length) {
    throw new Error('The editorial calendar must have unique dates and topic IDs');
  }

  const entries = new Map();
  for (const entry of releases) {
    const topic = byDate.get(entry.date);
    if (!topic || topic.id !== entry.topicId) throw new Error('Ledger entry does not match the calendar: ' + entry.date);
    if (entries.has(entry.date)) throw new Error('Duplicate release in the ledger: ' + entry.date);
    if (!unfinished.has(entry.status) && !terminal.has(entry.status)) throw new Error('Unknown release status: ' + entry.status);
    entries.set(entry.date, entry);
  }

  const earlier = releases
    .filter(entry => entry.date < date && unfinished.has(entry.status))
    .sort((left, right) => left.date.localeCompare(right.date))[0];
  if (earlier) return { action: 'reconcile', date, topic: byDate.get(earlier.date), entry: earlier };

  const topic = byDate.get(date);
  const entry = entries.get(date);
  if (!topic) return { action: 'no-slot', date };
  if (!entry) return { action: 'prepare', date, topic };
  return { action: terminal.has(entry.status) ? 'done' : 'resume', date, topic, entry };
}

async function main(args) {
  const dryRun = args.length === 2 && args[0] === '--at';
  if (args.length && (!dryRun || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(args[1]))) {
    throw new Error('Usage: node scripts/editorial-slot.mjs [--at 2026-11-19T08:00:00Z]');
  }
  const now = dryRun ? new Date(args[1]) : new Date();
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid date');

  const root = new URL('../research/content-month-20261119/', import.meta.url);
  const read = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));
  const plan = await read('topic-map.json');
  const ledger = await read('daily-publications.json');
  if (plan.timezone !== timeZone || ledger.timezone !== timeZone) throw new Error('Unexpected editorial time zone');
  console.log(JSON.stringify({ dryRun, timeZone, ...selectEditorialSlot(plan.topics, ledger.releases, now) }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
