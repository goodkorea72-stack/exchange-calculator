/**
 * 통화 메타데이터. `decimals` 는 통화별 최소 단위 자릿수다.
 * (JPY/KRW 는 소수점 없음, KWD 는 3자리)
 */
export interface Currency {
  /** ISO 4217 코드 */
  readonly code: string;
  /** 한글 이름 */
  readonly name: string;
  /** 통화 기호 */
  readonly symbol: string;
  /** 표시용 최소 소수점 자릿수 */
  readonly decimals: number;
}

export const CURRENCIES: readonly Currency[] = [
  { code: 'KRW', name: '대한민국 원', symbol: '₩', decimals: 0 },
  { code: 'USD', name: '미국 달러', symbol: '$', decimals: 2 },
  { code: 'EUR', name: '유로', symbol: '€', decimals: 2 },
  { code: 'JPY', name: '일본 엔', symbol: '¥', decimals: 0 },
  { code: 'CNY', name: '중국 위안', symbol: '¥', decimals: 2 },
  { code: 'GBP', name: '영국 파운드', symbol: '£', decimals: 2 },
  { code: 'CHF', name: '스위스 프랑', symbol: 'Fr', decimals: 2 },
  { code: 'HKD', name: '홍콩 달러', symbol: 'HK$', decimals: 2 },
  { code: 'SGD', name: '싱가포르 달러', symbol: 'S$', decimals: 2 },
  { code: 'TWD', name: '대만 달러', symbol: 'NT$', decimals: 2 },
  { code: 'AUD', name: '호주 달러', symbol: 'A$', decimals: 2 },
  { code: 'CAD', name: '캐나다 달러', symbol: 'C$', decimals: 2 },
  { code: 'NZD', name: '뉴질랜드 달러', symbol: 'NZ$', decimals: 2 },
  { code: 'THB', name: '태국 바트', symbol: '฿', decimals: 2 },
  { code: 'VND', name: '베트남 동', symbol: '₫', decimals: 0 },
  { code: 'IDR', name: '인도네시아 루피아', symbol: 'Rp', decimals: 0 },
  { code: 'INR', name: '인도 루피', symbol: '₹', decimals: 2 },
  { code: 'PHP', name: '필리핀 페소', symbol: '₱', decimals: 2 },
  { code: 'MYR', name: '말레이시아 링깃', symbol: 'RM', decimals: 2 },
  { code: 'AED', name: 'UAE 디르함', symbol: 'د.إ', decimals: 2 },
  { code: 'SAR', name: '사우디 리얄', symbol: '﷼', decimals: 2 },
  { code: 'KWD', name: '쿠웨이트 디나르', symbol: 'د.ك', decimals: 3 },
  { code: 'SEK', name: '스웨덴 크로나', symbol: 'kr', decimals: 2 },
  { code: 'NOK', name: '노르웨이 크로나', symbol: 'kr', decimals: 2 },
  { code: 'PLN', name: '폴란드 즈로티', symbol: 'zł', decimals: 2 },
  { code: 'CZK', name: '체코 코루나', symbol: 'Kč', decimals: 2 },
  { code: 'HUF', name: '헝가리 포린트', symbol: 'Ft', decimals: 0 },
  { code: 'TRY', name: '튀르키예 리라', symbol: '₺', decimals: 2 },
  { code: 'RUB', name: '러시아 루블', symbol: '₽', decimals: 2 },
  { code: 'BRL', name: '브라질 헤알', symbol: 'R$', decimals: 2 },
  { code: 'MXN', name: '멕시코 페소', symbol: 'MX$', decimals: 2 },
  { code: 'ZAR', name: '남아프리카 랜드', symbol: 'R', decimals: 2 },
  { code: 'ARS', name: '아르헨티나 페소', symbol: 'AR$', decimals: 2 },
  { code: 'CLP', name: '칠레 페소', symbol: 'CL$', decimals: 0 },
  { code: 'COP', name: '콜롬비아 페소', symbol: 'CO$', decimals: 0 },
  { code: 'EGP', name: '이집트 파운드', symbol: 'E£', decimals: 2 },
  { code: 'ILS', name: '이스라엘 신헤켈', symbol: '₪', decimals: 2 },
  { code: 'UAH', name: '우크라이나 흐리우냐', symbol: '₴', decimals: 2 },
] as const;

/** 통화 코드 → 메타데이터 맵 */
const CURRENCY_MAP: ReadonlyMap<string, Currency> = new Map(
  CURRENCIES.map((c) => [c.code, c]),
);

/** 기본 통화 (KRW) */
export const DEFAULT_CURRENCY = 'KRW';

/**
 * 통화 코드로 메타데이터를 찾는다. 모르는 코드는 안전한 기본값을 반환하므로
 * API 가 새 통화를 추가해도 앱이 깨지지 않는다.
 */
export function getCurrency(code: string): Currency {
  return (
    CURRENCY_MAP.get(code) ?? {
      code,
      name: code,
      symbol: code,
      decimals: 2,
    }
  );
}

/** 목록에 실제로 존재하는 통화인지 확인 */
export function isKnownCurrency(code: string): boolean {
  return CURRENCY_MAP.has(code);
}
