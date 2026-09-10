const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileMenu = document.querySelector('[data-mobile-menu]');

menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  mobileMenu?.classList.toggle('hidden', isOpen);
  menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
  menuToggle.textContent = isOpen ? '☰' : '×';
});

mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open navigation');
    menuToggle && (menuToggle.textContent = '☰');
    mobileMenu.classList.add('hidden');
  });
});

const progress = document.querySelector('#scroll-progress');
const updateProgress = () => {
  if (!progress) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${scrollable > 0 ? window.scrollY / scrollable : 0})`;
};

window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

const revealItems = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}
function recordPortfolioVisit() {
  if (!window.location.hostname.endsWith("github.io")) return;

  const analyticsUrl = "https://bounty-radar.rechceltoledo.workers.dev/api/analytics/view";
  const sessionKey = "phcodesage-analytics-session";
  let sessionId = sessionStorage.getItem(sessionKey);

  if (!sessionId) {
    sessionId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(sessionKey, sessionId);
  }

  const payload = JSON.stringify({ path: window.location.pathname, sessionId });
  const body = new Blob([payload], { type: "text/plain" });

  if (!navigator.sendBeacon?.(analyticsUrl, body)) {
    fetch(analyticsUrl, { method: "POST", body: payload, headers: { "content-type": "text/plain" }, keepalive: true }).catch(() => {});
  }
}

recordPortfolioVisit();
