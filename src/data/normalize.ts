import type { RateTable } from '../domain/convert';

/** 환율 데이터 출처 */
export type RateSource = 'exchangerate-api' | 'frankfurter' | 'cache';

/** 한 번의 환율 스냅샷 */
export interface RateSnapshot {
  /** 기준 통화 (이 통화 1단위 = rates 값) */
  readonly base: string;
  readonly rates: RateTable;
  /** 조회 시각 (epoch ms) */
  readonly fetchedAt: number;
  readonly source: RateSource;
}

/** 환율 응답 정규화 실패 사유 */
export type NormalizeError = 'invalid-payload' | 'base-mismatch' | 'empty-rates';

export type NormalizeResult =
  | { readonly ok: true; readonly base: string; readonly rates: RateTable }
  | { readonly ok: false; readonly reason: NormalizeError };

/**
 * exchangerate-api (v6) 응답을 환율표로 정규화한다.
 * 형식: { result, base_code, conversion_rates: { KRW: 1380.5 } }
 */
export function normalizeExchangerateApi(
  payload: unknown,
  expectedBase: string,
): NormalizeResult {
  if (!isRecord(payload)) {
    return { ok: false, reason: 'invalid-payload' };
  }
  if (payload['result'] !== 'success') {
    return { ok: false, reason: 'invalid-payload' };
  }
  const base = asCode(payload['base_code']);
  if (base !== expectedBase) {
    return { ok: false, reason: 'base-mismatch' };
  }
  return buildRates(payload['conversion_rates'], base);
}

/**
 * Frankfurter (v1) 응답을 환율표로 정규화한다.
 * 형식: { amount, base, date, rates: { KRW: 1380.5 } }
 */
export function normalizeFrankfurter(
  payload: unknown,
  expectedBase: string,
): NormalizeResult {
  if (!isRecord(payload)) {
    return { ok: false, reason: 'invalid-payload' };
  }
  const base = asCode(payload['base']);
  if (base !== expectedBase) {
    return { ok: false, reason: 'base-mismatch' };
  }
  return buildRates(payload['rates'], base);
}

function buildRates(
  raw: unknown,
  base: string,
): NormalizeResult {
  if (!isRecord(raw)) {
    return { ok: false, reason: 'invalid-payload' };
  }
  const rates: Record<string, number> = { [base]: 1 };
  let count = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      continue;
    }
    const code = asCode(key);
    if (code === null) {
      continue;
    }
    rates[code] = value;
    count += 1;
  }
  if (count === 0) {
    return { ok: false, reason: 'empty-rates' };
  }
  return { ok: true, base, rates };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 통화 코드로 정규화 (대문자, 3자 알파벳) */
function asCode(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const upper = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(upper) ? upper : null;
}
