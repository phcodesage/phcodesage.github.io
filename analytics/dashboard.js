(() => {
  const endpoint = 'https://portfolio-analytics.rechceltoledo.workers.dev/api/stats';
  const sessionKey = 'phcodesage-analytics-access';
  const $ = selector => document.querySelector(selector);
  const number = value => Number(value || 0).toLocaleString();
  const date = value => new Date(value + 'T12:00:00+08:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
  const labels = { email: 'Email link', whatsapp: 'WhatsApp link', telegram: 'Telegram link', section: 'Contact section opened', form_attempt: 'Inquiry form submitted', form_sent: 'Completed inquiries' };
  let token = '', range = ['today', '7d', '30d'].includes(new URL(location.href).searchParams.get('range')) ? new URL(location.href).searchParams.get('range') : '7d';
  let controller, requestVersion = 0, latest;
  try { token = sessionStorage.getItem(sessionKey) || ''; } catch {}

  function status(element, message, error = false) {
    element.textContent = message; element.dataset.error = String(error);
  }

  function signOut() {
    requestVersion++; controller?.abort(); token = ''; latest = null;
    try { sessionStorage.removeItem(sessionKey); } catch {}
    $('#dashboard').hidden = true; $('#stats-content').replaceChildren();
    location.reload();
  }

  function empty(container, message) {
    const node = document.createElement('p'); node.className = 'empty-state'; node.textContent = message;
    container.replaceChildren(node);
  }

  function ranks(selector, rows, name, value, detail, suffix = 'views') {
    const container = $(selector); container.replaceChildren();
    if (!rows.length) { empty(container, 'No activity in this period yet.'); return; }
    const max = Math.max(1, ...rows.map(value));
    for (const row of rows.slice(0, 10)) {
      const item = document.createElement('div'); item.className = 'rank-row';
      const head = document.createElement('div'); head.className = 'rank-heading';
      const title = document.createElement('strong'); title.textContent = name(row);
      const count = document.createElement('span'); count.textContent = `${number(value(row))} ${suffix}`;
      head.append(title, count); item.append(head);
      if (detail) { const note = document.createElement('p'); note.className = 'rank-detail'; note.textContent = detail(row); item.append(note); }
      const bar = document.createElement('div'), fill = document.createElement('i'); bar.className = 'rank-bar'; bar.setAttribute('aria-hidden', 'true');
      fill.style.width = `${Math.max(0, value(row) / max * 100)}%`; bar.append(fill); item.append(bar); container.append(item);
    }
  }

  function table(selector, rows) {
    const tbody = $(selector); tbody.replaceChildren();
    if (!rows.length) {
      const row = document.createElement('tr'), cell = document.createElement('td');
      cell.colSpan = 2; cell.textContent = 'No page views in this period yet.'; row.append(cell); tbody.append(row); return;
    }
    for (const values of rows) {
      const row = document.createElement('tr');
      for (const value of values) { const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell); }
      tbody.append(row);
    }
  }

  function country(code) {
    if (code === 'XX') return 'Unknown country';
    if (code === 'T1') return 'Tor network';
    try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; } catch { return code; }
  }

  function drawChart(series) {
    const container = $('#traffic-chart');
    if (!container || !series) return;
    const ns = 'http://www.w3.org/2000/svg', width = Math.max(240, Math.round(container.clientWidth)), height = 240;
    const left = 42, right = width - 12, top = 15, bottom = 194;
    const max = Math.max(2, ...series.flatMap(row => [row.views, row.clicks]));
    const ceiling = Math.ceil(max / 4) * 4;
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Daily page views and project clicks. Exact values are in the daily numbers table below.');
    function add(tag, attributes, text) {
      const node = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
      if (text !== undefined) node.textContent = text;
      svg.append(node); return node;
    }
    const x = index => series.length === 1 ? (left + right) / 2 : left + index / (series.length - 1) * (right - left);
    const y = value => bottom - value / ceiling * (bottom - top);
    for (let step = 0; step <= 4; step++) {
      const value = step * ceiling / 4;
      add('line', { x1: left, y1: y(value), x2: right, y2: y(value), class: 'chart-grid' });
      add('text', { x: left - 10, y: y(value) + 5, 'text-anchor': 'end', class: 'chart-label' }, String(value));
    }
    for (const key of ['views', 'clicks']) {
      add('polyline', { points: series.map((row, index) => `${x(index)},${y(row[key])}`).join(' '), class: `chart-${key}` });
      for (const [index, row] of series.entries()) {
        const circle = add('circle', { cx: x(index), cy: y(row[key]), r: series.length > 15 ? 2 : 3, fill: key === 'views' ? 'var(--accent)' : 'var(--mint)' });
        const title = document.createElementNS(ns, 'title'); title.textContent = `${date(row.day)}: ${number(row[key])} ${key === 'views' ? 'page views' : 'project clicks'}`; circle.append(title);
      }
    }
    const indices = [...new Set(series.length === 1 ? [0] : [0, Math.floor((series.length - 1) / 2), series.length - 1])];
    for (const index of indices) add('text', { x: x(index), y: bottom + 35, 'text-anchor': index === 0 && series.length > 1 ? 'start' : index === series.length - 1 && series.length > 1 ? 'end' : 'middle', class: 'chart-label' }, date(series[index].day));
    container.replaceChildren(svg);
  }

  function render(data) {
    for (const metric of document.querySelectorAll('[data-metric]')) metric.textContent = number(data.metrics[metric.dataset.metric]);
    $('#date-range').textContent = `${date(data.start)} – ${date(data.end)} · Manila time`;
    ranks('#countries', data.countries, row => country(row.country), row => row.views, row => `${number(row.sessions)} sessions · ${number(row.clicks)} project clicks`);
    ranks('#projects', data.projects, row => row.name, row => row.clicks, row => {
      const targets = data.projectTargets.filter(item => item.project === row.project).map(item => `${number(item.clicks)} ${({ 'case-study': 'case study', 'live-demo': 'live demo', source: 'source', 'project-link': 'project link' })[item.target]}`);
      return `${number(row.views)} project-page views${targets.length ? ' · ' + targets.join(' · ') : ''}`;
    }, 'clicks');
    ranks('#referrers', data.referrers, row => row.referrer === 'direct' ? 'Direct / unknown' : row.referrer === 'internal' ? 'Within the portfolio' : row.referrer, row => row.views);
    ranks('#contacts', data.contacts.filter(row => row.target !== 'form_sent'), row => labels[row.target] || row.target, row => row.clicks, null, 'actions');
    $('#inquiries').textContent = `${number(data.metrics.inquiries)} completed ${data.metrics.inquiries === 1 ? 'inquiry' : 'inquiries'}`;
    table('#page-rows', data.pages.map(row => [row.path === '/' ? 'Portfolio homepage' : row.path === '/resume.html' ? 'Resume' : row.path, number(row.views)]));
    table('#daily-rows', data.series.map(row => [date(row.day), number(row.views), number(row.sessions), number(row.clicks)]));
    $('#devices').replaceChildren();
    for (const row of data.devices) { const span = document.createElement('span'); span.textContent = `${row.device[0].toUpperCase() + row.device.slice(1)} · ${number(row.views)} views`; $('#devices').append(span); }
    if (!data.devices.length) $('#devices').textContent = 'Device totals appear after the first visit.';
    const time = new Date(data.updatedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
    $('#updated-at').textContent = `Updated ${time} · ${data.since ? 'Detailed data available since ' + new Date(data.since).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }) + '.' : 'Detailed tracking starts with the next portfolio visit.'} Earlier page views remain in the public 30-day total.`;
    for (const button of document.querySelectorAll('[data-range]')) button.setAttribute('aria-pressed', String(button.dataset.range === data.range));
    drawChart(data.series);
  }

  async function load(fromLogin = false) {
    const version = ++requestVersion;
    controller?.abort(); controller = new AbortController();
    const destination = fromLogin ? $('#login-status') : $('#dashboard-status');
    status(destination, 'Loading your analytics…');
    $('#login-submit').disabled = true; $('#refresh').disabled = true;
    try {
      const response = await fetch(`${endpoint}?range=${range}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal });
      if (version !== requestVersion) return;
      if (response.status === 401) {
        token = ''; latest = null; try { sessionStorage.removeItem(sessionKey); } catch {}
        $('#dashboard').hidden = true; $('#login-screen').hidden = false;
        status($('#login-status'), 'Password not recognized. Try again.', true); $('#password').focus(); return;
      }
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (version !== requestVersion) return;
      try { sessionStorage.setItem(sessionKey, token); } catch {}
      $('#login-screen').hidden = true; $('#dashboard').hidden = false;
      latest = data; render(data); $('#password').value = '';
      status($('#dashboard-status'), ''); status($('#login-status'), '');
      if (fromLogin) $('#dashboard-title').focus();
    } catch (error) {
      if (error.name !== 'AbortError' && version === requestVersion) status(destination, 'Analytics couldn’t load. Check your connection and try again.', true);
    } finally {
      if (version === requestVersion) { $('#login-submit').disabled = false; $('#refresh').disabled = false; }
    }
  }

  $('#login-form').addEventListener('submit', event => { event.preventDefault(); token = $('#password').value.trim(); if (token) load(true); });
  $('#show-password').addEventListener('click', () => { const show = $('#password').type === 'password'; $('#password').type = show ? 'text' : 'password'; $('#show-password').textContent = show ? 'Hide' : 'Show'; $('#show-password').setAttribute('aria-pressed', String(show)); $('#show-password').setAttribute('aria-label', show ? 'Hide password' : 'Show password'); });
  $('#logout').addEventListener('click', () => signOut());
  $('#refresh').addEventListener('click', () => load());
  for (const button of document.querySelectorAll('[data-range]')) button.addEventListener('click', () => {
    range = button.dataset.range;
    const url = new URL(location.href); url.searchParams.set('range', range); history.replaceState(null, '', url);
    load();
  });
  new ResizeObserver(() => { if (latest && !$('#dashboard').hidden) drawChart(latest.series); }).observe($('#traffic-chart'));
  if (token) load(true);
})();
