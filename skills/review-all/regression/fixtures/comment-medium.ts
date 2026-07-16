import { priceCache, cacheKey } from './cache';
import { externalRateApi } from './rate-api';
import { sleep } from './util';

export interface PricingInput {
  basePrice: number;
  quantity: number;
  couponRate?: number;
}

export function calculateFinalPrice(input: PricingInput): number {
  // 총액을 계산한다.
  let total = input.basePrice * input.quantity;

  if (input.couponRate) {
    total = total - total * input.couponRate;
  }

  // 30일을 초로 계산한다.
  const cacheTtl = 30 * 24 * 60 * 60;
  priceCache.set(cacheKey(input), total, cacheTtl);

  return total;
}

export async function fetchExchangeRate(base: string): Promise<number> {
  const first = await externalRateApi.get(base);

  await sleep(500);

  const second = await externalRateApi.get(base);
  return (first.rate + second.rate) / 2;
}
