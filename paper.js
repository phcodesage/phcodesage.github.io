(() => {
  const panels = [...document.querySelectorAll('.panel')];
  const tabs = [...document.querySelectorAll('.tab')];
  const ids = panels.map(p => p.id);

  function show(id, push = true) {
    if (!ids.includes(id)) id = ids[0];
    panels.forEach(p => {
      const on = p.id === id;
      p.classList.toggle('active', on);
      p.toggleAttribute('inert', !on);
      p.setAttribute('aria-hidden', String(!on));
      if (on) p.scrollTop = 0;
    });
    tabs.forEach(t => {
      const on = t.dataset.target === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (push && location.hash.slice(1) !== id) history.replaceState(null, '', id === ids[0] ? location.pathname : `#${id}`);
  }

  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.target)));

  // In-page links like href="#contact" switch panels instead of scrolling.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (ids.includes(id)) { e.preventDefault(); show(id); }
  });

  // Keyboard: 1–5 jump; arrows cycle when focus is on the tabs or nowhere in particular.
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    const cur = ids.indexOf(document.querySelector('.panel.active')?.id);
    if (/^[1-9]$/.test(e.key) && ids[+e.key - 1]) { show(ids[+e.key - 1]); return; }
    if (!(e.target === document.body || e.target.closest('.tabs'))) return;
    const step = { ArrowDown: 1, ArrowRight: 1, PageDown: 1, ArrowUp: -1, ArrowLeft: -1, PageUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    show(ids[(cur + step + ids.length) % ids.length]);
    if (e.target.closest('.tabs')) document.querySelector('.tab[aria-selected="true"]')?.focus();
  });

  window.addEventListener('hashchange', () => show(location.hash.slice(1), false));
  show(location.hash.slice(1), false);

  // Theme
  const toggle = document.querySelector('#theme-toggle');
  const icon = toggle?.querySelector('.bi');
  function paintTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    if (icon) icon.className = `bi ${dark ? 'bi-sun-fill' : 'bi-moon-fill'}`;
    toggle?.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#202023' : '#f0e7db');
  }
  toggle?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('phcodesage-theme', next); } catch {}
    paintTheme();
  });
  paintTheme();

  // Toast
  const bar = document.querySelector('#snackbar');
  let barTimer;
  function snack(msg) {
    if (!bar) return;
    bar.textContent = msg;
    bar.classList.add('show');
    clearTimeout(barTimer);
    barTimer = setTimeout(() => bar.classList.remove('show'), 2600);
  }

  // Copy email
  document.querySelector('#copy-email')?.addEventListener('click', async e => {
    const email = e.currentTarget.dataset.email;
    try { await navigator.clipboard.writeText(email); snack('Email copied'); }
    catch { location.href = `mailto:${email}`; }
  });

  // Contact form → FormSubmit AJAX
  const form = document.querySelector('#contact-form');
  const submit = document.querySelector('#contact-submit');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity() || submit.disabled) return;
    submit.disabled = true;
    const label = submit.innerHTML;
    submit.textContent = 'Sending…';
    try {
      const res = await fetch('https://formsubmit.co/ajax/rechceltoledo@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
      });
      if (!res.ok) throw new Error();
      form.reset();
      snack('Sent — I’ll reply within 24h');
      document.dispatchEvent(new CustomEvent('portfolio:inquiry-sent'));
    } catch {
      snack('Couldn’t send. Email me instead.');
    } finally {
      submit.disabled = false;
      submit.innerHTML = label;
    }
  });
})();
