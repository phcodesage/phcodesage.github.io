const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');

menuToggle?.addEventListener('click', () => {
  const isOpen = siteNav.classList.contains('hidden');
  siteNav.classList.toggle('hidden', !isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

siteNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    siteNav.classList.add('hidden');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

const filterButtons = document.querySelectorAll('[data-filter]');
const projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle('is-active', isActive);
      item.classList.toggle('bg-black', isActive);
      item.classList.toggle('text-white', isActive);
      item.classList.toggle('text-black/55', !isActive);
    });

    projectCards.forEach((card) => {
      const categories = card.dataset.category?.split(' ') ?? [];
      const shouldShow = filter === 'all' || categories.includes(filter);
      card.classList.toggle('hidden', !shouldShow);
    });
  });
});

const revealItems = document.querySelectorAll('.reveal');
const revealHiddenClasses = ['opacity-0', 'translate-y-6'];
const revealVisibleClasses = ['opacity-100', 'translate-y-0'];

function revealItem(item) {
  item.classList.remove(...revealHiddenClasses);
  item.classList.add(...revealVisibleClasses);
}

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      revealItem(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach(revealItem);
}
