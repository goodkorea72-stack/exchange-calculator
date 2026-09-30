/**
 * 시간 표기 — 순수 함수 모듈 (Date.now() 를 인자로 받는 것이 핵심).
 */

const CLOCK_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const STAMP_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * "3분 전" 형태의 상대 시간.
 * 미래 시각이 들어오면(시계 역행 등) '방금 전' 으로 방어한다.
 */
export function formatRelativeTime(timestamp: number, now: number): string {
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) {
    return '-';
  }
  const diff = Math.max(0, now - timestamp);
  if (diff < 10_000) {
    return '방금 전';
  }
  if (diff < 60_000) {
    return `${Math.floor(diff / 10_000) * 10}초 전`;
  }
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) {
    return `${minutes}분 전`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}시간 전`;
  }
  return `${Math.floor(hours / 24)}일 전`;
}

/** "14:30:05" 형태의 시계 */
export function formatClockTime(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    return '-';
  }
  return CLOCK_FORMAT.format(new Date(timestamp));
}

/** "9월 30일 14:30" 형태의 날짜+시각 */
export function formatStamp(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    return '-';
  }
  return STAMP_FORMAT.format(new Date(timestamp));
}
