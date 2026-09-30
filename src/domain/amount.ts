import { getCurrency } from './currencies';

/**
 * 금액 입력 파싱 / 표시 포맷 — 순수 함수 모듈.
 *
 * 입력 필드에는 "1,234.56" 처럼 콤마가 들어가므로 문자열 처리를 별도로 다룬다.
 */

/**
 * 사용자 입력 문자열을 숫자로 변환한다.
 * 콤마·공백은 구분자로 무시하고, 그 외 잘못된 문자는 `null` 을 반환한다.
 *
 * @example parseAmountInput("1,234.5") === 1234.5
 * @example parseAmountInput("abc") === null
 */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw.replace(/[\s,]/g, '');
  if (cleaned === '' || cleaned === '.') {
    return null;
  }
  // 숫자, 선택적 마이너스, 소수점 하나만 허용
  if (!/^-?\d*\.?\d*$/.test(cleaned)) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * 입력 필드용 정규화 — 사용자가 계속 타이핑할 수 있게 콤마만 다시 넣어준다.
 * 숫자가 아니면 그대로 반환한다 (중간 상태 "12." 보존).
 */
export function formatAmountInput(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  const negative = value < 0;
  const abs = Math.abs(value);
  const [intPart = '0', fracPart] = String(abs).split('.');
  const grouped = groupThousands(intPart);
  const decimal = fracPart ? `.${fracPart}` : '';
  return `${negative ? '-' : ''}${grouped}${decimal}`;
}

/** 3자리마다 콤마 삽입 */
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 통화 금액 표기.
 * 통화별 최소 자릿수(`decimals`)를 쓰되, 의미 없는 소수 0 은 생략한다.
 *
 * @example formatCurrency(1380.4, 'KRW') === "₩1,380"
 * @example formatCurrency(1380.5, 'USD') === "$1,380.50"
 */
export function formatCurrency(value: number, code: string): string {
  const currency = getCurrency(code);
  return `${currency.symbol}${formatNumber(value, currency.decimals)}`;
}

/** 통화 기호 없이 숫자만 표기 */
export function formatNumber(value: number, decimals: number): string {
  if (!Number.isFinite(value)) {
    return '-';
  }
  const fixed = Math.abs(value).toFixed(decimals);
  const [intPart = '0', fracPart] = fixed.split('.');

  // 통화는 소수점 0 을 붙이지 않는다 (예: ₩1,380 / $1,380.50)
  const fraction = fracPart && Number(fracPart) > 0 ? `.${fracPart}` : '';
  const sign = value < 0 ? '-' : '';
  return `${sign}${groupThousands(intPart)}${fraction}`;
}

/**
 * 환율 자체를 읽기 좋게 표기.
 *
 * 값이 큰 환율(1380.5)을 정수로 반올림하면 실제 계산 결과와 어긋나므로
 * 반올림하지 않는다. 최대 6자리까지 확보한 뒤 불필요한 끝자리 0 만 지운다.
 *  · 1380.5  → "1,380.5"
 *  · 0.92    → "0.92"
 *  · 0.000724→ "0.000724"
 */
export function formatRate(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) {
    return '-';
  }
  const fixed = Math.abs(rate).toFixed(6);
  let text = fixed.includes('.')
    ? fixed.replace(/0+$/, '').replace(/\.$/, '')
    : fixed;
  // 극히 작은 환율이 0 으로 접히는 것을 막는다
  if (Number(text) === 0) {
    text = '0.000000';
  }
  const [intPart = '0', fracPart = ''] = text.split('.');
  const sign = rate < 0 ? '-' : '';
  return `${sign}${groupThousands(intPart)}${fracPart ? `.${fracPart}` : ''}`;
}
