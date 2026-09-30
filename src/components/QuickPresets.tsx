import { formatAmountInput } from '../domain/amount';

interface QuickPresetsProps {
  readonly currentAmount: string;
  readonly currencySymbol: string;
  readonly onSelectPreset: (amount: string) => void;
}

const PRESET_VALUES = [10, 50, 100, 500, 1000, 5000];

export function QuickPresets({
  currentAmount,
  currencySymbol,
  onSelectPreset,
}: QuickPresetsProps) {
  return (
    <div className="presets-container">
      <span className="presets-label">빠른 금액 선택:</span>
      <div className="presets-list">
        {PRESET_VALUES.map((val) => {
          const formatted = formatAmountInput(val);
          const isActive = currentAmount === formatted;
          return (
            <button
              key={val}
              type="button"
              className={`preset-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => onSelectPreset(formatted)}
            >
              {currencySymbol}{val.toLocaleString()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
