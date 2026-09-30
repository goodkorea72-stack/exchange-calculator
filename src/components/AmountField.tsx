import { useId } from 'react';

interface AmountFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly readOnly?: boolean;
  readonly inputMode?: 'decimal' | 'text';
  readonly placeholder?: string;
}

/** 숫자만 받아들이는 금액 입력 필드 (콤마 구분 허용) */
export function AmountField({
  label,
  value,
  onChange,
  readOnly = false,
  inputMode = 'decimal',
  placeholder,
}: AmountFieldProps) {
  const id = useId();

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="amount"
        type="text"
        inputMode={inputMode}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(sanitizeInput(event.target.value))}
      />
    </div>
  );
}

/** 숫자 · 콤마 · 마이너스 · 소수점만 통과시킨다. */
function sanitizeInput(raw: string): string {
  return raw.replace(/[^\d,.\-]/g, '');
}
