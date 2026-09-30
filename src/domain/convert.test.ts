import { describe, expect, it } from 'vitest';

import { convert, getRate, type RateTable } from './convert';

// USD 기준 환율표 (1 USD = ...)
const RATES: RateTable = {
  USD: 1,
  KRW: 1380.5,
  EUR: 0.92,
  JPY: 157.3,
};

describe('convert', () => {
  it('기준 통화에서 다른 통화로 변환한다', () => {
    const result = convert(100, 'USD', 'KRW', RATES);
    expect(result).toEqual({ ok: true, value: 138_050 });
  });

  it('역방향 변환도 대칭적으로 동작한다', () => {
    const result = convert(138_050, 'KRW', 'USD', RATES);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeCloseTo(100, 6);
    }
  });

  it('두 번 변환하면 원래 값으로 돌아온다 (왕복 불변)', () => {
    const forward = convert(25_000, 'USD', 'EUR', RATES);
    expect(forward.ok).toBe(true);
    if (!forward.ok) return;

    const back = convert(forward.value, 'EUR', 'USD', RATES);
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.value).toBeCloseTo(25_000, 6);
    }
  });

  it('중간 통화를 거친 크로스 환율도 정확하다', () => {
    // KRW → JPY 를 EUR 기준으로 계산: 1380.5 / 0.92 * 157.3
    const result = convert(1000, 'KRW', 'JPY', RATES);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeCloseTo((1000 / 1380.5) * 157.3, 6);
    }
  });

  it('같은 통화끼리는 환율 없이 그대로 반환한다', () => {
    expect(convert(1234.5, 'KRW', 'KRW', {})).toEqual({
      ok: true,
      value: 1234.5,
    });
  });

  it('0 은 유효한 결과다 (undefined 가 아님)', () => {
    const result = convert(0, 'USD', 'KRW', RATES);
    expect(result).toEqual({ ok: true, value: 0 });
  });

  it('음수 금액도 변환한다', () => {
    const result = convert(-100, 'USD', 'KRW', RATES);
    expect(result).toEqual({ ok: true, value: -138_050 });
  });

  it('환율표에 없는 통화면 unknown-rate 를 반환한다', () => {
    expect(convert(100, 'USD', 'XXX', RATES)).toEqual({
      ok: false,
      reason: 'unknown-rate',
    });
  });

  it('NaN / Infinity 는 invalid-amount 로 처리한다', () => {
    expect(convert(Number.NaN, 'USD', 'KRW', RATES)).toEqual({
      ok: false,
      reason: 'invalid-amount',
    });
    expect(convert(Number.POSITIVE_INFINITY, 'USD', 'KRW', RATES)).toEqual({
      ok: false,
      reason: 'invalid-amount',
    });
  });

  it('환율이 0 이거나 음수인 항목은 없는 것으로 취급한다', () => {
    const broken: RateTable = { ...RATES, EUR: 0 };
    expect(convert(100, 'USD', 'EUR', broken)).toEqual({
      ok: false,
      reason: 'unknown-rate',
    });
  });

  it('결과가 오버플로우하면 not-finite 를 반환한다', () => {
    const result = convert(Number.MAX_VALUE, 'USD', 'KRW', RATES);
    expect(result).toEqual({ ok: false, reason: 'not-finite' });
  });
});

describe('getRate', () => {
  it('1 단위 기준 환율을 반환한다', () => {
    expect(getRate('USD', 'KRW', RATES)).toBeCloseTo(1380.5, 6);
  });

  it('역방향 환율은 정확히 역수다', () => {
    const forward = getRate('USD', 'KRW', RATES);
    const inverse = getRate('KRW', 'USD', RATES);
    expect(forward).not.toBeNull();
    expect(inverse).not.toBeNull();
    if (forward !== null && inverse !== null) {
      expect(forward * inverse).toBeCloseTo(1, 12);
    }
  });

  it('같은 통화는 1', () => {
    expect(getRate('KRW', 'KRW', RATES)).toBe(1);
  });

  it('알 수 없는 통화는 null', () => {
    expect(getRate('USD', 'ZZZ', RATES)).toBeNull();
  });
});
