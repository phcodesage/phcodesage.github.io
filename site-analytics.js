const analyticsViewUrl = 'https://bounty-radar.rechceltoledo.workers.dev/api/analytics/view';
const analyticsSummaryUrl = 'https://bounty-radar.rechceltoledo.workers.dev/api/analytics/summary';

function recordPortfolioVisit() {
  if (!window.location.hostname.endsWith('github.io')) return;

  const sessionKey = 'phcodesage-analytics-session';
  let sessionId = sessionStorage.getItem(sessionKey);

  if (!sessionId) {
    sessionId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(sessionKey, sessionId);
  }

  const payload = JSON.stringify({ path: window.location.pathname, sessionId });
  const body = new Blob([payload], { type: 'text/plain' });

  if (!navigator.sendBeacon?.(analyticsViewUrl, body)) {
    fetch(analyticsViewUrl, { method: 'POST', body: payload, headers: { 'content-type': 'text/plain' }, keepalive: true }).catch(() => {});
  }
}

async function loadPortfolioPageViews() {
  const pageViews = document.querySelector('#portfolio-page-views');
  if (!pageViews) return;

  try {
    const response = await fetch(`${analyticsSummaryUrl}?refresh=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Analytics unavailable');

    const data = await response.json();
    pageViews.textContent = `Page views · ${Number(data.views || 0).toLocaleString()} in the last 30 days`;
  } catch {
    pageViews.textContent = 'Page views · unavailable';
  }
}

recordPortfolioVisit();
loadPortfolioPageViews();
