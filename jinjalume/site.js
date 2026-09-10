const menuButton = document.querySelector('[data-menu-toggle]');
const mobileMenu = document.querySelector('[data-mobile-menu]');

if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    mobileMenu.classList.toggle('hidden', isOpen);
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open navigation');
      mobileMenu.classList.add('hidden');
    });
  });
}

document.querySelectorAll('[data-copy]').forEach((copyButton) => {
  copyButton.addEventListener('click', async () => {
    const source = document.getElementById(copyButton.dataset.copy);
    if (!source) return;

    try {
      await navigator.clipboard.writeText(source.innerText);
      const originalLabel = copyButton.textContent;
      copyButton.textContent = 'Copied ✓';
      window.setTimeout(() => { copyButton.textContent = originalLabel; }, 1600);
    } catch {
      copyButton.textContent = 'Select to copy';
    }
  });
});

document.querySelectorAll('[data-open-dialog]').forEach((openButton) => {
  openButton.addEventListener('click', () => {
    const dialog = document.getElementById(openButton.dataset.openDialog);
    if (dialog?.showModal) dialog.showModal();
  });
});

const revealItems = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
