/**
 * 환율 조회 + 오프라인 캐시.
 *
 * 동작 순서
 *  1) 키가 있으면 exchangerate-api 를 1순위로 호출
 *  2) 실패(네트워크/인증/형식) 하면 키가 필요 없는 Frankfurter(ECB) 로 폴백
 *  3) 그래도 실패하면 마지막으로 localStorage 캐시를 사용하고 "오프라인"임을 알림
 *
 * 기준 통화는 항상 USD 다. 전 통화를 한 번에 받아 크로스 환율을 계산하므로
 * 통화 선택이 바뀌어도 추가 네트워크 요청이 없다.
 */

import type { RateTable } from '../domain/convert';
import {
  normalizeExchangerateApi,
  normalizeFrankfurter,
  type RateSnapshot,
  type RateSource,
} from './normalize';

const CACHE_KEY = 'exchange-calculator:rates:v1';
const REQUEST_TIMEOUT_MS = 8_000;

/** 기준 통화 — 모든 환율은 이 통화 1단위 기준 */
export const RATE_BASE = 'USD';

/** 캐시 유효 기간 (5분) */
export const RATE_TTL_MS = 5 * 60 * 1000;

export type RateFetchErrorKind = 'network' | 'auth' | 'format';

export class RateFetchError extends Error {
  readonly kind: RateFetchErrorKind;

  constructor(kind: RateFetchErrorKind, message: string) {
    super(message);
    this.name = 'RateFetchError';
    this.kind = kind;
  }
}

/** 모듈 로드 시점의 환경변수 키 (사용자 설정으로 덮어쓸 수 있다) */
export const ENV_API_KEY: string | undefined = readEnvKey();

function readEnvKey(): string | undefined {
  try {
    const value = import.meta.env?.VITE_EXCHANGERATE_API_KEY;
    return typeof value === 'string' && value.trim() !== ''
      ? value.trim()
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 실시간 환율을 가져온다.
 *
 * 소스를 순서대로 시도하고, 앞선 소스가 실패하면 다음으로 넘어간다.
 * 모든 소스가 실패하면 가장 마지막 오류를 `RateFetchError` 로 던진다.
 * 호출자는 catch 후 캐시로 폴백하면 된다.
 *
 * @param apiKey exchangerate-api 키. 없으면 곧바로 Frankfurter 만 사용한다.
 */
export async function fetchLiveRates(
  apiKey: string | undefined,
  signal?: AbortSignal,
): Promise<RateSnapshot> {
  const sources: readonly (() => Promise<RateSnapshot>)[] = apiKey
    ? [
        () => tryExchangerateApi(apiKey, signal),
        () => tryFrankfurter(signal),
      ]
    : [() => tryFrankfurter(signal)];

  let lastError = new RateFetchError('network', '환율을 가져오지 못했습니다.');
  for (const attempt of sources) {
    try {
      return await attempt();
    } catch (error) {
      if (error instanceof RateFetchError) {
        lastError = error;
      } else {
        lastError = new RateFetchError('network', '알 수 없는 오류가 발생했습니다.');
      }
    }
  }
  throw lastError;
}

async function tryExchangerateApi(
  apiKey: string,
  signal: AbortSignal | undefined,
): Promise<RateSnapshot> {
  const url = `https://v6.exchangerate-api.com/v6/${encodeURIComponent(apiKey)}/latest/${RATE_BASE}`;
  const response = await requestJson(url, signal);

  if (response.status === 401 || response.status === 403) {
    throw new RateFetchError('auth', 'exchangerate-api 키가 올바르지 않습니다.');
  }
  if (!response.ok) {
    throw new RateFetchError(
      'network',
      `exchangerate-api 응답 오류 (HTTP ${response.status})`,
    );
  }

  const result = normalizeExchangerateApi(response.data, RATE_BASE);
  if (!result.ok) {
    throw new RateFetchError('format', `exchangerate-api 형식 오류: ${result.reason}`);
  }
  return {
    base: result.base,
    rates: result.rates,
    fetchedAt: Date.now(),
    source: 'exchangerate-api',
  };
}

async function tryFrankfurter(
  signal: AbortSignal | undefined,
): Promise<RateSnapshot> {
  // Frankfurter 는 ECB 참조 환율이라 JPY/KRW 등 주요 통화만 지원한다.
  const url = `https://api.frankfurter.app/latest?from=${RATE_BASE}`;
  const response = await requestJson(url, signal);

  if (!response.ok) {
    throw new RateFetchError(
      'network',
      `환율 조회 실패 (HTTP ${response.status})`,
    );
  }

  const result = normalizeFrankfurter(response.data, RATE_BASE);
  if (!result.ok) {
    throw new RateFetchError('format', `환율 형식 오류: ${result.reason}`);
  }
  return {
    base: result.base,
    rates: result.rates,
    fetchedAt: Date.now(),
    source: 'frankfurter',
  };
}

type JsonResponse = { readonly ok: boolean; readonly status: number; readonly data: unknown };

/** 타임아웃이 걸린 JSON GET */
async function requestJson(
  url: string,
  signal: AbortSignal | undefined,
): Promise<JsonResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const data: unknown = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, data };
  } catch (cause) {
    throw new RateFetchError('network', describeNetworkError(cause));
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

function describeNetworkError(cause: unknown): string {
  if (cause instanceof DOMException && cause.name === 'AbortError') {
    return '환율 요청 시간이 초과되었습니다.';
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return '오프라인 상태입니다.';
  }
  return '인터넷에 연결할 수 없습니다.';
}

/** 마지막으로 성공한 환율을 localStorage 에 저장 */
export function storeRates(snapshot: RateSnapshot): void {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        base: snapshot.base,
        rates: snapshot.rates,
        fetchedAt: snapshot.fetchedAt,
      }),
    );
  } catch {
    /* 저장 불가 환경에서는 조용히 무시 */
  }
}

/** 캐시된 환율 읽기. 없거나 손상됐으면 `null`. 출처는 'cache' 로 표시된다. */
export function loadCachedRates(): RateSnapshot | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }
    const base = parsed['base'];
    const fetchedAt = parsed['fetchedAt'];
    const rates = parsed['rates'];
    if (
      typeof base !== 'string' ||
      typeof fetchedAt !== 'number' ||
      !Number.isFinite(fetchedAt) ||
      !isRecord(rates)
    ) {
      return null;
    }
    const cleaned = sanitizeRateTable(rates);
    if (Object.keys(cleaned).length === 0) {
      return null;
    }
    return { base, rates: cleaned, fetchedAt, source: 'cache' };
  } catch {
    return null;
  }
}

/** 캐시 삭제 (수동 초기화용) */
export function clearCachedRates(): void {
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* 무시 */
  }
}

/** TTL 이 지났는지 (순수 함수) */
export function isExpired(
  snapshot: RateSnapshot,
  now: number,
  ttlMs: number = RATE_TTL_MS,
): boolean {
  return now - snapshot.fetchedAt >= ttlMs;
}

function sanitizeRateTable(input: Record<string, unknown>): RateTable {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      out[key.toUpperCase()] = value;
    }
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 출처 표시용 라벨 */
export function describeSource(source: RateSource): string {
  switch (source) {
    case 'exchangerate-api':
      return 'exchangerate-api 실시간';
    case 'frankfurter':
      return 'ECB 기준 환율';
    case 'cache':
      return '저장된 환율';
  }
}
