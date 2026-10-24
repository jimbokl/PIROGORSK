// Fixed placements only: arbitrary query values never become analytics payloads.
export const trafficCampaigns = [
  { id: 'telegram-menu-a', path: '/menu/', utm_source: 'telegram', utm_medium: 'paid_social', utm_campaign: 'demand_test_2026_10', utm_content: 'menu_a' },
  { id: 'telegram-calculator-b', path: '/podbor/', utm_source: 'telegram', utm_medium: 'paid_social', utm_campaign: 'demand_test_2026_10', utm_content: 'calculator_b' },
  { id: 'telegram-blog-portions', path: '/journal/skolko-piroga-na-cheloveka/', utm_source: 'telegram', utm_medium: 'social', utm_campaign: 'blog_launch_2026_10', utm_content: 'portions_guide' },
  { id: 'telegram-blog-sizes', path: '/journal/pirog-500-g-ili-1-kg/', utm_source: 'telegram', utm_medium: 'social', utm_campaign: 'blog_launch_2026_10', utm_content: 'sizes_guide' },
] as const;

const campaignKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;

export function analyticsPageUrl(value: string): string {
  try {
    const input = new URL(value);
    if (!['https:', 'http:'].includes(input.protocol)) return '';
    const output = new URL(`${input.origin}${input.pathname}`);
    const campaign = trafficCampaigns.find(item => campaignKeys.every(key =>
      input.searchParams.getAll(key).length === 1 && input.searchParams.get(key) === item[key],
    ));
    if (campaign) for (const key of campaignKeys) output.searchParams.set(key, campaign[key]);
    return output.href;
  } catch { return ''; }
}
