/**
 * 통합 파이프라인 검증.
 * 실제 API 응답 형태 → 정규화 → 환율 계산 → 표시 문자열까지 한 번에 확인한다.
 * 모듈 간 계약이 어긋나면 (예: 필드명 변경) 이 테스트가 먼저 잡아낸다.
 */

import { describe, expect, it } from 'vitest';

import { convert, getRate } from '../domain/convert';
import { formatCurrency, formatRate } from '../domain/amount';
import { normalizeExchangerateApi, normalizeFrankfurter } from './normalize';

// 2026-09-30 실제 Frankfurter 응답에서 발췌한 형태의 샘플
const FRANKFURTER_SAMPLE = {
  amount: 1,
  base: 'USD',
  date: '2026-09-30',
  rates: { KRW: 1353.36, EUR: 0.88067, JPY: 157.12, CNY: 7.1234 },
};

const EXCHANGERATE_SAMPLE = {
  result: 'success',
  base_code: 'USD',
  conversion_rates: { KRW: 1353.36, EUR: 0.88067, JPY: 157.12 },
  time_last_update_unix: 1_757_000_000,
};

describe('환율 파이프라인 (API 응답 → 계산 → 표시)', () => {
  it('Frankfurter 응답으로 100 USD → KRW 가 계산된다', () => {
    const parsed = normalizeFrankfurter(FRANKFURTER_SAMPLE, 'USD');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = convert(100, 'USD', 'KRW', parsed.rates);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 100 × 1353.36 = 135,336
    expect(result.value).toBeCloseTo(135_336, 6);
    expect(formatCurrency(result.value, 'KRW')).toBe('₩135,336');
  });

  it('exchangerate-api 응답도 동일한 결과를 만든다 (소스 무관 일관성)', () => {
    const fromFrankfurter = normalizeFrankfurter(FRANKFURTER_SAMPLE, 'USD');
    const fromApi = normalizeExchangerateApi(EXCHANGERATE_SAMPLE, 'USD');
    expect(fromFrankfurter.ok && fromApi.ok).toBe(true);
    if (!fromFrankfurter.ok || !fromApi.ok) return;

    expect(fromApi.rates['KRW']).toBe(fromFrankfurter.rates['KRW']);

    // 10,000 × 1353.36 = 13,533,600
    const result = convert(10_000, 'USD', 'KRW', fromApi.rates);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(formatCurrency(result.value, 'KRW')).toBe('₩13,533,600');
  });

  it('원 → 달러 역변환이 1 USD = 1,353.36원 기준으로 맞는다', () => {
    const parsed = normalizeFrankfurter(FRANKFURTER_SAMPLE, 'USD');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const rate = getRate('KRW', 'USD', parsed.rates);
    expect(rate).toBeCloseTo(1 / 1353.36, 10);

    const result = convert(135_336, 'KRW', 'USD', parsed.rates);
    expect(result.ok && result.value).toBeCloseTo(100, 6);
  });

  it('환율 표시가 계산 결과와 어긋나지 않는다', () => {
    const parsed = normalizeFrankfurter(FRANKFURTER_SAMPLE, 'USD');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    // 표기된 환율로 역산해도 같은 금액이 나와야 한다
    const rate = getRate('USD', 'KRW', parsed.rates);
    expect(rate).not.toBeNull();
    if (rate === null) return;

    const shown = Number(formatRate(rate).replace(/,/g, ''));
    expect(convert(1, 'USD', 'KRW', parsed.rates)).toEqual({
      ok: true,
      value: shown,
    });
  });

  it('EUR 을 거친 크로스 환율도 파이프라인을 통과한다', () => {
    const parsed = normalizeFrankfurter(FRANKFURTER_SAMPLE, 'USD');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = convert(1000, 'EUR', 'JPY', parsed.rates);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 1000 / 0.88067 × 157.12
    expect(result.value).toBeCloseTo((1000 / 0.88067) * 157.12, 4);
    expect(formatCurrency(result.value, 'JPY')).toMatch(/^¥[\d,]+$/);
  });
});
