import { describe, expect, it } from 'vitest';

import { formatClockTime, formatRelativeTime } from './time';

const NOW = 1_757_000_000_000;

describe('formatRelativeTime', () => {
  it('10초 미만은 방금 전', () => {
    expect(formatRelativeTime(NOW - 1_000, NOW)).toBe('방금 전');
    expect(formatRelativeTime(NOW, NOW)).toBe('방금 전');
  });

  it('분 단위로 내림한다', () => {
    expect(formatRelativeTime(NOW - 65_000, NOW)).toBe('1분 전');
    expect(formatRelativeTime(NOW - 59_000, NOW)).toBe('50초 전');
  });

  it('시간 단위로 표시한다', () => {
    expect(formatRelativeTime(NOW - 3_600_000, NOW)).toBe('1시간 전');
  });

  it('하루 이상이면 일 단위로 표시한다', () => {
    expect(formatRelativeTime(NOW - 86_400_000 * 3, NOW)).toBe('3일 전');
  });

  it('미래 시각(시계 역행)에도 방금 전으로 방어한다', () => {
    expect(formatRelativeTime(NOW + 60_000, NOW)).toBe('방금 전');
  });

  it('잘못된 값은 대시', () => {
    expect(formatRelativeTime(Number.NaN, NOW)).toBe('-');
  });
});

describe('formatClockTime', () => {
  it('시:분:초 형식이다', () => {
    expect(formatClockTime(NOW)).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('잘못된 값은 대시', () => {
    expect(formatClockTime(Number.NaN)).toBe('-');
  });
});
