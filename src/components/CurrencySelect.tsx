import { useId } from 'react';

import { CURRENCIES, getCurrency } from '../domain/currencies';

interface CurrencySelectProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (code: string) => void;
  readonly disabled?: boolean;
}

/** 통화 선택 드롭다운 */
export function CurrencySelect({
  label,
  value,
  onChange,
  disabled = false,
}: CurrencySelectProps) {
  const id = useId();
  const currency = getCurrency(value);

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="select">
        <span className="select__symbol" aria-hidden="true">
          {currency.symbol}
        </span>
        <select
          id={id}
          className="select__control"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {CURRENCIES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.code} · {item.name}
            </option>
          ))}
        </select>
        <span className="select__chevron" aria-hidden="true">
          ▾
        </span>
      </div>
    </div>
  );
}
