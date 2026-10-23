// JSON-safe contract for storefront.ts. No Astro, assets or catalogue imports.
export const editorialCityIntents = {
  'city-zelenogradsk': 'Зеленоградск',
  'city-kaliningrad': 'Калининград',
  'city-svetlogorsk': 'Светлогорск',
} as const;

// These are editable examples, not confirmed sets or serving recommendations.
export const editorialScenarioIntents = {
  'scenario-apartamenty': {
    label: 'Ужин в апартаментах',
    preview: 'Мясной и сырный пироги — по 500 г, по одному каждого вкуса.',
    items: [{ id: 'meat', value: 500, quantity: 1 }, { id: 'cheese', value: 500, quantity: 1 }],
  },
  'scenario-kompaniya': {
    label: 'На компанию',
    preview: 'Мясной, рыбный и капустный пироги — по 1 кг, по одному каждого вкуса.',
    items: [{ id: 'meat', value: 1000, quantity: 1 }, { id: 'fish', value: 1000, quantity: 1 }, { id: 'cabbage', value: 1000, quantity: 1 }],
  },
  'scenario-piknik': {
    label: 'Пикник у моря',
    preview: 'Капустный и вишнёвый пироги — по 500 г, по одному каждого вкуса.',
    items: [{ id: 'cabbage', value: 500, quantity: 1 }, { id: 'cherry', value: 500, quantity: 1 }],
  },
} as const;

export type EditorialCityIntent = keyof typeof editorialCityIntents;
export type EditorialScenarioIntent = keyof typeof editorialScenarioIntents;
