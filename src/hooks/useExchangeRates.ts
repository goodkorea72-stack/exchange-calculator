import { useCallback, useEffect, useRef, useState } from 'react';

import {
  RATE_TTL_MS,
  RateFetchError,
  fetchLiveRates,
  loadCachedRates,
  storeRates,
} from '../data/rates';
import type { RateSnapshot } from '../data/normalize';

/** 환율 로딩 상태 */
export type RatesStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'ready'
  | 'error';

export interface UseExchangeRatesResult {
  readonly snapshot: RateSnapshot | null;
  readonly status: RatesStatus;
  /** 화면에 노출할 오류 메시지 (캐시로 계산 가능한 경우에도 함께 표시) */
  readonly error: string | null;
  /** 현재 화면의 환율이 캐시 값인지 여부 */
  readonly isFromCache: boolean;
  /** 수동 갱신 트리거 */
  readonly refresh: () => void;
}

const AUTO_REFRESH_MS = RATE_TTL_MS;

/**
 * 실시간 환율 훅.
 *
 * - 캐시가 있으면 즉시 표시한 뒤 네트워크로 갱신한다 (깜빡임 없음)
 * - 5분마다 자동 갱신, 탭이 다시 활성화되거나 네트워크가 복귀해도 갱신
 * - 네트워크 실패 시 마지막 캐시로 계산하고 오류만 알린다
 * - 요청은 AbortController 로 취소하고, 늦게 도착한 응답은 무시한다
 */
export function useExchangeRates(
  apiKey: string | undefined,
): UseExchangeRatesResult {
  const [snapshot, setSnapshot] = useState<RateSnapshot | null>(null);
  const [status, setStatus] = useState<RatesStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const sequenceRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    const sequence = ++sequenceRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setStatus((prev) => (prev === 'ready' ? 'refreshing' : 'loading'));

    try {
      const fresh = await fetchLiveRates(apiKey, controller.signal);
      if (sequence !== sequenceRef.current) {
        return; // 더 최신 요청이 이미 처리됨
      }
      storeRates(fresh);
      setSnapshot(fresh);
      setIsFromCache(false);
      setError(null);
      setStatus('ready');
    } catch (cause) {
      if (sequence !== sequenceRef.current) {
        return;
      }
      const message =
        cause instanceof RateFetchError ? cause.message : '환율을 가져오지 못했습니다.';
      const cached = loadCachedRates();
      if (cached) {
        // 캐시가 있으면 계산은 계속되고, 오류는 배너로만 알린다
        setSnapshot(cached);
        setIsFromCache(true);
        setError(message);
        setStatus('ready');
      } else {
        setError(message);
        setStatus('error');
      }
    }
  }, [apiKey]);

  // 최초 로드 (캐시 먼저 → 네트워크)
  useEffect(() => {
    const cached = loadCachedRates();
    if (cached) {
      setSnapshot(cached);
      setIsFromCache(true);
      setStatus('ready');
    }
    void load();
  }, [load]);

  // 주기적 자동 갱신
  useEffect(() => {
    const timer = setInterval(() => {
      void load();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // 탭이 다시 보이면 만료 여부와 무관하게 갱신
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [load]);

  // 네트워크 복귀 즉시 갱신
  useEffect(() => {
    const onOnline = () => {
      void load();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [load]);

  // 언마운트 시 진행 중 요청 취소
  useEffect(() => {
    return () => {
      sequenceRef.current += 1;
      controllerRef.current?.abort();
    };
  }, []);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  return { snapshot, status, error, isFromCache, refresh };
}
