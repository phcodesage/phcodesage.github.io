import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import worker, { validateEvent, localDay, periodFor, recordEvent, readStats } from '../worker.mjs';
import { TestDatabase } from './database.mjs';

const origin = 'https://phcodesage.github.io';
const now = Date.parse('2026-10-12T00:00:00Z');
const event = (overrides = {}) => ({ id: randomUUID(), kind: 'page_view', path: '/', sessionId: 'test-session-1234567890', device: 'desktop', referrer: 'google.com', ...overrides });
function setup() { return { DB: new TestDatabase(), PORTFOLIO_ORIGIN: origin, SESSION_SALT: 'local-test-salt', ADMIN_TOKEN: 'local-test-password-123456789' }; }
function request(payload, options = {}) {
  const req = new Request('https://analytics.example/api/events', {
    method: 'POST', headers: { Origin: origin, 'User-Agent': 'Mozilla/5.0 Chrome/130', ...options.headers }, body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
  Object.defineProperty(req, 'cf', { value: { country: options.country || 'PH' } });
  return req;
}

test('accepts only portfolio paths, projects and targets; discards query strings and arbitrary data', () => {
  assert.equal(validateEvent(event({ path: '/?email=private@example.com' })), null);
  assert.equal(validateEvent(event({ kind: 'project_click', project: 'invented', target: 'source' })), null);
  assert.equal(validateEvent(event({ kind: 'contact_click', target: 'private@example.com' })), null);
  assert.equal(validateEvent(event({ sessionId: 'bad' })), null);
  const clean = validateEvent(event({ path: '/case-studies/clara-health.html', referrer: 'https://google.com/search?private=1', email: 'private@example.com', country: 'US' }));
  assert.equal(clean.project, 'clara-health'); assert.equal(clean.referrer, 'direct');
  assert.ok(!Object.hasOwn(clean, 'email')); assert.ok(!Object.hasOwn(clean, 'country'));
});

test('uses edge country, daily hashed sessions, and server receipt time', async () => {
  const env = setup();
  try {
    const payload = event({ country: 'US', timestamp: 0, ip: '1.2.3.4' });
    assert.equal((await recordEvent(request(payload), env, now)).status, 202);
    const row = await env.DB.prepare('SELECT * FROM portfolio_events').first();
    assert.equal(row.country, 'PH'); assert.equal(row.created_at, now); assert.equal(row.day, '2026-10-12');
    assert.match(row.session_key, /^[a-f0-9]{64}$/); assert.notEqual(row.session_key, payload.sessionId);
    assert.ok(!Object.hasOwn(row, 'ip')); assert.ok(!Object.hasOwn(row, 'sessionId'));
    await recordEvent(request(event()), env, now + 86400000);
    const rows = (await env.DB.prepare('SELECT session_key FROM portfolio_events ORDER BY created_at').all()).results;
    assert.notEqual(rows[0].session_key, rows[1].session_key);
  } finally { env.DB.close(); }
});

test('event retries do not inflate detailed analytics or the preserved page-view archive', async () => {
  const env = setup();
  try {
    await env.DB.prepare('INSERT INTO page_views (path,session_id,viewed_at) VALUES (?,?,?)').bind('/', 'legacy-session', new Date(now - 86400000).toISOString()).run();
    const payload = event();
    await recordEvent(request(payload), env, now); await recordEvent(request(payload), env, now + 10);
    assert.equal((await env.DB.prepare('SELECT COUNT(*) AS total FROM portfolio_events').first()).total, 1);
    assert.equal((await env.DB.prepare('SELECT COUNT(*) AS total FROM page_views').first()).total, 2);
    const click = event({ kind: 'project_click', project: 'clara-health', target: 'live-demo' });
    await recordEvent(request(click), env, now); await recordEvent(request(click), env, now);
    assert.equal((await readStats(env, 'today', now)).metrics.projectClicks, 1);
    assert.equal((await env.DB.prepare('SELECT COUNT(*) AS total FROM page_views').first()).total, 2);
  } finally { env.DB.close(); }
});

test('calendar periods and midnight boundaries use Manila time', () => {
  assert.equal(localDay(Date.parse('2026-10-11T15:59:59Z')), '2026-10-11');
  assert.equal(localDay(Date.parse('2026-10-11T16:00:00Z')), '2026-10-12');
  assert.equal(periodFor('today', now).start, Date.parse('2026-10-11T16:00:00Z'));
  assert.equal(periodFor('7d', now).start, Date.parse('2026-10-05T16:00:00Z'));
  assert.equal(periodFor('nonsense', now), null);
});

test('aggregates countries, project interest and completed inquiries without mixing up clicks and views', async () => {
  const env = setup();
  try {
    await recordEvent(request(event()), env, now);
    await recordEvent(request(event({ path: '/case-studies/clara-health.html' })), env, now);
    await recordEvent(request(event({ kind: 'project_click', project: 'clara-health', target: 'case-study', source: 'card' })), env, now);
    await recordEvent(request(event({ kind: 'project_click', path: '/case-studies/clara-health.html', project: 'clara-health', target: 'live-demo' })), env, now);
    await recordEvent(request(event({ sessionId: 'another-session-123456789', device: 'mobile' }), { country: 'US' }), env, now);
    await recordEvent(request(event({ kind: 'contact_click', target: 'form_attempt' })), env, now);
    await recordEvent(request(event({ kind: 'contact_click', target: 'form_sent' })), env, now);
    await recordEvent(request(event()), env, now - 20 * 86400000);
    const data = await readStats(env, '7d', now);
    assert.deepEqual(data.metrics, { sessions: 2, views: 3, projectClicks: 2, contactActions: 1, inquiries: 1 });
    assert.equal(data.series.length, 7); assert.equal(data.series[0].views, 0); assert.equal(data.series[6].views, 3);
    assert.equal(data.countries[0].country, 'PH'); assert.equal(data.countries[0].views, 2);
    assert.equal(data.projects[0].name, 'Clara Health'); assert.equal(data.projects[0].clicks, 2); assert.equal(data.projects[0].views, 1);
    assert.equal(data.projectTargets.length, 2); assert.equal(data.devices.length, 2);
  } finally { env.DB.close(); }
});

test('private stats require the password and public summary reveals counts only', async () => {
  const env = setup();
  try {
    const url = 'https://analytics.example/api/stats';
    assert.equal((await worker.fetch(new Request(url), env)).status, 401);
    assert.equal((await worker.fetch(new Request(url, { headers: { Authorization: 'Bearer wrong' } }), env)).status, 401);
    const good = await worker.fetch(new Request(url, { headers: { Origin: origin, Authorization: `Bearer ${env.ADMIN_TOKEN}` } }), env);
    assert.equal(good.status, 200); assert.equal(good.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(good.headers.get('Cache-Control'), 'no-store');
    assert.equal((await worker.fetch(new Request(url + '?range=bad', { headers: { Authorization: `Bearer ${env.ADMIN_TOKEN}` } }), env)).status, 400);
    const summary = await worker.fetch(new Request('https://analytics.example/api/summary'), env);
    assert.deepEqual(await summary.json(), { window: '30 days', views: 0 });
  } finally { env.DB.close(); }
});

test('public counter retains the legacy archive and its original time window', async () => {
  const env = setup();
  try {
    const cutoffDay = new Date(Date.now() - 30 * 86400000); cutoffDay.setUTCHours(0, 0, 0, 0);
    for (const timestamp of [Date.now(), cutoffDay.getTime(), Date.now() - 31 * 86400000]) {
      await env.DB.prepare('INSERT INTO page_views (path,session_id,viewed_at) VALUES (?,?,?)').bind('/', 'legacy-session', new Date(timestamp).toISOString()).run();
    }
    const summary = await worker.fetch(new Request('https://analytics.example/api/summary'), env);
    assert.deepEqual(await summary.json(), { window: '30 days', views: 2 });
  } finally { env.DB.close(); }
});

test('collector rejects foreign origins, malformed payloads and oversized bodies', async () => {
  const env = setup();
  try {
    assert.equal((await worker.fetch(request(event(), { headers: { Origin: 'https://other.example' } }), env)).status, 403);
    const noOrigin = request(event()); noOrigin.headers.delete('Origin');
    assert.equal((await worker.fetch(noOrigin, env)).status, 403);
    assert.equal((await worker.fetch(request('{broken'), env)).status, 400);
    assert.equal((await worker.fetch(request('x'.repeat(5000)), env)).status, 400);
    assert.equal((await env.DB.prepare('SELECT COUNT(*) AS total FROM portfolio_events').first()).total, 0);
  } finally { env.DB.close(); }
});

test('detectable bots and an unconfigured collector do not generate visitor events', async () => {
  const env = setup();
  try {
    const bot = await worker.fetch(request(event(), { headers: { 'User-Agent': 'Googlebot/2.1' } }), env);
    assert.deepEqual(await bot.json(), { accepted: false, reason: 'automated' });
    delete env.SESSION_SALT;
    assert.equal((await recordEvent(request(event()), env, now)).status, 503);
    assert.equal((await env.DB.prepare('SELECT COUNT(*) AS total FROM portfolio_events').first()).total, 0);
  } finally { env.DB.close(); }
});

test('90-day cleanup removes expired detailed events and preserves the existing archive', async () => {
  const env = setup();
  try {
    await recordEvent(request(event()), env, now - 91 * 86400000);
    await recordEvent(request(event()), env, now);
    await worker.scheduled({ scheduledTime: now }, env);
    assert.equal((await env.DB.prepare('SELECT COUNT(*) AS total FROM portfolio_events').first()).total, 1);
    assert.equal((await env.DB.prepare('SELECT COUNT(*) AS total FROM page_views').first()).total, 2);
  } finally { env.DB.close(); }
});
