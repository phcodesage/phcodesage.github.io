export const PROJECTS = {
  'clara-health': 'Clara Health',
  tawaflick: 'Tawaflick',
  'sage-cinema': 'Sage Cinema',
  bugnaw: 'Bugnaw Aircon Care',
  'cookie-checkpoint': 'Cookie Checkpoint',
  'unban-discord': 'Unban Discord Now',
  exceed: 'Exceed Learning Center',
  'unbreakable-you': 'Unbreakable You',
  jinjalume: 'Jinjalume',
  'mermail-skills': 'Mermail Skills',
  'causify-helpers': 'Causify Helpers',
  yawp: 'yawp',
  issueanvil: 'IssueAnvil',
  swiftpos: 'SwiftPOS',
  'sagemovies-tui': 'SageMovies TUI',
  virex: 'Virex',
  beamly: 'Beamly',
  'codesage-orchestrator': 'CodeSage Orchestrator',
  remotex: 'RemoteX',
  'sage-movies': 'Sage Movies',
};

export const PAGE_PROJECTS = {
  '/case-studies/clara-health.html': 'clara-health',
  '/case-studies/tawaflick.html': 'tawaflick',
  '/case-studies/sage-cinema.html': 'sage-cinema',
  '/case-studies/cookie-checkpoint.html': 'cookie-checkpoint',
  '/case-studies/exceed-learning-center.html': 'exceed',
  '/case-studies/unbreakable-you.html': 'unbreakable-you',
  '/case-studies/jinjalume.html': 'jinjalume',
  '/jinjalume/': 'jinjalume',
};

export const PATHS = new Set(['/', '/resume.html', ...Object.keys(PAGE_PROJECTS)]);
export const CONTACT_TARGETS = new Set(['email', 'whatsapp', 'telegram', 'section', 'form_attempt', 'form_sent']);
export const PROJECT_TARGETS = new Set(['case-study', 'live-demo', 'source', 'project-link']);
export const NAVIGATION_TARGETS = new Set(['resume', 'work', 'companies', 'about', 'top']);
export const SOURCES = new Set(['card', 'archive', 'case-study', 'gallery', 'navigation', 'contact', 'other']);
