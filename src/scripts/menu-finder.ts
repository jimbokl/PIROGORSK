import { matchesCard, setupCatalogFilters } from './catalog-filters';
import { parseCriteria, type Criteria } from '../lib/catalog-fillings';

const form = document.querySelector<HTMLFormElement>('[data-menu-finder]');
if (form) {
  const reset = form.querySelector<HTMLButtonElement>('[data-menu-reset]')!;
  const status = form.querySelector<HTMLElement>('[data-menu-status]')!;
  const empty = document.querySelector<HTMLElement>('[data-menu-empty]')!;
  const sections = [...document.querySelectorAll<HTMLElement>('[data-menu-section]')];
  let criteria = parseCriteria(location.search);

  function summarize() {
    let total = 0;
    let filtered = Boolean(criteria.query.trim()) || criteria.filling !== 'all';
    for (const section of sections) {
      const count = section.hasAttribute('data-supplier-catalog')
        ? Number(section.dataset.matchCount ?? section.querySelectorAll('[data-supplier-id]').length)
        : section.querySelectorAll('[data-menu-product]:not([hidden])').length;
      total += count;
      filtered ||= section.dataset.searchActive === 'true';
      // Keep a local empty state reachable when only that section is filtered.
      section.hidden = (Boolean(criteria.query.trim()) || criteria.filling !== 'all') && count === 0;
      const link = document.querySelector<HTMLAnchorElement>(`[data-menu-jump="${section.id}"]`);
      if (link) {
        link.hidden = section.hidden;
        link.querySelector('[data-menu-section-count]')!.textContent = String(count);
      }
    }
    status.textContent = `Позиций по вашему выбору: ${total}`;
    empty.hidden = total > 0;
    reset.hidden = !filtered;
  }

  function search(next: Criteria, mode: 'push' | 'replace' | 'read') {
    criteria = next;
    for (const card of document.querySelectorAll<HTMLElement>('[data-menu-product]')) {
      card.hidden = !matchesCard(card, criteria);
    }
    document.dispatchEvent(new CustomEvent('pirogorsk:menu-search', { detail: { ...criteria, restoreGroup: mode === 'read' } }));
    summarize();
    return sections.reduce((sum, section) => sum + (section.hasAttribute('data-supplier-catalog') ? Number(section.dataset.matchCount ?? 0) : section.querySelectorAll('[data-menu-product]:not([hidden])').length), 0);
  }

  document.addEventListener('pirogorsk:catalog-updated', summarize);
  setupCatalogFilters(form, 'menu', search);
  form.addEventListener('submit', event => {
    event.preventDefault();
    sections.find(section => !section.hidden && Number(section.dataset.matchCount ?? section.querySelectorAll('[data-menu-product]:not([hidden])').length) > 0)?.scrollIntoView({ block: 'start' });
  });
  summarize();

  // Keep the current section apparent while browsing the continuous catalogue.
  const jumps = [...document.querySelectorAll<HTMLAnchorElement>('[data-menu-jump]')];
  let scheduled = false;
  const markSection = () => {
    scheduled = false;
    const visible = sections.filter(section => !section.hidden);
    const active = visible.filter(section => section.getBoundingClientRect().top <= 150).at(-1) ?? visible[0];
    jumps.forEach(link => {
      if (active?.id === link.dataset.menuJump) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(markSection); } };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  document.addEventListener('pirogorsk:catalog-updated', schedule);
  markSection();
}
