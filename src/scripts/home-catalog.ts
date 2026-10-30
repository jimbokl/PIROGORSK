/** Progressive presentation only: the complete catalogue and links are in SSR HTML. */
const feed = document.querySelector<HTMLElement>('[data-home-catalog]');
const nav = document.querySelector<HTMLElement>('[data-home-catalog-nav]');
const more = document.querySelector<HTMLButtonElement>('[data-home-more]');
const moreWrap = document.querySelector<HTMLElement>('[data-home-more-wrap]');
if (feed && nav && more && moreWrap) {
  const cards = Array.from(feed.querySelectorAll<HTMLElement>('[data-product]'));
  const groups = Array.from(feed.querySelectorAll<HTMLElement>('[data-home-group]'));
  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('[data-home-category]'));
  const status = document.querySelector<HTMLElement>('[data-home-catalog-status]')!;
  const batch = 12;
  let limit = batch;
  let active = '';
  let observer: IntersectionObserver | undefined;
  const behavior = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' as const : 'smooth' as const;

  function markActive(id: string) {
    if (active === id) return;
    active = id;
    links.forEach(link => {
      if (link.dataset.homeCategory === id) {
        link.setAttribute('aria-current', 'location');
        // Scroll only the horizontal rail, never the document or keyboard focus.
        const left = link.offsetLeft - nav!.offsetLeft;
        if (left < nav!.scrollLeft || left + link.offsetWidth > nav!.scrollLeft + nav!.clientWidth) {
          nav!.scrollTo({ left: left - 12, behavior: behavior() });
        }
      } else link.removeAttribute('aria-current');
    });
  }
  function render() {
    cards.forEach((card, i) => { card.hidden = i >= limit; });
    groups.forEach(group => { group.hidden = !group.querySelector('[data-product]:not([hidden])'); });
    const remaining = Math.max(0, cards.length - limit);
    status.textContent = `Показано ${Math.min(limit, cards.length)} из ${cards.length} позиций`;
    more!.hidden = remaining === 0;
    more!.textContent = `Показать ещё ${Math.min(batch, remaining)}`;
    observer?.disconnect();
    if (remaining) observer?.observe(more!);
  }
  function reveal(target: HTMLElement) {
    const group = target.closest<HTMLElement>('[data-home-group]');
    if (group) {
      const first = target.matches('[data-product]') ? target : group.querySelector<HTMLElement>('[data-product]')!;
      limit = Math.max(limit, cards.indexOf(first) + batch);
      render();
      markActive(group.id);
    }
  }
  function goToHash(instant = false) {
    let id: string;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    // Keep lower-page anchors stable while new catalogue batches are revealed.
    if (target.closest('[data-home-group]')) reveal(target);
    else if (id !== 'top' && id !== 'pirogi') { limit = cards.length; render(); }
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: instant ? 'instant' : behavior() }));
  }
  nav.addEventListener('click', event => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    goToHash();
  });
  more.addEventListener('click', () => {
    const first = cards[Math.min(limit, cards.length - 1)];
    limit += batch;
    render();
    first?.querySelector<HTMLAnchorElement>('a')?.focus();
  });
  document.addEventListener('pirogorsk:reveal-product', event => {
    const id = (event as CustomEvent<string>).detail;
    const card = cards.find(card => card.dataset.product === id);
    if (card) reveal(card);
  });
  window.addEventListener('hashchange', () => goToHash(true));
  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const edge = nav!.getBoundingClientRect().bottom + 64;
      let current = groups[0]!;
      for (const group of groups) {
        if (!group.hidden && group.getBoundingClientRect().top <= edge) current = group;
      }
      markActive(current.id);
    });
  }, { passive: true });
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && limit < cards.length) {
        limit += batch;
        render();
      }
    }, { rootMargin: '0px 0px 700px 0px' });
  }
  moreWrap.hidden = false;
  render();
  markActive(groups[0]!.id);
  if (location.hash && location.hash !== '#pirogi') goToHash(true);
}
export {};
