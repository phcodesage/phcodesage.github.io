const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');

menuToggle?.addEventListener('click', () => {
  const isOpen = siteNav.classList.contains('hidden');
  siteNav.classList.toggle('hidden', !isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

const navItems = document.querySelectorAll('[data-view-target]');
const viewPanels = document.querySelectorAll('[data-view-panel]');
const validViews = new Set([...viewPanels].map((panel) => panel.dataset.viewPanel));

function revealPanel(panel) {
  panel.querySelectorAll('.reveal').forEach((item) => {
    item.classList.remove('opacity-0', 'translate-y-6');
    item.classList.add('opacity-100', 'translate-y-0');
  });
}

function activateView(view, updateUrl = true) {
  const nextView = validViews.has(view) ? view : 'home';

  viewPanels.forEach((panel) => {
    const isActive = panel.dataset.viewPanel === nextView;
    panel.classList.toggle('hidden', !isActive);
    panel.classList.toggle('flex', isActive && panel.dataset.viewPanel !== 'about');
    panel.classList.toggle('grid', isActive && panel.dataset.viewPanel === 'about');
    revealPanel(panel);
  });

  navItems.forEach((item) => {
    if (!item.classList.contains('nav-item')) return;
    const isActive = item.dataset.viewTarget === nextView;
    item.classList.toggle('bg-black', isActive && nextView !== 'contact');
    item.classList.toggle('text-white', isActive && nextView !== 'contact');
    item.classList.toggle('text-black/60', !isActive || nextView === 'contact');
    item.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  if (updateUrl) {
    window.history.replaceState(null, '', nextView === 'home' ? '#' : `#${nextView}`);
  }

  siteNav?.classList.add('hidden');
  menuToggle?.setAttribute('aria-expanded', 'false');
}

navItems.forEach((item) => {
  item.addEventListener('click', () => activateView(item.dataset.viewTarget));
});

window.addEventListener('hashchange', () => activateView(window.location.hash.slice(1), false));

const filterButtons = document.querySelectorAll('[data-filter]');
const projectCards = document.querySelectorAll('.project-card');
const workSetButtons = document.querySelectorAll('[data-work-set]');
const workGrids = document.querySelectorAll('[data-work-grid]');

function styleToggle(item, isActive) {
  item.classList.toggle('bg-black', isActive);
  item.classList.toggle('bg-white', !isActive);
  item.classList.toggle('text-white', isActive);
  item.classList.toggle('text-black/60', !isActive);
  item.classList.toggle('border', !isActive);
  item.classList.toggle('border-black/15', !isActive);
  item.classList.toggle('hover:text-white', isActive);
  item.classList.toggle('hover:text-black', !isActive);
  item.setAttribute('aria-pressed', String(isActive));
}

let activeFilter = 'all';

function applyFilter(filter) {
  activeFilter = filter;

  filterButtons.forEach((item) => styleToggle(item, item.dataset.filter === filter));

  projectCards.forEach((card) => {
    const categories = card.dataset.category?.split(' ') ?? [];
    const shouldShow = filter === 'all' || categories.includes(filter);
    card.classList.toggle('hidden', !shouldShow);
  });
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => applyFilter(button.dataset.filter));
});

workSetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const workSet = button.dataset.workSet;
    workGrids.forEach((grid) => grid.classList.toggle('hidden', grid.dataset.workGrid !== workSet));
    workSetButtons.forEach((item) => styleToggle(item, item === button));
    applyFilter('all');
  });
});

const revealItems = document.querySelectorAll('.reveal');
const revealHiddenClasses = ['opacity-0', 'translate-y-6'];
const revealVisibleClasses = ['opacity-100', 'translate-y-0'];

function revealItem(item) {
  item.classList.remove(...revealHiddenClasses);
  item.classList.add(...revealVisibleClasses);
}

revealItems.forEach(revealItem);

activateView(window.location.hash.slice(1), false);
