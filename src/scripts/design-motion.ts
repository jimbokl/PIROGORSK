// The page and its first scene work without JavaScript. All movement is optional.
const hero = document.querySelector<HTMLElement>('[data-tasting-hero]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motion = new Set<Animation>();
function animate(element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) {
  if (reducedMotion.matches || document.hidden) return;
  const animation = element.animate(frames, options);
  motion.add(animation);
  animation.finished.catch(() => {}).finally(() => motion.delete(animation));
}

if (hero) {
  const art = hero.querySelector<HTMLElement>('[data-tasting-art]');
  const scenes = [...hero.querySelectorAll<HTMLElement>('[data-tasting-scene]')];
  const controls = [...hero.querySelectorAll<HTMLButtonElement>('[data-tasting-select]')];
  let request = 0;
  for (const [index, button] of controls.entries()) {
    button.addEventListener('click', async () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      const currentRequest = ++request;
      const scene = scenes.find(item => item.dataset.tastingScene === button.dataset.tastingSelect);
      if (!scene) return;
      const image = scene.querySelector('img');
      // Hidden lazy pictures are fetched only when the visitor requests a flavor.
      if (image) {
        image.loading = 'eager';
        try { await image.decode(); } catch { return; }
      }
      if (currentRequest !== request) return;
      for (const item of scenes) {
        item.hidden = item !== scene;
        item.querySelector('a')?.setAttribute('tabindex', item === scene ? '0' : '-1');
      }
      for (const item of controls) item.setAttribute('aria-pressed', String(item === button));
      hero.dataset.flavor = button.dataset.tastingSelect;
      const title = hero.querySelector<HTMLAnchorElement>('[data-tasting-title]');
      const note = hero.querySelector('[data-tasting-note]');
      const count = hero.querySelector('[data-tasting-count]');
      if (title) { title.textContent = button.dataset.name ?? ''; title.href = button.dataset.href ?? '#pirogi'; }
      if (note) note.textContent = button.dataset.note ?? '';
      if (count) count.textContent = `0${index + 1} / 03`;
      animate(scene, [
        { opacity: 0, transform: 'translate(24px, 16px) rotate(5deg) scale(.94)' },
        { opacity: 1, transform: 'translate(0, 0) rotate(0deg) scale(1)' },
      ], { duration: 620, easing: 'cubic-bezier(.16,1,.3,1)' });
    });
  }

  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let bounds: DOMRect | undefined;
  let frame = 0;
  hero.addEventListener('pointerenter', () => { bounds = hero.getBoundingClientRect(); });
  hero.addEventListener('pointermove', event => {
    if (!art || !bounds || reducedMotion.matches || !pointer.matches) return;
    const x = ((event.clientX - bounds.left) / bounds.width - .5) * 16;
    const y = ((event.clientY - bounds.top) / bounds.height - .5) * 12;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      hero.style.setProperty('--hero-x', `${x.toFixed(1)}px`);
      hero.style.setProperty('--hero-y', `${y.toFixed(1)}px`);
    });
  });
  hero.addEventListener('pointerleave', () => {
    cancelAnimationFrame(frame);
    hero.style.setProperty('--hero-x', '0px'); hero.style.setProperty('--hero-y', '0px');
  });
}

// Keep content visible in CSS: a script/network failure can never hide the menu.
const cards = document.querySelectorAll<HTMLElement>('.catalog-card--pie, .occasion-card, .home-journal > header');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      animate(entry.target, [{ opacity: .35, transform: 'translateY(26px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: 650, easing: 'cubic-bezier(.16,1,.3,1)',
      });
    }
  }, { threshold: .08 });
  for (const card of cards) {
    if (card.getBoundingClientRect().top > window.innerHeight) observer.observe(card);
  }
}

function finishMotion() {
  for (const animation of motion) animation.finish();
  // Also finish the finite CSS introduction when motion is disabled or tab hidden.
  hero?.getAnimations({ subtree: true }).forEach(animation => {
    if (animation.playState === 'running') animation.finish();
  });
}
document.addEventListener('visibilitychange', () => { if (document.hidden) finishMotion(); });
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishMotion(); });
