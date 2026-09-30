import { useCallback, useEffect, useMemo, useState } from 'react';

import { AmountField } from './components/AmountField';
import { ApiKeyPanel } from './components/ApiKeyPanel';
import { CurrencySelect } from './components/CurrencySelect';
import { RateStatusBar } from './components/RateStatusBar';
import { KpiCards } from './components/KpiCards';
import { RateMatrixTable } from './components/RateMatrixTable';
import { QuickPresets } from './components/QuickPresets';
import { QuickConversionTable } from './components/QuickConversionTable';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simple'>('dashboard');

  const { snapshot, status, error, isFromCache, refresh } = useExchangeRates(
    settings.apiKey ?? ENV_API_KEY,
  );

  // 상대 시간("3분 전") 표시를 위해 주기적으로 현재 시각을 갱신한다
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  // 설정 변경 시에만 저장
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

  // 입력이 바뀔 때마다 즉시 변환 결과 계산
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
    const nextAmount =
      converted?.ok
        ? formatAmountInput(roundTo(converted.value, getCurrency(pair.from).decimals))
        : settings.amount;
    update({ ...pair, amount: nextAmount });
  }, [settings.from, settings.to, settings.amount, converted, update]);

  return (
    <div className="app app--dashboard">
      <header className="app__header">
        <div className="app__brand">
          <div className="app__logo-icon">📊</div>
          <div>
            <h1 className="app__title">실시간 환율 대시보드</h1>
            <p className="app__subtitle">
              전 세계 50+ 개국 주요 통화 양방향 변환 및 동시 비교
            </p>
          </div>
        </div>

        <div className="app__header-actions">
          <div className="view-toggle">
            <button
              type="button"
              className={`view-toggle__btn ${activeTab === 'dashboard' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 대시보드
            </button>
            <button
              type="button"
              className={`view-toggle__btn ${activeTab === 'simple' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('simple')}
            >
              🧮 심플 계산기
            </button>
          </div>

          <ApiKeyPanel
            apiKey={settings.apiKey}
            envApiKey={ENV_API_KEY}
            onSave={(apiKey) => update({ apiKey })}
          />
        </div>
      </header>

      {/* 상태 바 */}
      <RateStatusBar
        snapshot={snapshot}
        status={status}
        error={error}
        isFromCache={isFromCache}
        now={now}
        onRefresh={refresh}
      />

      {/* 주요 통화 KPI 카드 */}
      <KpiCards
        rates={rates}
        baseCurrency={settings.to}
        onSelectCurrency={(code) => update({ from: code })}
      />

      {/* 대시보드 메인 레이아웃 */}
      <div className={`dashboard-layout ${activeTab === 'simple' ? 'dashboard-layout--single' : ''}`}>
        {/* 계산기 카드 섹션 */}
        <section className="card card--calculator">
          <div className="card__header-bar">
            <h2 className="card__title">💱 실시간 환전 계산기</h2>
            <span className="card__badge">
              1 {settings.from} = {rate === null ? '—' : formatRate(rate)} {settings.to}
            </span>
          </div>

          <div className="converter">
            <div className="converter__side">
              <AmountField
                label="보낼 금액"
                value={settings.amount}
                onChange={(amount) => update({ amount })}
                placeholder="0"
              />
              <CurrencySelect
                label="보낼 통화 (From)"
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
                title="통화 스왑"
              >
                <span aria-hidden="true">⇅</span>
                <span className="visually-hidden">통화 전환</span>
              </button>
            </div>

            <div className="converter__side converter__side--result">
              <AmountField
                label="받을 금액 (결과)"
                value={resultText}
                onChange={() => undefined}
                readOnly
                inputMode="text"
              />
              <CurrencySelect
                label="받을 통화 (To)"
                value={settings.to}
                onChange={(to) => update({ to })}
              />
            </div>
          </div>

          {/* 프리셋 버튼 */}
          <QuickPresets
            currentAmount={settings.amount}
            currencySymbol={getCurrency(settings.from).symbol}
            onSelectPreset={(amount) => update({ amount })}
          />

          {/* 환율 상세 정보 */}
          <section className="rates" aria-label="환율 정보">
            <div className="rates__row">
              <span className="rates__label">1 {settings.from} ({getCurrency(settings.from).name}) =</span>
              <span className="rates__value">
                {rate === null ? '—' : `${formatRate(rate)} ${settings.to}`}
              </span>
            </div>
            <div className="rates__row">
              <span className="rates__label">1 {settings.to} ({getCurrency(settings.to).name}) =</span>
              <span className="rates__value">
                {inverseRate === null ? '—' : `${formatRate(inverseRate)} ${settings.from}`}
              </span>
            </div>
            {snapshot && isExpired(snapshot, now) && (
              <p className="rates__warning">
                ⏰ 마지막 조회에서 5분이 지났습니다. 자동 갱신 중...
              </p>
            )}
          </section>

          {/* 빠른 환산표 */}
          <QuickConversionTable
            from={settings.from}
            to={settings.to}
            rates={rates}
          />
        </section>

        {/* 대시보드 타겟 환율 매트릭스 (대시보드 모드 시 표시) */}
        {activeTab === 'dashboard' && (
          <section className="card card--matrix">
            <RateMatrixTable
              rates={rates}
              baseCurrency={settings.from}
              targetCurrency={settings.to}
              onSelectTargetCurrency={(code) => update({ to: code })}
              onSelectBaseCurrency={(code) => update({ from: code })}
            />
          </section>
        )}
      </div>

      <footer className="app__footer">
        <p>
          🌐 환율 데이터는 ExchangeRate-API 및 유럽중앙은행(ECB Frankfurter) 기반이며, 5분마다 자동 갱신됩니다.
        </p>
      </footer>
    </div>
  );
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** Math.min(decimals, 8);
  return Math.round(value * factor) / factor;
}
