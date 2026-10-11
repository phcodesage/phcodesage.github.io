(() => {
  const origin = 'https://portfolio-analytics.rechceltoledo.workers.dev';
  const production = location.hostname === 'phcodesage.github.io';
  const storageKey = 'phcodesage-analytics-session';
  const pageProject = document.body.dataset.analyticsProject || '';
  const uid = () => crypto.randomUUID?.() || `event-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let sessionId = uid();
  try {
    sessionId = sessionStorage.getItem(storageKey) || sessionId;
    sessionStorage.setItem(storageKey, sessionId);
  } catch { /* Analytics never blocks navigation when browser storage is restricted. */ }

  function optedOut() {
    if (navigator.globalPrivacyControl || navigator.doNotTrack === '1' || window.doNotTrack === '1') return true;
    try { return localStorage.getItem('phcodesage-analytics-optout') === '1'; } catch { return false; }
  }

  function referrer() {
    if (!document.referrer) return 'direct';
    try {
      const url = new URL(document.referrer);
      return url.origin === location.origin ? 'internal' : url.hostname.replace(/^www\./, '').toLowerCase();
    } catch { return 'direct'; }
  }

  function record(kind, details = {}) {
    if (!production || optedOut() || document.visibilityState === 'prerender') return;
    const payload = JSON.stringify({
      id: uid(), kind, path: location.pathname, sessionId,
      device: innerWidth <= 600 ? 'mobile' : innerWidth <= 1024 ? 'tablet' : 'desktop',
      referrer: referrer(), ...details,
    });
    const url = `${origin}/api/events`;
    try {
      if (navigator.sendBeacon?.(url, new Blob([payload], { type: 'text/plain' }))) return;
    } catch { /* Fall back without interrupting the clicked link. */ }
    fetch(url, { method: 'POST', body: payload, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(() => {});
  }

  function linkEvent(event) {
    const link = event.target.closest?.('a[href]');
    if (!link || link.closest('[data-analytics-exclude]') || (event.type === 'auxclick' && event.button !== 1)) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    const source = link.closest('.project-card') ? 'card' : link.closest('.archive-item') ? 'archive' : pageProject ? 'case-study' : 'navigation';
    let contact = url.protocol === 'mailto:' ? 'email' : url.hostname === 'wa.me' ? 'whatsapp' : url.hostname === 't.me' ? 'telegram' : '';
    if (url.origin === location.origin && url.hash === '#contact') contact = 'section';
    if (contact) { record('contact_click', { target: contact, source: 'contact' }); return; }
    const project = link.dataset.analyticsProject || (pageProject && url.origin !== location.origin && /^https?:$/.test(url.protocol) ? pageProject : '');
    if (project) {
      const target = link.dataset.analyticsTarget || (url.origin === location.origin && url.pathname.includes('/case-studies/') ? 'case-study' : url.hostname === 'github.com' || url.hostname === 'pypi.org' ? 'source' : 'live-demo');
      record('project_click', { project, target, source }); return;
    }
    if (url.origin === location.origin) {
      const target = url.pathname === '/resume.html' ? 'resume' : { '#work': 'work', '#companies': 'companies', '#about': 'about', '#top': 'top' }[url.hash];
      if (target) record('navigation_click', { target, source: 'navigation' });
    }
  }

  document.addEventListener('click', linkEvent);
  document.addEventListener('auxclick', linkEvent);
  document.querySelector('#contact-form')?.addEventListener('submit', event => {
    if (event.target.checkValidity()) record('contact_click', { target: 'form_attempt', source: 'contact' });
  });
  document.addEventListener('portfolio:inquiry-sent', () => record('contact_click', { target: 'form_sent', source: 'contact' }));
  record('page_view');

  async function loadPageViews() {
    const element = document.querySelector('#portfolio-page-views');
    if (!element) return;
    try {
      const response = await fetch(`${origin}/api/summary`, { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      element.textContent = `Page views · ${Number(data.views || 0).toLocaleString()} in the last 30 days`;
    } catch { element.textContent = 'Page views · unavailable'; }
  }
  loadPageViews();
})();
