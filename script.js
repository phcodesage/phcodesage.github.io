document.documentElement.classList.add('js');

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

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

const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileMenu = document.querySelector('[data-mobile-menu]');

function closeMenu({ restoreFocus = false } = {}) {
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Open navigation');
  if (menuToggle) menuToggle.textContent = '☰';
  mobileMenu?.classList.add('hidden');
  if (restoreFocus) menuToggle?.focus();
}

menuToggle?.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  mobileMenu?.classList.toggle('hidden', isOpen);
  menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
  menuToggle.textContent = isOpen ? '☰' : '×';
});

mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    closeMenu();
    const target = link.hash && document.querySelector(link.hash);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
    closeMenu({ restoreFocus: true });
  }
});
document.addEventListener('click', (event) => {
  if (!mobileMenu?.contains(event.target) && !menuToggle?.contains(event.target)) closeMenu();
});
window.matchMedia('(min-width: 1024px)').addEventListener('change', () => closeMenu());

const progress = document.querySelector('#scroll-progress');
const updateProgress = () => {
  if (!progress) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${scrollable > 0 ? window.scrollY / scrollable : 0})`;
};

window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

const revealItems = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => {
    // Only animate content below the viewport; the first screen stays visible.
    if (item.getBoundingClientRect().top >= window.innerHeight) {
      item.classList.add('reveal-ready');
      revealObserver.observe(item);
    }
  });
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
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
  contactStatus.className = 'text-base text-white/55';

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
    contactStatus.className = 'text-base text-lilac';
  } catch {
    contactStatus.textContent = 'Could not send right now. Use Email or WhatsApp instead.';
    contactStatus.className = 'text-base text-red-300';
  } finally {
    contactSubmit.disabled = false;
    contactSubmit.textContent = 'Send inquiry ↗';
  }
});

// A locally rendered point sculpture: no video, texture downloads, or WebGL runtime.
const orbitCanvas = document.querySelector('#orbit-canvas');
const motionButton = document.querySelector('#motion-toggle');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = motionPreference.matches;
let userMotionChoice = null;
let redrawOrbit = () => {};

function updateMotion() {
  motionPaused = motionPreference.matches || userMotionChoice === true;
  document.documentElement.classList.toggle('motion-paused', motionPaused);
  // Pausing finishes the entrance once; resuming must not hide the headline again.
  if (motionPaused) document.querySelectorAll('.hero-line').forEach(line => { line.style.animation = 'none'; });
  if (motionButton) {
    motionButton.hidden = false;
    motionButton.disabled = motionPreference.matches;
    motionButton.setAttribute('aria-pressed', String(motionPaused));
    motionButton.textContent = motionPreference.matches ? 'Reduced motion' : motionPaused ? 'Resume motion ▷' : 'Pause motion Ⅱ';
  }
  redrawOrbit();
  document.dispatchEvent(new Event('portfolio-motion-change'));
}
motionButton?.addEventListener('click', () => {
  userMotionChoice = !motionPaused;
  updateMotion();
});
motionPreference.addEventListener('change', updateMotion);

if (orbitCanvas) {
  const ctx = orbitCanvas.getContext('2d');
  const hero = document.querySelector('.hero');
  let width = 0;
  let height = 0;
  let frame = 0;
  let phase = 0;
  let lastTime = 0;
  let inView = true;
  let pointerX = 0;
  let pointerY = 0;
  let tiltX = 0;
  let tiltY = 0;
  let heroScroll = 0;
  const rings = 72;
  const segments = 22;
  const points = [];
  for (let i = 0; i < rings; i++) {
    const u = (i / rings) * Math.PI * 2;
    for (let j = 0; j < segments; j++) {
      const v = (j / segments) * Math.PI * 2;
      const tube = .32 + .07 * Math.sin(u * 3);
      const radius = .83 + tube * Math.cos(v);
      points.push({ x: radius * Math.cos(u), y: radius * Math.sin(u), z: tube * Math.sin(v), u, j });
    }
  }
  function draw(time = 0) {
    frame = 0;
    if (!ctx || !width || !height) return;
    const delta = lastTime ? Math.min(time - lastTime, 40) : 0;
    lastTime = time;
    if (!motionPaused) phase += delta * .00012;
    tiltX += (pointerX - tiltX) * .045;
    tiltY += (pointerY - tiltY) * .045;
    ctx.clearRect(0, 0, width, height);
    const angleX = .95 + (motionPaused ? 0 : tiltY * .18);
    const angleY = -.4 + (motionPaused ? 0 : tiltX * .25);
    const angleZ = -.55 + (motionPaused ? 0 : heroScroll * .25);
    const scale = Math.min(width, height) * .34;
    const projected = points.map((p) => {
      const twist = p.u * .65 + phase;
      const px = p.x;
      const py = p.y;
      const pz = p.z + .2 * Math.sin(p.u * 2 + phase);
      const x1 = px * Math.cos(angleY) + pz * Math.sin(angleY);
      const z1 = -px * Math.sin(angleY) + pz * Math.cos(angleY);
      const y1 = py * Math.cos(angleX) - z1 * Math.sin(angleX);
      const z2 = py * Math.sin(angleX) + z1 * Math.cos(angleX);
      const x2 = x1 * Math.cos(angleZ) - y1 * Math.sin(angleZ);
      const y2 = x1 * Math.sin(angleZ) + y1 * Math.cos(angleZ);
      const perspective = 3.6 / (3.6 - z2);
      return { x: width / 2 + x2 * scale * perspective, y: height / 2 + y2 * scale * perspective, depth: z2, light: .5 + .5 * Math.sin(twist + p.j * .11) };
    });
    // Fine lines along the tube give the point cloud a legible, woven structure.
    for (let i = 0; i < projected.length; i++) {
      const a = projected[i];
      const b = projected[(i + segments) % projected.length];
      ctx.strokeStyle = `rgba(255,100,80,${.025 + (a.depth + 1.5) * .026})`;
      ctx.lineWidth = .5;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    projected.sort((a,b)=>a.depth-b.depth);
    for (const p of projected) {
      const near = Math.max(0, Math.min(1, (p.depth + 1.4) / 2.8));
      ctx.fillStyle = `rgba(255,${100 + Math.round(p.light * 105)},${80 + Math.round(p.light * 90)},${.18 + near * .7})`;
      ctx.beginPath();ctx.arc(p.x,p.y,.65 + near * 1.05,0,Math.PI*2);ctx.fill();
    }
    if (!motionPaused && inView && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    lastTime = 0;
    frame = requestAnimationFrame(draw);
  }
  function resize() {
    const bounds = orbitCanvas.getBoundingClientRect();
    width = bounds.width; height = bounds.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    orbitCanvas.width = Math.round(width * dpr);
    orbitCanvas.height = Math.round(height * dpr);
    ctx?.setTransform(dpr,0,0,dpr,0,0);
    schedule();
  }
  hero?.addEventListener('pointermove', (event) => {
    if (motionPaused || event.pointerType !== 'mouse') return;
    const bounds = hero.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / bounds.width - .5;
    pointerY = (event.clientY - bounds.top) / bounds.height - .5;
  }, { passive:true });
  hero?.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;});
  window.addEventListener('scroll', () => {
    if (inView && hero) heroScroll = Math.min(1, window.scrollY / hero.offsetHeight);
  }, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry])=>{
    inView=entry.isIntersecting;
    if(inView) schedule(); else if(frame) {cancelAnimationFrame(frame);frame=0;}
  }).observe(orbitCanvas);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden && frame) {cancelAnimationFrame(frame);frame=0;} else if(inView) schedule();
  });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(orbitCanvas);
  else window.addEventListener('resize',resize);
  redrawOrbit = schedule;
  resize();
}
updateMotion();

const localClock = document.querySelector('[data-local-time]');
function updateLocalClock() {
  if (localClock) localClock.textContent = new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Manila', hour:'2-digit', minute:'2-digit', hour12:false }).format(new Date());
}
updateLocalClock();
if(localClock) window.setInterval(updateLocalClock,60000);

// Scroll scenes follow the native scroll position; no scroll interception or timers.
const scrollScenes = [...document.querySelectorAll('[data-scroll-scene]')];
const scrollHero = document.querySelector('.hero');
let sceneFrame = 0;
function paintScrollScenes() {
  sceneFrame = 0;
  const viewport = window.innerHeight;
  // Read layout first, then write transform variables together.
  const scenes = scrollScenes.map(element => ({ element, rect: element.getBoundingClientRect() }));
  const heroRect = scrollHero?.getBoundingClientRect();
  for (const { element, rect } of scenes) {
    if (rect.bottom < -100 || rect.top > viewport + 100) continue;
    const progress = Math.max(0, Math.min(1, (viewport - rect.top) / (viewport + rect.height)));
    const distance = motionPaused ? 0 : progress - .5;
    element.style.setProperty('--scene-lift', `${distance * -70}px`);
    element.style.setProperty('--scene-tilt', `${distance * -14}deg`);
    element.style.setProperty('--scene-roll', `${distance * 5}deg`);
    element.style.setProperty('--scene-scale', String(motionPaused ? 1 : .91 + progress * .09));
    element.style.setProperty('--word-x', `${distance * -90}px`);
    element.style.setProperty('--chapter-x', `${distance * (window.innerWidth < 640 ? 35 : 140)}px`);
  }
  if (scrollHero && heroRect) {
    const progress = motionPaused ? 0 : Math.max(0, Math.min(1, -heroRect.top / heroRect.height));
    scrollHero.style.setProperty('--beam-shift', `${progress * 100}px`);
    scrollHero.style.setProperty('--orbit-scale', String(1 + progress * .15));
  }
}
function queueScrollScenes() {
  if (!sceneFrame) sceneFrame = requestAnimationFrame(paintScrollScenes);
}
window.addEventListener('scroll', queueScrollScenes, { passive: true });
window.addEventListener('resize', queueScrollScenes);
document.addEventListener('portfolio-motion-change', queueScrollScenes);
window.addEventListener('load', queueScrollScenes);
queueScrollScenes();
