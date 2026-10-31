const initializeGallery = (gallery: HTMLElement) => {
  const button = gallery.querySelector<HTMLButtonElement>('[data-cutaway-toggle]');
  const container = gallery.querySelector<HTMLElement>('[data-cutaway-image]');
  const template = gallery.querySelector<HTMLTemplateElement>('[data-cutaway-template]');
  const status = gallery.querySelector<HTMLElement>('[data-cutaway-status]');
  const label = gallery.querySelector<HTMLElement>('[data-cutaway-label]');
  if (!button || !container || !template || !status || !label) return;
  const initialLabel = button.getAttribute('aria-label')!;
  let loaded = false;
  let loading = false;
  button.hidden = false;
  button.addEventListener('click', async () => {
    if (loading) return;
    if (button.getAttribute('aria-pressed') === 'true') {
      container.hidden = true;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', initialLabel);
      label.textContent = 'Срез';
      status.textContent = 'Показан пирог целиком.';
      return;
    }
    if (!loaded) {
      loading = true;
      button.setAttribute('aria-busy', 'true');
      status.textContent = 'Загружаем крупный срез.';
      const image = template.content.querySelector('img')!.cloneNode(true) as HTMLImageElement;
      try {
        // Keep sources inside a template until the actual tap; native lazy loading
        // alone would still fetch these images as the feed approaches the viewport.
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => finish(false), 15000);
          const finish = (ok: boolean) => {
            clearTimeout(timeout);
            image.onload = image.onerror = null;
            ok ? resolve() : reject(new Error('Cutaway image unavailable'));
          };
          image.onload = () => finish(true);
          image.onerror = () => finish(false);
          container.replaceChildren(image);
          if (image.complete) finish(image.naturalWidth > 0);
        });
        loaded = true;
      } catch {
        container.replaceChildren();
        status.textContent = 'Не удалось загрузить срез. Попробуйте ещё раз.';
        return;
      } finally {
        loading = false;
        button.removeAttribute('aria-busy');
      }
    }
    container.hidden = false;
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-label', initialLabel.replace('Показать начинку:', 'Показать пирог целиком:'));
    label.textContent = 'Пирог';
    status.textContent = 'Показан крупный срез начинки.';
  });
};
document.querySelectorAll<HTMLElement>('[data-pie-gallery]').forEach(initializeGallery);
