// Touch browsers can defer :active until the tap is recognised. Signal the
// physical press without preventing scrolling, link navigation or native input.
let pressed: HTMLElement | null = null;
const clearPress = () => {
  pressed?.removeAttribute('data-artwork-pressed');
  pressed = null;
};
document.addEventListener('pointerdown', event => {
  clearPress();
  if (event.pointerType === 'mouse' || event.button !== 0 || !(event.target instanceof Element)) return;
  pressed = event.target.closest<HTMLElement>('.supplier-art-link,.product-artwork--hero,.product-visual-link,.product-visual--hero');
  pressed?.setAttribute('data-artwork-pressed', '');
}, { passive: true });
document.addEventListener('pointerup', clearPress, { passive: true });
document.addEventListener('pointercancel', clearPress, { passive: true });
window.addEventListener('blur', clearPress);
window.addEventListener('pagehide', clearPress);
