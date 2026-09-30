import { useState, useMemo } from 'react';
import { CURRENCIES, getCurrency } from '../domain/currencies';
import { getRate, type RateTable } from '../domain/convert';
import { formatRate } from '../domain/amount';

interface RateMatrixTableProps {
  readonly rates: RateTable;
  readonly baseCurrency: string;
  readonly targetCurrency: string;
  readonly onSelectTargetCurrency: (code: string) => void;
  readonly onSelectBaseCurrency: (code: string) => void;
}

export function RateMatrixTable({
  rates,
  baseCurrency,
  targetCurrency,
  onSelectTargetCurrency,
  onSelectBaseCurrency,
}: RateMatrixTableProps) {
  const [filter, setFilter] = useState('');

  const filteredCurrencies = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return CURRENCIES;
    return CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        c.symbol.toLowerCase().includes(query),
    );
  }, [filter]);

  return (
    <div className="matrix-panel">
      <div className="matrix-panel__header">
        <div>
          <h3 className="matrix-panel__title">전 세계 실시간 환율 매트릭스</h3>
          <p className="matrix-panel__subtitle">
            기준 통화 <strong>{baseCurrency} ({getCurrency(baseCurrency).name})</strong> 대비 모든 통화 환율
          </p>
        </div>
        <div className="matrix-panel__search">
          <input
            type="text"
            className="matrix-panel__input"
            placeholder="통화 검색 (예: USD, 엔, €)..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="matrix-table-wrapper">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>통화 (코드)</th>
              <th>1 {baseCurrency} 환율</th>
              <th>역환율 (1 단위당 {baseCurrency})</th>
              <th>작동</th>
            </tr>
          </thead>
          <tbody>
            {filteredCurrencies.map((curr) => {
              const isBase = curr.code === baseCurrency;
              const isTarget = curr.code === targetCurrency;
              const rate = getRate(baseCurrency, curr.code, rates);
              const inverseRate = getRate(curr.code, baseCurrency, rates);

              return (
                <tr
                  key={curr.code}
                  className={`matrix-row ${isBase ? 'is-base' : ''} ${isTarget ? 'is-target' : ''}`}
                >
                  <td className="matrix-cell__currency">
                    <span className="matrix-cell__symbol">{curr.symbol}</span>
                    <div className="matrix-cell__meta">
                      <span className="matrix-cell__code">{curr.code}</span>
                      <span className="matrix-cell__name">{curr.name}</span>
                    </div>
                  </td>
                  <td className="matrix-cell__rate">
                    {isBase ? '1.0000 (기준)' : rate === null ? '—' : `${formatRate(rate)} ${curr.symbol}`}
                  </td>
                  <td className="matrix-cell__inverse">
                    {isBase ? '1.0000 (기준)' : inverseRate === null ? '—' : `${formatRate(inverseRate)} ${baseCurrency}`}
                  </td>
                  <td className="matrix-cell__actions">
                    {!isBase && (
                      <button
                        type="button"
                        className="btn-pill"
                        onClick={() => onSelectTargetCurrency(curr.code)}
                      >
                        {isTarget ? '선택됨' : '변환 대상으로'}
                      </button>
                    )}
                    {!isBase && (
                      <button
                        type="button"
                        className="btn-pill btn-pill--subtle"
                        onClick={() => onSelectBaseCurrency(curr.code)}
                      >
                        기준으로
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
