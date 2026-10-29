/** Planning assumptions, not a carrier quote or a promise of net profit. */
export const pricingModel = {
  inboundPerPiece: 5,
  inboundPerKgDough: 25,
  packingPerSelection: 40,
  variableReserveRate: 0.10,
  contributionRate: 0.35,
  rounding: 10,
} as const;

export const deliveryEstimates: Record<string, number> = {
  'Калининград': 350,
  'Зеленоградск': 500,
  'Светлогорск': 650,
};

export function estimatePrice(purchase: number, inbound: number) {
  const { packingPerSelection, variableReserveRate, contributionRate, rounding } = pricingModel;
  const price = Math.ceil((purchase + inbound + packingPerSelection) / (1 - variableReserveRate - contributionRate) / rounding) * rounding;
  return { purchase, inbound, packing: packingPerSelection, price,
    variableReserve: Math.round(price * variableReserveRate * 100) / 100,
    contribution: Math.round((price * (1 - variableReserveRate) - purchase - inbound - packingPerSelection) * 100) / 100 };
}

/** One last-mile allowance per order, independent of the number of products. */
export function estimateDelivery(city: string, mode: string): number | null {
  return mode === 'pickup' ? 0 : mode === 'delivery' ? deliveryEstimates[city] ?? null : null;
}
