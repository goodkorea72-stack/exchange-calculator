import { getRate, type RateTable } from '../domain/convert';
import { getCurrency } from '../domain/currencies';
import { formatRate } from '../domain/amount';

interface KpiCardsProps {
  readonly rates: RateTable;
  readonly baseCurrency: string;
  readonly onSelectCurrency: (code: string) => void;
}

const MAJOR_CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'CNY'] as const;

export function KpiCards({ rates, baseCurrency, onSelectCurrency }: KpiCardsProps) {
  return (
    <div className="kpi-grid">
      {MAJOR_CURRENCIES.map((code) => {
        if (code === baseCurrency) return null;

        const rate = getRate(code, baseCurrency, rates);
        const inverseRate = getRate(baseCurrency, code, rates);
        const curr = getCurrency(code);
        const baseCurr = getCurrency(baseCurrency);

        return (
          <div
            key={code}
            className="kpi-card"
            onClick={() => onSelectCurrency(code)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectCurrency(code);
              }
            }}
          >
            <div className="kpi-card__header">
              <div className="kpi-card__badge">{curr.symbol}</div>
              <div className="kpi-card__info">
                <span className="kpi-card__code">{code}</span>
                <span className="kpi-card__name">{curr.name}</span>
              </div>
            </div>

            <div className="kpi-card__body">
              <div className="kpi-card__rate">
                {rate === null
                  ? '—'
                  : `${formatRate(rate)} ${baseCurr.symbol}`}
              </div>
              <div className="kpi-card__subtext">
                1 {code} = {rate === null ? '—' : formatRate(rate)} {baseCurrency}
              </div>
            </div>

            <div className="kpi-card__footer">
              <span>1 {baseCurrency} = {inverseRate === null ? '—' : formatRate(inverseRate)} {code}</span>
              <span className="kpi-card__action">선택 →</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
