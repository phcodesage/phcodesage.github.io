import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import worker, { recordEvent, readStats } from '../worker.mjs';
import { TestDatabase } from './database.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const output = path.join(root, 'test-results');
await fs.mkdir(output, { recursive: true });
const env = { DB: new TestDatabase(), PORTFOLIO_ORIGIN: 'https://phcodesage.github.io', SESSION_SALT: 'isolated-browser-test-salt', ADMIN_TOKEN: 'isolated-browser-test-password' };
const base = env.PORTFOLIO_ORIGIN;
const api = 'https://portfolio-analytics.rechceltoledo.workers.dev';
const normalAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const browser = await chromium.launch({ headless: true, ...(process.platform === 'darwin' ? { channel: 'chrome' } : {}) });
const errors = [], tracked = [];
let emptyMode = false;
const emptyEnv = { ...env, DB: new TestDatabase() };

async function setup(context) {
  await context.route(base + '/**', async route => {
    const url = new URL(route.request().url());
    const filename = path.join(root, url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname);
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
    try { await route.fulfill({ status: 200, contentType: types[path.extname(filename)] || 'application/octet-stream', body: await fs.readFile(filename) }); }
    catch { await route.fulfill({ status: 404, body: 'Not found' }); errors.push('Missing local page or asset: ' + url.pathname); }
  });
  await context.route(api + '/**', async route => {
    const incoming = route.request();
    const request = new Request(incoming.url(), { method: incoming.method(), headers: incoming.headers(), ...(incoming.postData() ? { body: incoming.postData() } : {}) });
    Object.defineProperty(request, 'cf', { value: { country: 'PH' } });
    if (new URL(incoming.url()).pathname === '/api/events' && incoming.method() === 'POST') tracked.push(JSON.parse(incoming.postData()));
    const response = await worker.fetch(request, emptyMode ? emptyEnv : env);
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() });
  });
  await context.route('https://clara-health.pages.dev/**', route => route.fulfill({ status: 200, body: 'Isolated demo-navigation test' }));
  await context.route('https://formsubmit.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' }));
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
}

async function readable(page) {
  const result = await page.evaluate(() => {
    const tiny = [], walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, element = node.parentElement;
      if (!node.textContent.trim() || element.closest('[aria-hidden="true"],.sr-only') || !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      if (parseFloat(getComputedStyle(element).fontSize) < 16) tiny.push(node.textContent.trim());
    }
    return { tiny, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  assert.deepEqual(result, { tiny: [], overflow: false });
}

const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, userAgent: normalAgent });
await setup(context);
const page = await context.newPage();
try {
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  assert.equal(tracked.filter(row => row.kind === 'page_view').length, 1);
  assert.equal(await page.locator('.project-arrow .arrow-icon').count(), 8);
  assert.ok(!/[↗↓↑←→]/.test(await page.locator('body').innerText()));
  await page.locator('#clara-health').click();
  await page.waitForURL('**/case-studies/clara-health.html'); await page.waitForLoadState('networkidle');
  assert.ok(tracked.some(row => row.kind === 'project_click' && row.project === 'clara-health' && row.target === 'case-study' && row.source === 'card'));
  const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: 'Try Clara’s assistant', exact: true }).click()]);
  await popup.waitForLoadState('domcontentloaded'); await popup.close();
  await page.waitForTimeout(100);
  assert.ok(tracked.some(row => row.project === 'clara-health' && row.target === 'live-demo'));
  await page.goto(base + '/');
  await page.getByText('Or leave a message here', { exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill('PRIVATE_TEST_NAME');
  await page.getByLabel('Email address', { exact: true }).fill('private-test@example.com');
  await page.getByLabel('What can I help with?', { exact: true }).fill('PRIVATE_TEST_MESSAGE');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByText('Message sent. I’ll get back to you soon.', { exact: true }).waitFor();
  await page.waitForTimeout(100);
  assert.ok(tracked.some(row => row.target === 'form_attempt'));
  assert.ok(tracked.some(row => row.target === 'form_sent'));
  assert.ok(!JSON.stringify(tracked).includes('PRIVATE_TEST')); assert.ok(!JSON.stringify(tracked).includes('private-test@example.com'));
  assert.equal(await page.locator('#contact-submit .arrow-icon').count(), 1);
  assert.equal((await readStats(env, 'today')).metrics.sessions, 1);

  await page.goto(base + '/privacy/');
  await page.getByRole('button', { name: 'Turn off traffic analytics', exact: true }).click();
  const before = tracked.length;
  await page.goto(base + '/'); await page.locator('#clara-health').click(); await page.waitForLoadState('networkidle');
  assert.equal(tracked.length, before, 'Opt-out prevents page and click collection');
  await page.goto(base + '/privacy/');
  await page.getByRole('button', { name: 'Allow traffic analytics', exact: true }).click();

  await page.goto(base + '/analytics/', { waitUntil: 'networkidle' }); await readable(page);
  await page.locator('#password').fill('wrong-password');
  await page.getByRole('button', { name: 'Open my analytics', exact: true }).click();
  await page.getByText('Password not recognized. Try again.', { exact: true }).waitFor();
  assert.ok(await page.locator('#dashboard').isHidden());
  await page.locator('#password').fill(env.ADMIN_TOKEN);
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  assert.equal(await page.locator('#password').getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await page.getByRole('button', { name: 'Open my analytics', exact: true }).click();
  await page.locator('#dashboard').waitFor({ state: 'visible' });
  const actual = await readStats(env, '7d');
  assert.equal(await page.locator('[data-metric="views"]').innerText(), String(actual.metrics.views));
  assert.ok((await page.locator('#countries').innerText()).includes('Philippines'));
  assert.ok((await page.locator('#projects').innerText()).includes('Clara Health'));
  assert.equal(await page.locator('#inquiries').innerText(), '1 completed inquiry');
  await readable(page);
  await page.screenshot({ path: path.join(output, 'analytics-desktop.png') });
  for (const name of ['Today', '30 days', '7 days']) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.waitForFunction(name => [...document.querySelectorAll('[data-range]')].some(button => button.textContent === name && button.getAttribute('aria-pressed') === 'true'), name);
  }
  await page.getByText('View the daily numbers', { exact: true }).click();
  assert.equal(await page.locator('#daily-rows tr').count(), 7);
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 }); await page.waitForTimeout(100); await readable(page);
    await page.screenshot({ path: path.join(output, `analytics-${width}.png`) });
  }
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' }); await readable(page);
  await page.screenshot({ path: path.join(output, 'analytics-mobile-dark.png') });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForLoadState('networkidle');
  assert.ok(await page.locator('#login-screen').isVisible());
  assert.equal(await page.evaluate(() => sessionStorage.getItem('phcodesage-analytics-access')), null);
  emptyMode = true;
  await page.locator('#password').fill(env.ADMIN_TOKEN); await page.getByRole('button', { name: 'Open my analytics', exact: true }).click();
  await page.locator('#dashboard').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-metric="views"]').innerText(), '0');
  assert.ok((await page.locator('#projects').innerText()).includes('No activity in this period yet.'));
  emptyMode = false;

  for (const privacy of ['gpc', 'dnt', 'blocked-storage', 'beacon-fallback']) {
    const isolated = await browser.newContext({ userAgent: normalAgent }); await setup(isolated);
    await isolated.addInitScript(privacy => {
      if (privacy === 'gpc') Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
      if (privacy === 'dnt') Object.defineProperty(navigator, 'doNotTrack', { value: '1' });
      if (privacy === 'blocked-storage') { Storage.prototype.getItem = () => { throw new Error('Blocked storage'); }; Storage.prototype.setItem = () => { throw new Error('Blocked storage'); }; }
      if (privacy === 'beacon-fallback') navigator.sendBeacon = () => false;
    }, privacy);
    const privacyPage = await isolated.newPage(), start = tracked.length;
    await privacyPage.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await privacyPage.waitForFunction(() => document.querySelector('#theme-toggle').hidden === false);
    await privacyPage.waitForTimeout(600);
    assert.equal(tracked.length - start, privacy === 'gpc' || privacy === 'dnt' ? 0 : 1, privacy);
    await isolated.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: real click and view aggregation, project navigation, inquiry events without form content, privacy opt-out and browser signals, blocked storage, beacon fallback, private login, filters, tables, zero-data state, sign-out, 16px text, responsive layouts, dark theme, and rounded arrows.');
} finally { await browser.close(); env.DB.close(); emptyEnv.DB.close(); }
