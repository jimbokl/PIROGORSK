import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

// Shared by the picture and its responsive preload: identical URLs/sizes prevent
// a second download when the browser reaches the hero after parsing the head.
export const phoneCampaignSizes = 'calc(100vw - 40px)';
export const wideCampaignSizes = '(max-width: 600px) 180vw, (max-width: 1400px) 94vw, 1280px';
export function campaignImage(image: ImageMetadata, phone: boolean, format: 'avif' | 'webp') {
  return getImage({
    src: image, format, width: phone ? 800 : 1920, height: phone ? 534 : 640,
    widths: phone ? [320, 480, 640, 720, 800, 960] : [640, 960, 1280, 1600, 1920],
    fit: 'cover', position: 'right', quality: phone ? 42 : 60,
  });
}
