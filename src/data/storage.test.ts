import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, sanitizeSettings } from './storage';
import { resolvePair, swapPair } from '../domain/pair';

describe('sanitizeSettings', () => {
  it('유효한 값은 그대로 둔다', () => {
    const result = sanitizeSettings({
      apiKey: '  abc123  ',
      from: 'EUR',
      to: 'KRW',
      amount: '2500',
    });
    expect(result).toEqual({
      apiKey: 'abc123',
      from: 'EUR',
      to: 'KRW',
      amount: '2500',
    });
  });

  it('알 수 없는 통화 코드는 기본값으로 대체한다', () => {
    const result = sanitizeSettings({ from: 'ZZZ', to: 'QQQ' });
    expect(result.from).toBe(DEFAULT_SETTINGS.from);
    expect(result.to).toBe(DEFAULT_SETTINGS.to);
  });

  it('빈 문자열 API 키는 undefined 로 정규화한다', () => {
    expect(sanitizeSettings({ apiKey: '   ' }).apiKey).toBeUndefined();
    expect(sanitizeSettings({}).apiKey).toBeUndefined();
  });

  it('숫자·객체가 섞인 값은 타입을 무시하고 기본값을 쓴다', () => {
    const result = sanitizeSettings({ from: 123, to: {}, amount: 5000 });
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('숫자가 아닌 값이면 기본 설정을 반환한다', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('문자열')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('from 과 to 가 같아지면 반대편을 보정한다', () => {
    expect(sanitizeSettings({ from: 'KRW', to: 'KRW' })).toMatchObject({
      from: 'KRW',
      to: 'USD',
    });
    expect(sanitizeSettings({ from: 'USD', to: 'USD' })).toMatchObject({
      from: 'USD',
      to: 'KRW',
    });
  });
});

describe('resolvePair', () => {
  it('서로 다르면 그대로 둔다', () => {
    expect(resolvePair('USD', 'KRW')).toEqual({ from: 'USD', to: 'KRW' });
  });

  it('같으면 반대편을 다른 통화로 채운다', () => {
    expect(resolvePair('EUR', 'EUR')).toEqual({ from: 'EUR', to: 'KRW' });
  });
});

describe('swapPair', () => {
  it('방향을 뒤집는다', () => {
    expect(swapPair({ from: 'USD', to: 'KRW' })).toEqual({
      from: 'KRW',
      to: 'USD',
    });
  });
});
