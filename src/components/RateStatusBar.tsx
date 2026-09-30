import { formatRelativeTime, formatStamp } from '../domain/time';
import { describeSource } from '../data/rates';
import type { RateSnapshot } from '../data/normalize';
import type { RatesStatus } from '../hooks/useExchangeRates';

interface RateStatusProps {
  readonly snapshot: RateSnapshot | null;
  readonly status: RatesStatus;
  readonly error: string | null;
  readonly isFromCache: boolean;
  readonly now: number;
  readonly onRefresh: () => void;
}

/** 상태 배너 + 마지막 갱신 시각 + 수동 새로고침 */
export function RateStatusBar({
  snapshot,
  status,
  error,
  isFromCache,
  now,
  onRefresh,
}: RateStatusProps) {
  const isBusy = status === 'loading' || status === 'refreshing';
  const failed = status === 'error';
  const stale = failed || (isFromCache && error !== null);

  return (
    <div className="statusbar">
      <div className="statusbar__info">
        <span
          className={[
            'statusbar__dot',
            failed ? 'is-failed' : isFromCache ? 'is-stale' : 'is-live',
            isBusy ? 'is-busy' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        />
        <span className="statusbar__text">
          {statusLabel(snapshot, status, isFromCache, failed)}
        </span>
        {snapshot && (
          <span className="statusbar__time">
            {formatRelativeTime(snapshot.fetchedAt, now)}
            {isFromCache ? ' · 저장됨' : ''}
          </span>
        )}
      </div>

      <button
        type="button"
        className="statusbar__refresh"
        onClick={onRefresh}
        disabled={isBusy}
      >
        {isBusy ? '갱신 중…' : '새로고침'}
      </button>

      {stale && error && (
        <p className="statusbar__error" role="status">
          {error} — 저장된 환율로 계산 중입니다
          {snapshot ? ` (${formatStamp(snapshot.fetchedAt)} 기준)` : ''}
        </p>
      )}
    </div>
  );
}

function statusLabel(
  snapshot: RateSnapshot | null,
  status: RatesStatus,
  isFromCache: boolean,
  failed: boolean,
): string {
  if (status === 'loading') {
    return '환율 불러오는 중…';
  }
  if (failed) {
    return '환율 조회 실패';
  }
  if (status === 'idle') {
    return '준비 중';
  }
  if (!snapshot) {
    return '환율 없음';
  }
  const source = isFromCache ? 'cache' : snapshot.source;
  return describeSource(source);
}
