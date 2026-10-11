const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const themeToggle = document.querySelector('#theme-toggle');
const themeIcon = document.querySelector('[data-theme-icon]');
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  themeIcon.textContent = dark ? '☀' : '☾';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#232129' : '#faf7f2';
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
  } catch {
    contactStatus.textContent = 'Could not send right now. Use Email or WhatsApp instead.';
    contactStatus.dataset.state = 'error';
  } finally {
    contactSubmit.disabled = false;
    contactSubmit.textContent = 'Send message ↗';
  }
});
