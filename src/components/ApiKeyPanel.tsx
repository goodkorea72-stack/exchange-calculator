import { useState } from 'react';

interface ApiKeyPanelProps {
  readonly apiKey: string | undefined;
  readonly envApiKey: string | undefined;
  readonly onSave: (apiKey: string | undefined) => void;
}

/** exchangerate-api 키 설정 패널 (없으면 무료 폴백 소스로 동작) */
export function ApiKeyPanel({ apiKey, envApiKey, onSave }: ApiKeyPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(apiKey ?? '');

  const effective = apiKey ?? envApiKey;

  return (
    <div className="settings">
      <div className="settings__toggle-group">
        <a
          href="https://www.exchangerate-api.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="api-link-badge"
          title="ExchangeRate-API 공식 사이트로 이동 (무료 API 키 발급)"
        >
          🌐 ExchangeRate-API 🔗
        </a>
        <button
          type="button"
          className="settings__toggle"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          {open ? '설정 닫기' : '🔑 API 키 설정'}
        </button>
      </div>

      {open && (
        <div className="settings__body">
          <p className="settings__hint">
            <strong>exchangerate-api</strong> 키를 입력하면 실시간 환율을 연동합니다.{' '}
            <a
              href="https://www.exchangerate-api.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="settings__external-link"
            >
              👉 무료 API 키 발급받기 (www.exchangerate-api.com)
            </a>
          </p>

          <form
            className="settings__form"
            onSubmit={(event) => {
              event.preventDefault();
              onSave(draft.trim() === '' ? undefined : draft.trim());
            }}
          >
            <input
              className="settings__input"
              type="password"
              value={draft}
              placeholder="exchangerate-api 키 입력"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" className="settings__save">
              저장
            </button>
            <button
              type="button"
              className="settings__clear"
              onClick={() => {
                setDraft('');
                onSave(undefined);
              }}
            >
              삭제
            </button>
          </form>

          <p className="settings__status">
            현재 사용 소스:{' '}
            {effective ? (
              <a
                href="https://www.exchangerate-api.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="settings__link"
              >
                ExchangeRate-API (실시간 🔗)
              </a>
            ) : (
              <a
                href="https://www.frankfurter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="settings__link"
              >
                Frankfurter · ECB 기준 (무료 🔗)
              </a>
            )}
            {envApiKey && !apiKey ? ' — .env 기본값' : ''}
          </p>
          <p className="settings__note">
            입력한 키는 브라우저의 localStorage에만 암호화 저장되며 외부 서버로 전송되지 않습니다.
          </p>
        </div>
      )}
    </div>
  );
}
