import { describe, expect, it } from 'vitest';

import {
  normalizeExchangerateApi,
  normalizeFrankfurter,
} from './normalize';

describe('normalizeExchangerateApi', () => {
  it('정상 응답을 환율표로 변환한다', () => {
    const result = normalizeExchangerateApi(
      {
        result: 'success',
        base_code: 'USD',
        conversion_rates: { KRW: 1380.5, EUR: 0.92 },
      },
      'USD',
    );
    expect(result).toEqual({
      ok: true,
      base: 'USD',
      rates: { USD: 1, KRW: 1380.5, EUR: 0.92 },
    });
  });

  it('기준 통화 자신을 1 로 채워 넣는다', () => {
    const result = normalizeExchangerateApi(
      { result: 'success', base_code: 'USD', conversion_rates: { KRW: 1380 } },
      'USD',
    );
    expect(result.ok && result.rates['USD']).toBe(1);
  });

  it('result 가 success 가 아니면 실패', () => {
    expect(
      normalizeExchangerateApi(
        { result: 'error', error_type: 'invalid-key' },
        'USD',
      ),
    ).toEqual({ ok: false, reason: 'invalid-payload' });
  });

  it('기준 통화 불일치면 base-mismatch', () => {
    expect(
      normalizeExchangerateApi(
        { result: 'success', base_code: 'EUR', conversion_rates: { KRW: 1500 } },
        'USD',
      ),
    ).toEqual({ ok: false, reason: 'base-mismatch' });
  });

  it('파형이 아니면 invalid-payload', () => {
    expect(normalizeExchangerateApi(null, 'USD')).toEqual({
      ok: false,
      reason: 'invalid-payload',
    });
    expect(normalizeExchangerateApi('문자열', 'USD')).toEqual({
      ok: false,
      reason: 'invalid-payload',
    });
    expect(normalizeExchangerateApi([1, 2], 'USD')).toEqual({
      ok: false,
      reason: 'invalid-payload',
    });
  });

  it('0 / 음수 / NaN 항목은 버리고 나머지는 유지한다', () => {
    const result = normalizeExchangerateApi(
      {
        result: 'success',
        base_code: 'USD',
        conversion_rates: {
          KRW: 1380,
          ZERO: 0,
          NEG: -5,
          BROKEN: 'nope',
          EUR: 0.92,
        },
      },
      'USD',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.rates).sort()).toEqual(['EUR', 'KRW', 'USD']);
    }
  });

  it('환율 항목이 하나도 없으면 empty-rates', () => {
    expect(
      normalizeExchangerateApi(
        { result: 'success', base_code: 'USD', conversion_rates: { BAD: 0 } },
        'USD',
      ),
    ).toEqual({ ok: false, reason: 'empty-rates' });
  });

  it('통화 코드를 대문자로 정규화한다', () => {
    const result = normalizeExchangerateApi(
      { result: 'success', base_code: 'usd', conversion_rates: { krw: 1380 } },
      'USD',
    );
    expect(result).toEqual({ ok: true, base: 'USD', rates: { USD: 1, KRW: 1380 } });
  });

  it('3자가 아닌 코드는 무시한다', () => {
    const result = normalizeExchangerateApi(
      {
        result: 'success',
        base_code: 'USD',
        conversion_rates: { KRW: 1380, TOOLONGCODE: 5, AB: 3 },
      },
      'USD',
    );
    expect(result.ok && Object.keys(result.rates).sort()).toEqual(['KRW', 'USD']);
  });
});

describe('normalizeFrankfurter', () => {
  it('정상 응답을 환율표로 변환한다', () => {
    const result = normalizeFrankfurter(
      { amount: 1, base: 'USD', date: '2026-09-30', rates: { KRW: 1380.5 } },
      'USD',
    );
    expect(result).toEqual({ ok: true, base: 'USD', rates: { USD: 1, KRW: 1380.5 } });
  });

  it('기준 불일치와 빈 환율을 구분해 보고한다', () => {
    expect(normalizeFrankfurter({ base: 'EUR', rates: { KRW: 1 } }, 'USD')).toEqual({
      ok: false,
      reason: 'base-mismatch',
    });
    expect(normalizeFrankfurter({ base: 'USD', rates: {} }, 'USD')).toEqual({
      ok: false,
      reason: 'empty-rates',
    });
  });

  it('rates 자체가 없으면 invalid-payload', () => {
    expect(normalizeFrankfurter({ base: 'USD' }, 'USD')).toEqual({
      ok: false,
      reason: 'invalid-payload',
    });
  });
});
