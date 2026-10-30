const header = document.querySelector<HTMLElement>('[data-site-header]');
const menu = document.querySelector<HTMLDialogElement>('#site-menu-dialog');
const menuTrigger = header?.querySelector<HTMLButtonElement>('[data-menu-open]');
const cityDialog = document.querySelector<HTMLDialogElement>('#city-dialog');

if (header && menu && menuTrigger) {
  menuTrigger.addEventListener('click', () => {
    menu.showModal();
    menuTrigger.setAttribute('aria-expanded', 'true');
  });
  menu.querySelector('[data-menu-close]')?.addEventListener('click', () => menu.close());
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => menu.close()));
  menu.addEventListener('close', () => {
    menuTrigger.setAttribute('aria-expanded', 'false');
    menuTrigger.focus({ preventScroll: true });
  });
  menu.addEventListener('click', event => {
    if (event.target !== menu) return;
    const box = menu.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) menu.close();
  });

  if (header.dataset.storefront !== 'true' && cityDialog) {
    let cityTrigger: HTMLElement | null = null;
    const updateCity = (city: string) => {
      if (!['Зеленоградск', 'Калининград', 'Светлогорск'].includes(city)) return;
      header.querySelectorAll<HTMLElement>('[data-city]').forEach(label => { label.textContent = city; });
      cityDialog.querySelectorAll<HTMLElement>('[data-select-city]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.selectCity === city)));
    };
    const readSaved = () => {
      try {
        updateCity(localStorage.getItem('pirogorsk-city') || 'Зеленоградск');
        const saved: unknown = JSON.parse(localStorage.getItem('pirogorsk-selection') || '[]');
        const count = Array.isArray(saved) ? saved.slice(0, 24).reduce((sum, item) => sum + (item && typeof item.id === 'string' && Number.isFinite(item.value) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99 ? item.quantity : 0), 0) : 0;
        const badge = header.querySelector<HTMLElement>('[data-count]');
        if (badge) { badge.textContent = String(count); badge.hidden = count === 0; }
        header.querySelector('[data-header-selection]')?.setAttribute('aria-label', count ? `Подборка: ${count} шт.` : 'Открыть подборку');
      } catch { /* The header stays usable without saved browser data. */ }
    };
    header.querySelectorAll<HTMLElement>('[data-open="city-dialog"]').forEach(button => button.addEventListener('click', () => { cityTrigger = button; cityDialog.showModal(); }));
    cityDialog.querySelector('[data-close]')?.addEventListener('click', () => cityDialog.close());
    cityDialog.querySelectorAll<HTMLElement>('[data-select-city]').forEach(button => button.addEventListener('click', () => {
      const city = button.dataset.selectCity!;
      updateCity(city);
      try { localStorage.setItem('pirogorsk-city', city); } catch { /* This visit can still use the chosen city. */ }
      cityDialog.close();
    }));
    cityDialog.addEventListener('close', () => cityTrigger?.focus({ preventScroll: true }));
    cityDialog.addEventListener('click', event => {
      if (event.target !== cityDialog) return;
      const box = cityDialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) cityDialog.close();
    });
    window.addEventListener('storage', readSaved);
    window.addEventListener('pageshow', readSaved);
    window.addEventListener('pirogorsk:catalog-updated', readSaved);
    readSaved();
  }
}
