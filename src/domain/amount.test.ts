import { describe, expect, it } from 'vitest';

import {
  formatAmountInput,
  formatCurrency,
  formatNumber,
  formatRate,
  groupThousands,
  parseAmountInput,
} from './amount';

describe('parseAmountInput', () => {
  it('콤마와 공백을 구분자로 무시한다', () => {
    expect(parseAmountInput('1,234.56')).toBe(1234.56);
    expect(parseAmountInput(' 1 000 ')).toBe(1000);
  });

  it('정수를 그대로 파싱한다', () => {
    expect(parseAmountInput('10000')).toBe(10_000);
    expect(parseAmountInput('0')).toBe(0);
  });

  it('음수를 파싱한다', () => {
    expect(parseAmountInput('-250')).toBe(-250);
  });

  it('빈 문자열과 단독 소수점은 null (입력 중 상태 허용)', () => {
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('   ')).toBeNull();
    expect(parseAmountInput('.')).toBeNull();
  });

  it('잘못된 문자가 섞이면 null', () => {
    expect(parseAmountInput('1a2')).toBeNull();
    expect(parseAmountInput('1.2.3')).toBeNull();
    expect(parseAmountInput('₩100')).toBeNull();
    expect(parseAmountInput('1e5')).toBeNull();
  });
});

describe('formatAmountInput', () => {
  it('천 단위 콤마를 넣는다', () => {
    expect(formatAmountInput(1_234_567)).toBe('1,234,567');
  });

  it('소수점은 보존한다', () => {
    expect(formatAmountInput(1234.5)).toBe('1,234.5');
  });

  it('음수 부호를 유지한다', () => {
    expect(formatAmountInput(-1234.5)).toBe('-1,234.5');
  });

  it('값이 아니면 빈 문자열', () => {
    expect(formatAmountInput(Number.NaN)).toBe('');
  });
});

describe('groupThousands', () => {
  it('4자리 이상에만 콤마를 넣는다', () => {
    expect(groupThousands('1')).toBe('1');
    expect(groupThousands('123')).toBe('123');
    expect(groupThousands('1234')).toBe('1,234');
    expect(groupThousands('1234567')).toBe('1,234,567');
  });
});

describe('formatNumber', () => {
  it('자릿수만큼 소수점을 표시한다', () => {
    expect(formatNumber(1234.5, 2)).toBe('1,234.50');
  });

  it('의미 없는 소수 0 은 생략한다', () => {
    expect(formatNumber(1234, 2)).toBe('1,234');
    expect(formatNumber(1234.05, 2)).toBe('1,234.05');
  });

  it('음수는 마이너스를 앞에 붙인다', () => {
    expect(formatNumber(-9876.5, 2)).toBe('-9,876.50');
  });

  it('값이 아니면 대시', () => {
    expect(formatNumber(Number.NaN, 2)).toBe('-');
  });
});

describe('formatCurrency', () => {
  it('통화 기호를 붙인다', () => {
    expect(formatCurrency(1_380.5, 'KRW')).toBe('₩1,381');
    expect(formatCurrency(12.5, 'USD')).toBe('$12.50');
  });

  it('소수점 없는 통화는 통화 자릿수대로 반올림한다', () => {
    expect(formatCurrency(1380.4, 'KRW')).toBe('₩1,380');
    expect(formatCurrency(157.6, 'JPY')).toBe('¥158');
  });

  it('3자리 통화(KWD)도 지원한다', () => {
    expect(formatCurrency(1.2346, 'KWD')).toBe('د.ك1.235');
  });

  it('목록에 없는 통화도 코드로 표시한다 (버전 안전)', () => {
    expect(formatCurrency(10, 'ZZZ')).toBe('ZZZ10');
  });
});

describe('formatRate', () => {
  it('환율을 반올림하지 않고 그대로 보존한다', () => {
    // 1380 을 1,380 이나 1,381 로 잘라내지 않는다
    expect(formatRate(1380.5)).toBe('1,380.5');
    expect(formatRate(1380)).toBe('1,380');
  });

  it('끝자리 0 만 제거한다', () => {
    expect(formatRate(0.92)).toBe('0.92');
    expect(formatRate(157.3)).toBe('157.3');
  });

  it('작은 환율도 의미 있는 자릿수를 유지한다', () => {
    expect(formatRate(0.000724)).toBe('0.000724');
    expect(formatRate(0.0063)).toBe('0.0063');
  });

  it('6자리보다 작은 값은 0 으로 접히지 않는다', () => {
    expect(formatRate(0.0000001)).toBe('0.000000');
  });

  it('잘못된 값은 대시', () => {
    expect(formatRate(0)).toBe('-');
    expect(formatRate(-1)).toBe('-');
    expect(formatRate(Number.NaN)).toBe('-');
  });
});
