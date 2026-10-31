const scene = document.querySelector<HTMLElement>('[data-pie-motion]');
if (scene) {
  const control = scene.querySelector<HTMLButtonElement>('[data-pie-replay]')!;
  const label = scene.querySelector<HTMLElement>('[data-pie-control-label]')!;
  const food = scene.querySelector<HTMLElement>('[data-pie-food]')!;
  const slice = scene.querySelector<HTMLElement>('[data-pie-slice]')!;
  const shadow = scene.querySelector<HTMLElement>('[data-pie-shadow]')!;
  const brush = scene.querySelector<HTMLElement>('[data-pie-brush]')!;
  const glaze = scene.querySelector<HTMLElement>('[data-pie-glaze]')!;
  const steam = scene.querySelector<SVGElement>('[data-pie-steam]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let animations: Animation[] = [];
  let state: 'ready' | 'playing' | 'paused' | 'done' = 'ready';
  let resumeWhenVisible = false;
  let inView = false;
  let generation = 0;

  function setState(next: typeof state) {
    state = next;
    scene!.dataset.motionState = next;
    label.textContent = next === 'playing' ? 'Остановить анимацию' : next === 'paused' ? 'Продолжить анимацию' : 'Посмотреть ещё раз';
  }
  function finish() {
    generation++;
    animations.forEach(animation => animation.cancel());
    animations = [];
    resumeWhenVisible = false;
    setState('done');
  }
  function pause(automatic = false) {
    if (state !== 'playing') return;
    animations.forEach(animation => animation.pause());
    resumeWhenVisible = automatic;
    setState('paused');
  }
  function resume() {
    if (reduced.matches || document.hidden || !inView || state !== 'paused') return;
    animations.forEach(animation => animation.play());
    resumeWhenVisible = false;
    setState('playing');
  }
  async function play() {
    finish();
    if (reduced.matches) return;
    const run = generation;
    const images = Array.from(scene!.querySelectorAll('img'));
    await Promise.all(images.map(image => image.decode().catch(() => undefined)));
    if (run !== generation || reduced.matches || document.hidden || !inView) return;
    setState('playing');
    const duration = 4400;
    const animate = (element: Element, keyframes: Keyframe[]) => {
      const animation = element.animate(keyframes, { duration, easing: 'linear', fill: 'both' });
      animations.push(animation);
      return animation;
    };
    const landing = animate(food, [
      { offset: 0, transform: 'translateY(-28%) scale(1.07) rotate(-5deg)', opacity: 0, easing: 'cubic-bezier(.4,0,.8,.6)' },
      { offset: .13, transform: 'translateY(1.5%) scale(1.015,.98) rotate(0deg)', opacity: 1, easing: 'ease-out' },
      { offset: .19, transform: 'translateY(-1.8%) scale(.995,1.01)', opacity: 1, easing: 'ease-in-out' },
      { offset: .25, transform: 'translateY(0) scale(1)', opacity: 1 },
      { offset: 1, transform: 'translateY(0) scale(1)', opacity: 1 },
    ]);
    animate(shadow, [
      { offset: 0, opacity: .1, transform: 'scale(.7)', easing: 'ease-in' },
      { offset: .13, opacity: 1, transform: 'scale(1.04)', easing: 'ease-out' },
      { offset: .25, opacity: 1, transform: 'scale(1)' },
      { offset: 1, opacity: 1, transform: 'scale(1)' },
    ]);
    animate(slice, [
      { offset: 0, transform: 'translate(0,0) rotate(0deg)' },
      { offset: .77, transform: 'translate(0,0) rotate(0deg)', easing: 'cubic-bezier(.16,1,.3,1)' },
      { offset: 1, transform: 'translate(12%,8%) rotate(4deg)' },
    ]);
    animate(brush, [
      { offset: 0, opacity: 0, transform: 'translate(30%,-40%) rotate(40deg)' },
      { offset: .24, opacity: 0, transform: 'translate(30%,-40%) rotate(40deg)', easing: 'ease-out' },
      { offset: .33, opacity: 1, transform: 'translate(0,12%) rotate(26deg)', easing: 'ease-in-out' },
      { offset: .43, opacity: 1, transform: 'translate(-24%,24%) rotate(18deg)', easing: 'ease-in-out' },
      { offset: .51, opacity: 1, transform: 'translate(-6%,12%) rotate(29deg)', easing: 'ease-in-out' },
      { offset: .61, opacity: 1, transform: 'translate(-30%,25%) rotate(18deg)', easing: 'ease-in-out' },
      { offset: .67, opacity: 1, transform: 'translate(-5%,10%) rotate(30deg)', easing: 'ease-in' },
      { offset: .75, opacity: 0, transform: 'translate(35%,-35%) rotate(40deg)' },
      { offset: 1, opacity: 0, transform: 'translate(35%,-35%) rotate(40deg)' },
    ]);
    animate(glaze, [
      { offset: 0, opacity: 0 }, { offset: .35, opacity: 0 },
      { offset: .5, opacity: .45 }, { offset: .64, opacity: .15 },
      { offset: .75, opacity: .4 }, { offset: 1, opacity: 0 },
    ]);
    animate(steam, [
      { offset: 0, opacity: 0, transform: 'translateY(8%)' },
      { offset: .17, opacity: 0, transform: 'translateY(8%)', easing: 'ease-out' },
      { offset: .32, opacity: .32, transform: 'translateY(-4%)' },
      { offset: .67, opacity: 0, transform: 'translateY(-28%)' },
      { offset: 1, opacity: 0, transform: 'translateY(-28%)' },
    ]);
    landing.finished.then(() => { if (generation === run) finish(); }).catch(() => {});
  }
  control.hidden = reduced.matches;
  control.addEventListener('click', () => {
    if (state === 'playing') pause();
    else if (state === 'paused') resume();
    else void play();
  });
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .2;
    if (!inView) pause(true);
    else if (state === 'ready') void play();
    else if (resumeWhenVisible) resume();
  }, { threshold: .2 });
  observer.observe(scene.querySelector('.pie-motion-stage')!);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause(true);
    else if (resumeWhenVisible) resume();
  });
  reduced.addEventListener('change', () => {
    control.hidden = reduced.matches;
    if (reduced.matches) finish();
  });
}
