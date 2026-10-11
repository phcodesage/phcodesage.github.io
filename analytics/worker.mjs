import { PROJECTS, PAGE_PROJECTS, PATHS, CONTACT_TARGETS, PROJECT_TARGETS, NAVIGATION_TARGETS, SOURCES } from './catalog.mjs';

const MANILA_OFFSET = 8 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const encoder = new TextEncoder();

export function localDay(timestamp) {
  return new Date(timestamp + MANILA_OFFSET).toISOString().slice(0, 10);
}

export function periodFor(range, now = Date.now()) {
  const days = { today: 1, '7d': 7, '30d': 30 }[range];
  if (!days) return null;
  const today = Date.parse(localDay(now) + 'T00:00:00+08:00');
  return { range, days, start: today - (days - 1) * DAY, end: today + DAY, today: localDay(now) };
}

function headersFor(request, env) {
  const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' });
  if (request.headers.get('Origin') === env.PORTFOLIO_ORIGIN) {
    headers.set('Access-Control-Allow-Origin', env.PORTFOLIO_ORIGIN);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  }
  return headers;
}

function json(request, env, data, status = 200) {
  const headers = headersFor(request, env);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { status, headers });
}

async function authorized(request, env) {
  if (!env.ADMIN_TOKEN) return false;
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  if (!token || token.length > 512) return false;
  const [a, b] = await Promise.all([token, env.ADMIN_TOKEN].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function readPayload(request) {
  if (!request.body) throw new Error('Missing event');
  const reader = request.body.getReader(), chunks = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new Error('Event too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function validateEvent(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const { id, kind, sessionId, device } = payload;
  if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(id)) return null;
  if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(sessionId)) return null;
  if (!['page_view', 'project_click', 'contact_click', 'navigation_click'].includes(kind)) return null;
  if (!['mobile', 'tablet', 'desktop'].includes(device)) return null;
  const path = payload.path === '/index.html' ? '/' : payload.path === '/jinjalume/index.html' ? '/jinjalume/' : payload.path;
  if (!PATHS.has(path)) return null;
  let project = PAGE_PROJECTS[path] || '', target = '';
  if (kind === 'project_click') {
    if (!Object.hasOwn(PROJECTS, payload.project) || !PROJECT_TARGETS.has(payload.target)) return null;
    project = payload.project; target = payload.target;
  } else if (kind === 'contact_click') {
    if (!CONTACT_TARGETS.has(payload.target)) return null;
    target = payload.target;
  } else if (kind === 'navigation_click') {
    if (!NAVIGATION_TARGETS.has(payload.target)) return null;
    target = payload.target;
  }
  const referrer = typeof payload.referrer === 'string' && /^[a-z0-9.-]{1,100}$/.test(payload.referrer) ? payload.referrer : 'direct';
  return { id, kind, path, project, target, sessionId, device, referrer, source: SOURCES.has(payload.source) ? payload.source : 'other' };
}

export async function recordEvent(request, env, now = Date.now()) {
  let payload;
  try { payload = await readPayload(request); } catch { return json(request, env, { error: 'Invalid event' }, 400); }
  const event = validateEvent(payload);
  if (!event) return json(request, env, { error: 'Invalid event' }, 400);
  if (!env.SESSION_SALT) return json(request, env, { error: 'Tracking unavailable' }, 503);
  const day = localDay(now);
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${env.SESSION_SALT}:${day}:${event.sessionId}`));
  const sessionKey = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM portfolio_events WHERE day = ? AND session_key = ?').bind(day, sessionKey).first();
  if (count.total >= 300) return json(request, env, { error: 'Event limit reached' }, 429);
  // Only Cloudflare's edge metadata supplies country; never accept it from the browser.
  const code = request.cf?.country;
  const country = typeof code === 'string' && /^(?:[A-Z]{2}|T1)$/.test(code) ? code : 'XX';
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO portfolio_events
      (id, kind, path, project, target, source, country, device, referrer, session_key, created_at, day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(event.id, event.kind, event.path, event.project, event.target, event.source, country, event.device, event.referrer, sessionKey, now, day),
    env.DB.prepare(`INSERT INTO page_views (path, session_id, viewed_at)
      SELECT path, session_key, ? FROM portfolio_events WHERE id = ? AND kind = 'page_view' AND legacy_recorded = 0`).bind(new Date(now).toISOString(), event.id),
    env.DB.prepare("UPDATE portfolio_events SET legacy_recorded = 1 WHERE id = ? AND kind = 'page_view'").bind(event.id),
  ]);
  return json(request, env, { accepted: true }, 202);
}

export async function readStats(env, range = '7d', now = Date.now()) {
  const period = periodFor(range, now);
  if (!period) throw new Error('Invalid period');
  const query = (sql, extra = []) => env.DB.prepare(sql).bind(period.start, period.end, ...extra);
  const results = await env.DB.batch([
    query(`SELECT COUNT(DISTINCT session_key) AS sessions,
      SUM(kind = 'page_view') AS views, SUM(kind = 'project_click') AS projectClicks,
      SUM(kind = 'contact_click' AND target != 'form_sent') AS contactActions,
      SUM(kind = 'contact_click' AND target = 'form_sent') AS inquiries
      FROM portfolio_events WHERE created_at >= ? AND created_at < ?`),
    query(`SELECT day, SUM(kind = 'page_view') AS views, SUM(kind = 'project_click') AS clicks,
      COUNT(DISTINCT session_key) AS sessions FROM portfolio_events
      WHERE created_at >= ? AND created_at < ? GROUP BY day ORDER BY day`),
    query(`SELECT country, COUNT(DISTINCT session_key) AS sessions, SUM(kind = 'page_view') AS views,
      SUM(kind = 'project_click') AS clicks FROM portfolio_events
      WHERE created_at >= ? AND created_at < ? GROUP BY country ORDER BY views DESC, sessions DESC, country LIMIT 30`),
    query(`SELECT project, SUM(kind = 'project_click') AS clicks,
      SUM(kind = 'page_view') AS views, COUNT(DISTINCT session_key) AS sessions
      FROM portfolio_events WHERE created_at >= ? AND created_at < ? AND project != ''
      GROUP BY project ORDER BY clicks DESC, views DESC, project LIMIT 30`),
    query(`SELECT project, target, COUNT(*) AS clicks FROM portfolio_events
      WHERE created_at >= ? AND created_at < ? AND kind = 'project_click'
      GROUP BY project, target ORDER BY clicks DESC, project, target LIMIT 60`),
    query(`SELECT path, COUNT(*) AS views FROM portfolio_events
      WHERE created_at >= ? AND created_at < ? AND kind = 'page_view'
      GROUP BY path ORDER BY views DESC, path LIMIT 20`),
    query(`SELECT referrer, COUNT(*) AS views FROM portfolio_events
      WHERE created_at >= ? AND created_at < ? AND kind = 'page_view'
      GROUP BY referrer ORDER BY views DESC, referrer LIMIT 20`),
    query(`SELECT device, COUNT(*) AS views FROM portfolio_events
      WHERE created_at >= ? AND created_at < ? AND kind = 'page_view'
      GROUP BY device ORDER BY views DESC, device`),
    query(`SELECT target, COUNT(*) AS clicks FROM portfolio_events
      WHERE created_at >= ? AND created_at < ? AND kind = 'contact_click'
      GROUP BY target ORDER BY clicks DESC, target`),
    env.DB.prepare('SELECT MIN(created_at) AS since FROM portfolio_events'),
  ]);
  const metrics = results[0].results[0];
  for (const key of Object.keys(metrics)) metrics[key] = Number(metrics[key] || 0);
  const days = new Map(results[1].results.map(row => [row.day, row]));
  const series = Array.from({ length: period.days }, (_, index) => {
    const day = localDay(period.start + index * DAY);
    return days.get(day) || { day, views: 0, clicks: 0, sessions: 0 };
  });
  return {
    range, timezone: 'Asia/Manila', start: localDay(period.start), end: period.today,
    updatedAt: new Date(now).toISOString(), since: results[9].results[0].since,
    metrics, series, countries: results[2].results,
    projects: results[3].results.map(row => ({ ...row, name: PROJECTS[row.project] || row.project })),
    projectTargets: results[4].results, pages: results[5].results,
    referrers: results[6].results, devices: results[7].results, contacts: results[8].results,
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    if (origin && origin !== env.PORTFOLIO_ORIGIN) return json(request, env, { error: 'Origin not allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headersFor(request, env) });
    if (url.pathname === '/health' && request.method === 'GET') return json(request, env, { ok: true, service: 'portfolio-analytics' });
    try {
      if (url.pathname === '/api/events' && request.method === 'POST') {
        if (origin !== env.PORTFOLIO_ORIGIN) return json(request, env, { error: 'Origin required' }, 403);
        if (/bot|crawl|spider|HeadlessChrome|Playwright/i.test(request.headers.get('User-Agent') || '')) return json(request, env, { accepted: false, reason: 'automated' }, 202);
        return await recordEvent(request, env);
      }
      if (url.pathname === '/api/summary' && request.method === 'GET') {
        // Preserve the original public counter's time window and timestamp comparison.
        const result = await env.DB.prepare("SELECT COUNT(*) AS views FROM page_views WHERE viewed_at >= datetime('now', '-30 days')").first();
        return json(request, env, { window: '30 days', views: result.views });
      }
      if (url.pathname === '/api/stats' && request.method === 'GET') {
        if (!await authorized(request, env)) return json(request, env, { error: 'Password not recognized' }, 401);
        const range = url.searchParams.get('range') || '7d';
        if (!periodFor(range)) return json(request, env, { error: 'Invalid period' }, 400);
        return json(request, env, await readStats(env, range));
      }
      return json(request, env, { error: 'Not found' }, 404);
    } catch {
      // Avoid logging requests, tokens, event payloads, or visitor information.
      return json(request, env, { error: 'Analytics temporarily unavailable' }, 503);
    }
  },
  async scheduled(controller, env) {
    // Keep detailed events for 90 days. The original page-view archive is preserved.
    await env.DB.prepare('DELETE FROM portfolio_events WHERE created_at < ?').bind(controller.scheduledTime - 90 * DAY).run();
  },
};
