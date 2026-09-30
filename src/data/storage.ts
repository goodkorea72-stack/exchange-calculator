/**
 * 사용자 설정 영속화 (localStorage).
 * 브라우저 전용이며 모든 접근은 예외 안전하다.
 */

import { DEFAULT_CURRENCY, isKnownCurrency } from '../domain/currencies';
import { resolvePair } from '../domain/pair';

const KEY = 'exchange-calculator:settings:v1';

export interface Settings {
  /** exchangerate-api 키. 없으면 키가 필요 없는 소스로 폴백한다. */
  apiKey: string | undefined;
  from: string;
  to: string;
  amount: string;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: undefined,
  from: 'USD',
  to: DEFAULT_CURRENCY,
  amount: '10000',
};

/** 저장된 설정을 읽는다. 없거나 손상됐으면 `null`. */
export function loadSettings(): Settings | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    return sanitizeSettings(parsed);
  } catch {
    return null;
  }
}

/** 설정을 저장한다. 실패(사모 모드/용량 초과 등) 는 조용히 무시. */
export function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* 저장할 수 없는 환경 — 앱은 계속 동작해야 한다 */
  }
}

/** 알 수 없는 값으로 들어온 데이터를 안전한 설정으로 정규화한다. */
export function sanitizeSettings(input: unknown): Settings {
  const record = typeof input === 'object' && input !== null ? input : {};
  const raw = record as Record<string, unknown>;

  const from = readCode(raw['from']) ?? DEFAULT_SETTINGS.from;
  const to = readCode(raw['to']) ?? DEFAULT_SETTINGS.to;
  const pair = resolvePair(from, to);

  return {
    apiKey: readString(raw['apiKey']),
    from: pair.from,
    to: pair.to,
    amount: readString(raw['amount']) ?? DEFAULT_SETTINGS.amount,
  };
}

function readCode(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const upper = value.trim().toUpperCase();
  return isKnownCurrency(upper) ? upper : null;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
