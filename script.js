const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const themeToggle = document.querySelector('#theme-toggle');
const themeIcon = document.querySelector('[data-theme-icon]');
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  themeIcon.textContent = dark ? '☀' : '☾';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#0e1328' : '#fbf8f6';
}
if (themeToggle) {
  themeToggle.hidden = false;
  updateThemeButton();
  themeToggle.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('phcodesage-theme', theme); } catch {}
    updateThemeButton();
  });
}

// The header settles onto paper once the garden is behind us.
const siteHeader = document.querySelector('.site-header');
function updateHeader() { siteHeader?.classList.toggle('is-scrolled', window.scrollY > 40); }
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();


// Scroll-linked motion. Each [data-scroll] element gets three numbers that CSS turns into motion:
//   --enter 0 → 1 while its top rises from the bottom of the viewport to just past the middle,
//   --p     0 → 1 across its whole pass through the viewport,
//   --exit  0 → 1 while it scrolls off the top.
// The pinned voyage ([data-scroll="pin"]) instead gets --p across the distance it stays pinned.
const motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

// The About paragraphs light up word by word as they are read.
document.querySelectorAll('[data-words]').forEach((paragraph) => {
  if (!motionOK) return;
  const words = paragraph.textContent.trim().split(/\s+/);
  paragraph.textContent = '';
  paragraph.style.setProperty('--n', String(words.length));
  words.forEach((word, index) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.style.setProperty('--i', String(index));
    span.textContent = word;
    paragraph.append(span, index < words.length - 1 ? ' ' : '');
  });
});

const scrollItems = motionOK ? [...document.querySelectorAll('[data-scroll]')] : [];
const voyage = document.querySelector('[data-voyage]');
const voyageCaptions = voyage ? [...voyage.querySelectorAll('.voyage-caption')] : [];
const voyageStops = voyage ? [...voyage.querySelectorAll('[data-voyage-goto]')] : [];
let scrollQueued = false;

function updateScrollMotion() {
  scrollQueued = false;
  const viewport = window.innerHeight;
  scrollItems.forEach((element) => {
    const rect = element.getBoundingClientRect();
    if (element.dataset.scroll === 'pin') {
      element.style.setProperty('--p', clamp01(-rect.top / Math.max(rect.height - viewport, 1)).toFixed(4));
      return;
    }
    if (rect.bottom < -viewport || rect.top > viewport * 2) return;
    element.style.setProperty('--enter', clamp01((viewport - rect.top) / (viewport * 0.45)).toFixed(3));
    element.style.setProperty('--p', clamp01((viewport - rect.top) / (viewport + rect.height)).toFixed(3));
    element.style.setProperty('--exit', clamp01(-rect.top / Math.max(rect.height, 1)).toFixed(3));
  });
  if (voyage && motionOK) updateVoyage(parseFloat(voyage.style.getPropertyValue('--p')) || 0);
}

// Captions fade in, hold, and drift away across their slice of the voyage.
function updateVoyage(progress) {
  voyageCaptions.forEach((caption) => {
    const from = parseFloat(caption.dataset.from);
    const to = parseFloat(caption.dataset.to);
    const local = (progress - from) / (to - from);
    const show = clamp01(Math.min(local / 0.18, (1 - local) / 0.18));
    caption.style.setProperty('--show', show.toFixed(3));
    caption.style.setProperty('--local', clamp01(local).toFixed(3));
    caption.classList.toggle('is-active', show > 0.5);
  });
  voyageStops.forEach((stop, index) => {
    const next = voyageStops[index + 1];
    const start = parseFloat(stop.dataset.voyageGoto) - 0.11;
    const end = next ? parseFloat(next.dataset.voyageGoto) - 0.11 : 0.9;
    stop.toggleAttribute('aria-current', progress >= start && progress < end);
  });
}

function queueScrollMotion() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(updateScrollMotion);
}
if (motionOK) {
  window.addEventListener('scroll', queueScrollMotion, { passive: true });
  window.addEventListener('resize', queueScrollMotion);
  updateScrollMotion();
  document.documentElement.classList.add('scroll-motion');
}

// Chapter dots jump to their part of the voyage.
voyageStops.forEach((stop) => stop.addEventListener('click', () => {
  const travel = voyage.offsetHeight - window.innerHeight;
  window.scrollTo({ top: voyage.offsetTop + travel * parseFloat(stop.dataset.voyageGoto), behavior: motionOK ? 'smooth' : 'auto' });
}));

// Cards lean toward the pointer, like a print held up to the light.
if (motionOK && window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--tx', (((event.clientX - rect.left) / rect.width) * 2 - 1).toFixed(3));
      card.style.setProperty('--ty', (((event.clientY - rect.top) / rect.height) * 2 - 1).toFixed(3));
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tx', '0');
      card.style.setProperty('--ty', '0');
    });
  });
}

const gardenHint = document.querySelector('.garden-hint-text');
if (gardenHint && !window.matchMedia('(hover: hover)').matches) gardenHint.textContent = 'Tap the sand to rake it.';

// A thin crimson-to-gold bar shows how far down the page you are.
const scrollProgress = document.querySelector('.scroll-progress');
function updateProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress?.style.setProperty('--progress', max > 0 ? String(window.scrollY / max) : '0');
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

// Maple leaves keep drifting down the page after the garden scrolls away.
const petalLayer = document.querySelector('.petal-layer');
const heroSection = document.querySelector('.hero');
if (petalLayer?.getContext && heroSection && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const context = petalLayer.getContext('2d');
  const count = window.innerWidth < 700 ? 8 : 14;
  let width = 0;
  let height = 0;
  let frame = 0;
  let heroVisible = true;
  const petals = Array.from({ length: count }, () => ({}));
  function resetPetal(petal, scatter) {
    petal.x = Math.random() * width;
    petal.y = scatter ? Math.random() * height : -20;
    petal.size = 7 + Math.random() * 7;
    petal.fall = 18 + Math.random() * 26;
    petal.drift = 10 + Math.random() * 22;
    petal.phase = Math.random() * Math.PI * 2;
    petal.spin = (Math.random() - 0.5) * 2;
    petal.angle = Math.random() * Math.PI * 2;
    petal.tone = Math.floor(Math.random() * 3);
  }
  // A seven-lobed maple leaf, cached per size.
  const leafPaths = new Map();
  function leafPath(size) {
    const key = Math.round(size);
    if (leafPaths.has(key)) return leafPaths.get(key);
    const path = new Path2D();
    const lobes = 7;
    path.moveTo(0, key);
    for (let i = 0; i <= lobes * 2; i++) {
      const angle = -Math.PI * 0.82 + (i / (lobes * 2)) * Math.PI * 1.64;
      const lobe = 1 - (Math.abs(angle) / Math.PI) * 0.55;
      const radius = (i % 2 ? lobe : 0.32 + lobe * 0.08) * key;
      path.lineTo(Math.sin(angle) * radius, -Math.cos(angle) * radius + key * 0.1);
    }
    path.closePath();
    leafPaths.set(key, path);
    return path;
  }
  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    petalLayer.width = width * ratio;
    petalLayer.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function drawPetal(petal, time) {
    const flutter = Math.cos(time * 2 + petal.phase);
    context.save();
    context.translate(petal.x, petal.y);
    context.rotate(petal.angle);
    context.scale(1, 0.35 + Math.abs(flutter) * 0.65);
    context.fillStyle = petalColors[petal.tone];
    context.fill(leafPath(petal.size));
    context.restore();
  }
  let petalColors = [];
  function readPetalColors() {
    const css = getComputedStyle(document.documentElement);
    petalColors = ['--garden-leaf', '--garden-leaf-2', '--garden-leaf-3'].map((name) => css.getPropertyValue(name).trim());
  }
  let last = performance.now();
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const time = now / 1000;
    context.clearRect(0, 0, width, height);
    petals.forEach((petal) => {
      petal.y += petal.fall * dt;
      petal.x += Math.sin(time * 0.8 + petal.phase) * petal.drift * dt;
      petal.angle += petal.spin * dt;
      if (petal.y > height + 20) resetPetal(petal, false);
      drawPetal(petal, time);
    });
    frame = requestAnimationFrame(tick);
  }
  function update() {
    const run = !heroVisible && !document.hidden;
    if (run && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
    if (!run && frame) { cancelAnimationFrame(frame); frame = 0; context.clearRect(0, 0, width, height); }
  }
  resize();
  readPetalColors();
  petals.forEach((petal) => resetPetal(petal, true));
  window.addEventListener('resize', resize);
  new MutationObserver(readPetalColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new IntersectionObserver(([entry]) => { heroVisible = entry.intersectionRatio > 0.35; update(); }, { threshold: [0, 0.35, 1] }).observe(heroSection);
  document.addEventListener('visibilitychange', update);
}

// Open a collapsed section when following a direct link, including old gallery URLs.
function revealHashTarget() {
  const id = window.location.hash.slice(1);
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  const detail = target.closest('details');
  if (detail) {
    detail.open = true;
    target.scrollIntoView();
  }
}
window.addEventListener('hashchange', revealHashTarget);
revealHashTarget();

const galleryPhotos = [...document.querySelectorAll('[data-gallery-photo]')];
const galleryLightbox = document.querySelector('#gallery-lightbox');
if (galleryPhotos.length && typeof galleryLightbox?.showModal === 'function') {
  const galleryImage = galleryLightbox.querySelector('[data-gallery-image]');
  const galleryCaption = galleryLightbox.querySelector('#gallery-lightbox-caption');
  const galleryCounter = galleryLightbox.querySelector('[data-gallery-counter]');
  let galleryIndex = 0;
  let galleryOpener = null;

  function showGalleryPhoto(index) {
    galleryIndex = (index + galleryPhotos.length) % galleryPhotos.length;
    const photo = galleryPhotos[galleryIndex];
    const thumbnail = photo.querySelector('img');
    galleryImage.src = photo.href;
    galleryImage.alt = thumbnail.alt;
    galleryImage.width = Number(thumbnail.getAttribute('width'));
    galleryImage.height = Number(thumbnail.getAttribute('height'));
    galleryCaption.textContent = thumbnail.alt;
    galleryCounter.textContent = `${String(galleryIndex + 1).padStart(2, '0')} / ${String(galleryPhotos.length).padStart(2, '0')}`;
  }

  galleryPhotos.forEach((photo, index) => {
    photo.setAttribute('aria-haspopup', 'dialog');
    photo.setAttribute('aria-controls', 'gallery-lightbox');
    photo.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      galleryOpener = photo;
      showGalleryPhoto(index);
      galleryLightbox.showModal();
      document.documentElement.classList.add('gallery-open');
    });
  });
  galleryLightbox.querySelector('[data-gallery-close]').addEventListener('click', () => galleryLightbox.close());
  galleryLightbox.querySelector('[data-gallery-prev]').addEventListener('click', () => showGalleryPhoto(galleryIndex - 1));
  galleryLightbox.querySelector('[data-gallery-next]').addEventListener('click', () => showGalleryPhoto(galleryIndex + 1));
  galleryLightbox.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showGalleryPhoto(galleryIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  galleryLightbox.addEventListener('click', (event) => {
    if (event.target !== galleryLightbox) return;
    const bounds = galleryLightbox.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) galleryLightbox.close();
  });
  galleryLightbox.addEventListener('close', () => {
    document.documentElement.classList.remove('gallery-open');
    galleryOpener?.focus({ preventScroll: true });
  });
}

const contactForm = document.querySelector('#contact-form');
const contactStatus = document.querySelector('#contact-status');
const contactSubmit = document.querySelector('#contact-submit');
const preferredContact = document.querySelector('#preferred-contact');
const replyDetailField = document.querySelector('#reply-detail-field');
const replyDetail = document.querySelector('#reply-detail');
const replyDetailLabel = document.querySelector('#reply-detail-label');
const replyDetailHint = document.querySelector('#reply-detail-hint');

function updateReplyDetails() {
  if (!preferredContact || !replyDetail) return;
  const channel = preferredContact.value;
  const needsDetail = channel !== 'Email';
  replyDetailField.hidden = !needsDetail;
  replyDetail.disabled = !needsDetail;
  replyDetail.required = needsDetail;
  replyDetail.type = channel === 'WhatsApp' ? 'tel' : 'text';
  replyDetail.autocomplete = channel === 'WhatsApp' ? 'tel' : 'off';
  replyDetailLabel.textContent = channel === 'WhatsApp' ? 'WhatsApp number' : 'Telegram username';
  replyDetailHint.textContent = channel === 'WhatsApp' ? 'Include your country code, for example +63.' : 'Enter the @username where I can reach you.';
  replyDetail.setAttribute('aria-describedby', 'reply-detail-hint');
}
preferredContact?.addEventListener('change', () => {
  replyDetail.value = '';
  updateReplyDetails();
});
updateReplyDetails();

contactForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!contactForm.reportValidity()) return;
  if (contactSubmit.disabled) return;

  contactSubmit.disabled = true;
  contactSubmit.textContent = 'Sending…';
  contactStatus.textContent = 'Sending your inquiry…';
  contactStatus.dataset.state = 'sending';

  try {
    const response = await fetch('https://formsubmit.co/ajax/rechceltoledo@gmail.com', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(contactForm).entries())),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok || (result.success !== true && result.success !== 'true')) throw new Error('Submission failed');

    contactForm.reset();
    updateReplyDetails();
    contactStatus.textContent = 'Message sent. I’ll get back to you soon.';
    contactStatus.dataset.state = 'success';
    document.dispatchEvent(new CustomEvent('portfolio:inquiry-sent'));
  } catch {
    contactStatus.textContent = 'Could not send right now. Use Email or WhatsApp instead.';
    contactStatus.dataset.state = 'error';
  } finally {
    contactSubmit.disabled = false;
    contactSubmit.innerHTML = 'Send message <svg class="arrow-icon" data-direction="up-right" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10" /></svg>';
  }
});
