/**
 * 환율 계산 — 순수 함수 모듈.
 * 네트워크·저장소·DOM 의존성이 없어 단위 테스트가 가능하다.
 */

/**
 * 환율표. 모든 값은 `base` 통화 1단위당 다른 통화 단위 수다.
 * 예: base = 'USD' 인데 rates.KRW = 1380 이면 1 USD = 1380 KRW.
 */
export type RateTable = Readonly<Record<string, number>>;

/** 숫자 변환 결과 */
export type ConversionResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: ConversionError };

export type ConversionError =
  | 'invalid-amount'
  | 'unknown-rate'
  | 'not-finite';

/**
 * `amount` 를 `from` 통화에서 `to` 통화로 변환한다.
 *
 * 크로스 환율(cross rate)을 직접 계산한다:
 *   amount / rates[from]  →  기준통화(base) 단위
 *   × rates[to]           →  목표 통화 단위
 *
 * 변환할 수 없으면 `ok: false` 와 사유를 반환한다 (예외를 던지지 않는다).
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: RateTable,
): ConversionResult {
  if (!Number.isFinite(amount)) {
    return { ok: false, reason: 'invalid-amount' };
  }

  // 같은 통화끼리는 환율이 필요 없다 (base 자체의 rate 는 항상 1).
  if (from === to) {
    return { ok: true, value: amount };
  }

  const fromRate = rateOf(rates, from);
  const toRate = rateOf(rates, to);

  if (fromRate === undefined || toRate === undefined || fromRate === 0) {
    return { ok: false, reason: 'unknown-rate' };
  }

  const value = (amount / fromRate) * toRate;
  if (!Number.isFinite(value)) {
    return { ok: false, reason: 'not-finite' };
  }
  return { ok: true, value };
}

/**
 * `from` → `to` 직거래 환율 (1 단위 = 몇 단위인지).
 * 실패 시 `null`.
 */
export function getRate(
  from: string,
  to: string,
  rates: RateTable,
): number | null {
  if (from === to) {
    return 1;
  }
  const fromRate = rateOf(rates, from);
  const toRate = rateOf(rates, to);
  if (fromRate === undefined || toRate === undefined || fromRate === 0) {
    return null;
  }
  const rate = toRate / fromRate;
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/** base 통화는 환율표에 없어도 1로 취급한다. */
function rateOf(rates: RateTable, code: string): number | undefined {
  const value = rates[code];
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return undefined;
}
