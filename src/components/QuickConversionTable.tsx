import { convert, type RateTable } from '../domain/convert';
import { getCurrency } from '../domain/currencies';
import { formatCurrency } from '../domain/amount';

interface QuickConversionTableProps {
  readonly from: string;
  readonly to: string;
  readonly rates: RateTable;
}

const AMOUNTS = [1, 5, 10, 50, 100, 500, 1000, 5000];

export function QuickConversionTable({
  from,
  to,
  rates,
}: QuickConversionTableProps) {
  const fromCurr = getCurrency(from);
  const toCurr = getCurrency(to);

  return (
    <div className="quick-table-card">
      <h4 className="quick-table-card__title">
        {from} ({fromCurr.symbol}) ➔ {to} ({toCurr.symbol}) 빠른 환산표
      </h4>
      <div className="quick-table-grid">
        {AMOUNTS.map((amt) => {
          const res = convert(amt, from, to, rates);
          return (
            <div key={amt} className="quick-table-item">
              <span className="quick-table-item__from">
                {fromCurr.symbol}{amt.toLocaleString()} {from}
              </span>
              <span className="quick-table-item__arrow">➔</span>
              <span className="quick-table-item__to">
                {res.ok ? formatCurrency(res.value, to) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
