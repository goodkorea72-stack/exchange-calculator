import { useCallback, useEffect, useMemo, useState } from 'react';

import { AmountField } from './components/AmountField';
import { ApiKeyPanel } from './components/ApiKeyPanel';
import { CurrencySelect } from './components/CurrencySelect';
import { RateStatusBar } from './components/RateStatusBar';
import { convert, getRate, type RateTable } from './domain/convert';
import { getCurrency } from './domain/currencies';
import { formatAmountInput, formatCurrency, formatRate, parseAmountInput } from './domain/amount';
import { resolvePair, swapPair } from './domain/pair';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from './data/storage';
import { ENV_API_KEY, isExpired } from './data/rates';
import { useExchangeRates } from './hooks/useExchangeRates';

const EMPTY_RATES: RateTable = Object.freeze({});

export default function App() {
  const [settings, setSettings] = useState<Settings>(
    () => loadSettings() ?? DEFAULT_SETTINGS,
  );
  const [now, setNow] = useState(() => Date.now());

  const { snapshot, status, error, isFromCache, refresh } = useExchangeRates(
    settings.apiKey ?? ENV_API_KEY,
  );

  // 상대 시간("3분 전") 표시를 위해 주기적으로 현재 시각을 갱신한다
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  // 설정 변경 시에만 저장 (setState 안에서 부수효과를 내지 않는다)
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...patch };
      const pair = resolvePair(merged.from, merged.to);
      return { ...merged, from: pair.from, to: pair.to };
    });
  }, []);

  const rates = snapshot?.rates ?? EMPTY_RATES;
  const amount = useMemo(
    () => parseAmountInput(settings.amount),
    [settings.amount],
  );

  // 핵심: 입력이 바뀔 때마다 즉시 변환 결과가 계산된다
  const converted = useMemo(() => {
    if (amount === null) {
      return null;
    }
    return convert(amount, settings.from, settings.to, rates);
  }, [amount, settings.from, settings.to, rates]);

  const rate = useMemo(
    () => getRate(settings.from, settings.to, rates),
    [settings.from, settings.to, rates],
  );
  const inverseRate = useMemo(
    () => getRate(settings.to, settings.from, rates),
    [settings.to, settings.from, rates],
  );

  const hasRates = snapshot !== null;
  const resultText = converted?.ok
    ? formatCurrency(converted.value, settings.to)
    : hasRates
      ? '—'
      : '불러오는 중…';

  const handleSwap = useCallback(() => {
    const pair = swapPair({ from: settings.from, to: settings.to });
    // 계산된 금액을 입력값으로 가져온다 (스왑 후 다시 계산되는 대신 즉시 반영)
    const nextAmount =
      converted?.ok
        ? formatAmountInput(roundTo(converted.value, getCurrency(pair.from).decimals))
        : settings.amount;
    update({ ...pair, amount: nextAmount });
  }, [settings.from, settings.to, settings.amount, converted, update]);

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">환율 계산기</h1>
          <p className="app__subtitle">
            입력하는 즉시 원화 ↔ 세계 통화 양방향으로 변환합니다
          </p>
        </div>
        <ApiKeyPanel
          apiKey={settings.apiKey}
          envApiKey={ENV_API_KEY}
          onSave={(apiKey) => update({ apiKey })}
        />
      </header>

      <main className="card">
        <RateStatusBar
          snapshot={snapshot}
          status={status}
          error={error}
          isFromCache={isFromCache}
          now={now}
          onRefresh={refresh}
        />

        <div className="converter">
          <div className="converter__side">
            <AmountField
              label="금액"
              value={settings.amount}
              onChange={(amount) => update({ amount })}
              placeholder="0"
            />
            <CurrencySelect
              label="변환할 통화"
              value={settings.from}
              onChange={(from) => update({ from })}
            />
          </div>

          <div className="converter__swap">
            <button
              type="button"
              className="swap"
              onClick={handleSwap}
              disabled={!hasRates}
              title="반대 방향으로 전환"
            >
              <span aria-hidden="true">⇅</span>
              <span className="visually-hidden">통화 전환</span>
            </button>
          </div>

          <div className="converter__side converter__side--result">
            <AmountField
              label="변환 결과"
              value={resultText}
              onChange={() => undefined}
              readOnly
              inputMode="text"
            />
            <CurrencySelect
              label="변환 대상 통화"
              value={settings.to}
              onChange={(to) => update({ to })}
            />
          </div>
        </div>

        <section className="rates" aria-label="환율 정보">
          <div className="rates__row">
            <span className="rates__label">1 {settings.from} =</span>
            <span className="rates__value">
              {rate === null ? '—' : `${formatRate(rate)} ${settings.to}`}
            </span>
          </div>
          <div className="rates__row">
            <span className="rates__label">1 {settings.to} =</span>
            <span className="rates__value">
              {inverseRate === null ? '—' : `${formatRate(inverseRate)} ${settings.from}`}
            </span>
          </div>
          {snapshot && isExpired(snapshot, now) && (
            <p className="rates__warning">
              마지막 조회에서 5분이 지나 자동으로 갱신 중입니다.
            </p>
          )}
        </section>
      </main>

      <footer className="app__footer">
        <p>
          환율은 exchangerate-api 또는 ECB(Frankfurter) 기준이며 5분마다
          자동으로 갱신됩니다. 실제 거래 시세는 은행·환전소의 적용 환율이
          다릅니다.
        </p>
      </footer>
    </div>
  );
}

/** 표시 통화 자릿수에 맞춰 반올림 */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** Math.min(decimals, 8);
  return Math.round(value * factor) / factor;
}
