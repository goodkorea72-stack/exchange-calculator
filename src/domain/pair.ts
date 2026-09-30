import { DEFAULT_CURRENCY } from './currencies';

/** 통화 쌍 (변환 방향) */
export interface CurrencyPair {
  readonly from: string;
  readonly to: string;
}

/**
 * 같은 통화가 양쪽에 오지 않도록 방향을 보정한다.
 * (예: KRW → KRW 가 되면 반대편을 USD 로)
 */
export function resolvePair(from: string, to: string): CurrencyPair {
  if (from !== to) {
    return { from, to };
  }
  return {
    from,
    to: from === DEFAULT_CURRENCY ? 'USD' : DEFAULT_CURRENCY,
  };
}

/** 방향을 뒤집는다 (스왑) */
export function swapPair(pair: CurrencyPair): CurrencyPair {
  return { from: pair.to, to: pair.from };
}
