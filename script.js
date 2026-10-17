const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const themeToggle = document.querySelector('#theme-toggle');
const themeIcon = document.querySelector('[data-theme-icon]');
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  themeIcon.textContent = dark ? '☀' : '☾';
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.content = dark ? '#232129' : '#faf7f2';
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

// Opus Full-Screen Violet Menu Overlay
const siteHeader = document.querySelector('.site-header');
const menuToggle = document.querySelector('#menu-toggle');
const menuOverlay = document.querySelector('#opus-menu-overlay');
const menuLabel = document.querySelector('[data-menu-label]');
let lenisInstance = null;

function setMenuOpen(open) {
  if (!siteHeader || !menuToggle || !menuOverlay) return;
  if (open) {
    siteHeader.dataset.menuOpen = 'true';
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close navigation menu');
    menuOverlay.setAttribute('aria-hidden', 'false');
    if (menuLabel) menuLabel.textContent = 'Close';
    lenisInstance?.stop();
  } else {
    siteHeader.dataset.menuOpen = 'false';
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation menu');
    menuOverlay.setAttribute('aria-hidden', 'true');
    if (menuLabel) menuLabel.textContent = 'Menu';
    lenisInstance?.start();
  }
}

if (menuToggle && siteHeader && menuOverlay) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteHeader.dataset.menuOpen === 'true';
    setMenuOpen(!isOpen);
  });
  document.querySelectorAll('[data-menu-close]').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && siteHeader.dataset.menuOpen === 'true') {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });
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

// Opus Scroll-Driven Animations & Word-by-Word Opacity Scrubbing
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const scrollWordBlocks = [...document.querySelectorAll('[data-scroll-words]')].map((el) => {
  const rawText = el.textContent.trim().replace(/\s+/g, ' ');
  const words = rawText.split(' ');
  el.textContent = '';
  const spans = words.map((word, index) => {
    const span = document.createElement('span');
    span.className = 'scroll-word';
    span.textContent = word;
    el.appendChild(span);
    if (index < words.length - 1) {
      el.appendChild(document.createTextNode(' '));
    }
    return span;
  });
  return { el, spans };
});

const serviceRows = [...document.querySelectorAll('[data-service-row]')];
serviceRows.forEach((row) => {
  const toggleRow = () => {
    const isAlreadyActive = row.dataset.active === 'true';
    serviceRows.forEach((other) => {
      if (other === row && !isAlreadyActive) {
        other.dataset.active = 'true';
        other.setAttribute('aria-expanded', 'true');
      } else {
        other.dataset.active = 'false';
        other.setAttribute('aria-expanded', 'false');
      }
    });
  };
  row.addEventListener('click', toggleRow);
  row.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleRow();
    }
  });
});

// Opus Process Horizontal Expanding Cards
const processCards = [...document.querySelectorAll('[data-process-card]')];
processCards.forEach((card) => {
  const activateCard = () => {
    processCards.forEach((other) => {
      other.dataset.active = other === card ? 'true' : 'false';
    });
  };
  card.addEventListener('click', activateCard);
  card.addEventListener('mouseenter', activateCard);
  card.addEventListener('focusin', activateCard);
});

// Opus Collaboration / Cadence Switch
const cadenceSwitch = document.querySelector('#cadence-switch');
const cadenceLabels = [...document.querySelectorAll('[data-cadence-label]')];
const cadencePrices = [...document.querySelectorAll('[data-price-sprint][data-price-ongoing]')];

function setCadenceMode(ongoing) {
  if (!cadenceSwitch) return;
  cadenceSwitch.setAttribute('aria-checked', String(ongoing));
  cadenceLabels.forEach((label) => {
    const mode = label.getAttribute('data-cadence-label');
    const active = (ongoing && mode === 'ongoing') || (!ongoing && mode === 'sprint');
    label.classList.toggle('active', active);
    label.classList.toggle('is-active', active);
  });
  cadencePrices.forEach((priceEl) => {
    priceEl.textContent = ongoing
      ? priceEl.getAttribute('data-price-ongoing')
      : priceEl.getAttribute('data-price-sprint');
  });
}

if (cadenceSwitch) {
  cadenceSwitch.addEventListener('click', () => {
    const isOngoing = cadenceSwitch.getAttribute('aria-checked') === 'true';
    setCadenceMode(!isOngoing);
  });
  cadenceLabels.forEach((label) => {
    label.addEventListener('click', () => {
      setCadenceMode(label.getAttribute('data-cadence-label') === 'ongoing');
    });
  });
}

// Opus Stewardship Glassmorphism Carousel
const stewardshipSlides = [
  {
    quote:
      'Building real-time messaging, WebRTC voice and video calling, and live user presence at scale—keeping remote teams and Filipino talent connected every day.',
    role: 'Software Developer · Real-Time Systems (2023 — Present)',
    org: 'Onlinejobs.ph',
    img: 'assets/about/rechcel-at-the-desk.webp',
    alt: 'Rechcel working at his desk',
  },
  {
    quote:
      'Development and ongoing technical stewardship for an education and test-prep platform in New York—keeping enrollment, schedules, and student workflows fast and dependable.',
    role: 'Client Work & Platform Stewardship',
    org: 'Exceed Learning Center',
    img: 'assets/projects/exceed.webp',
    alt: 'Exceed Learning Center education website',
  },
  {
    quote:
      'A thoughtful digital home for healing and empowerment coaching, maintained with care so every program launch, booking flow, and resource page feels effortless.',
    role: 'Client Work & Long-Term Care',
    org: 'Unbreakable You',
    img: 'assets/projects/unbreakable-you.webp',
    alt: 'Unbreakable You coaching website',
  },
];

const testimonialQuote = document.querySelector('#testimonial-quote');
const testimonialRole = document.querySelector('#testimonial-role');
const testimonialOrg = document.querySelector('#testimonial-name');
const testimonialBackdropImg = document.querySelector('.testimonial-bg-image');
const testimonialProgressBar = document.querySelector('#testimonial-progress-bar');
const testimonialPrev = document.querySelector('[data-testimonial-prev]');
const testimonialNext = document.querySelector('[data-testimonial-next]');
let testimonialIndex = 0;

function renderTestimonial(index) {
  testimonialIndex = (index + stewardshipSlides.length) % stewardshipSlides.length;
  const slide = stewardshipSlides[testimonialIndex];
  if (testimonialQuote) testimonialQuote.textContent = slide.quote;
  if (testimonialRole) testimonialRole.textContent = slide.role;
  if (testimonialOrg) testimonialOrg.textContent = slide.org;
  if (testimonialBackdropImg) {
    testimonialBackdropImg.src = slide.img;
    testimonialBackdropImg.alt = slide.alt;
  }
  if (testimonialProgressBar) {
    const pct = ((testimonialIndex + 1) / stewardshipSlides.length) * 100;
    testimonialProgressBar.style.width = `${pct.toFixed(2)}%`;
  }
}

testimonialPrev?.addEventListener('click', () => renderTestimonial(testimonialIndex - 1));
testimonialNext?.addEventListener('click', () => renderTestimonial(testimonialIndex + 1));

// IntersectionObserver for Reveal Elements & Project Cards
const revealTargets = [
  ...document.querySelectorAll('[data-scroll-reveal]'),
  ...document.querySelectorAll('[data-scroll-card]'),
];

if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
  revealTargets.forEach((el) => el.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }
  );
  revealTargets.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95) {
      el.classList.add('is-visible');
    }
    revealObserver.observe(el);
  });
}

// Continuous Scroll Scrubbing (Word-by-word Vision text, Service Row brightness, Expanding Know Banner, Hero Pill Parallax)
const parallaxMedia = document.querySelector('[data-parallax-media]');
const expandBanner = document.querySelector('[data-scroll-expand]');

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateScrollAnimations() {
  if (prefersReducedMotion.matches) {
    scrollWordBlocks.forEach(({ spans }) => {
      spans.forEach((span) => span.style.setProperty('--word-opacity', '1'));
    });
    serviceRows.forEach((row) => row.style.setProperty('--row-opacity', '1'));
    return;
  }

  const vh = window.innerHeight || 1;

  // 1. Word-by-word opacity scrubbing on [data-scroll-words]
  scrollWordBlocks.forEach(({ el, spans }) => {
    const rect = el.getBoundingClientRect();
    const start = vh * 0.88;
    const end = vh * 0.22;
    const totalProgress = clamp((start - rect.top) / Math.max(1, start - end + rect.height * 0.45), 0, 1);
    const count = spans.length || 1;
    spans.forEach((span, idx) => {
      const wordStart = (idx / count) * 0.72;
      const wordEnd = wordStart + 0.28;
      const local = clamp((totalProgress - wordStart) / (wordEnd - wordStart), 0, 1);
      const opacity = 0.2 + local * 0.8;
      span.style.setProperty('--word-opacity', opacity.toFixed(3));
    });
  });

  // 2. Service row scroll brightness
  serviceRows.forEach((row) => {
    const rect = row.getBoundingClientRect();
    const center = rect.top + rect.height * 0.5;
    const distFromFocus = Math.abs(center - vh * 0.52) / (vh * 0.55);
    const opacity = row.dataset.active === 'true' ? 1 : clamp(1.05 - distFromFocus * 0.55, 0.42, 1);
    row.style.setProperty('--row-opacity', opacity.toFixed(3));
  });

  // 3. Expanding "or get to know me first!" banner
  if (expandBanner) {
    const rect = expandBanner.getBoundingClientRect();
    const progress = clamp((vh * 0.92 - rect.top) / (vh * 0.65), 0, 1);
    const scale = 0.94 + progress * 0.06;
    const radius = Math.round(36 - progress * 8);
    expandBanner.style.setProperty('--expand-scale', scale.toFixed(4));
    expandBanner.style.setProperty('--expand-radius', `${radius}px`);
  }

  // 4. Subtle parallax on hero wave canvas
  if (parallaxMedia) {
    const rect = parallaxMedia.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < vh) {
      const shift = clamp((vh * 0.5 - rect.top) * 0.035, -12, 12);
      parallaxMedia.style.transform = `translateY(${shift.toFixed(1)}px)`;
    }
  }
}

if (typeof window.Lenis === 'function' && !prefersReducedMotion.matches) {
  lenisInstance = new window.Lenis({
    autoRaf: true,
    lerp: 0.1,
    smoothWheel: true,
    anchors: true,
  });
  window.lenis = lenisInstance;
  lenisInstance.on('scroll', updateScrollAnimations);
}

let scrollTicking = false;
window.addEventListener(
  'scroll',
  () => {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(() => {
        updateScrollAnimations();
        scrollTicking = false;
      });
    }
  },
  { passive: true }
);
window.addEventListener('resize', updateScrollAnimations, { passive: true });
updateScrollAnimations();

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
