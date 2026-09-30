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
      <button
        type="button"
        className="settings__toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        {open ? '설정 닫기' : 'API 설정'}
      </button>

      {open && (
        <div className="settings__body">
          <p className="settings__hint">
            <strong>exchangerate-api</strong> 키를 넣으면 실시간 환율을 사용합니다.
            비워 두면 키가 필요 없는 ECB 기준 환율(Frankfurter)로 자동 전환됩니다.
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
              placeholder="exchangerate-api 키 (선택)"
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
            현재 사용 중:{' '}
            {effective ? 'exchangerate-api (실시간)' : 'Frankfurter · ECB 기준'}
            {envApiKey && !apiKey ? ' — .env 기본값 사용 중' : ''}
          </p>
          <p className="settings__note">
            키는 이 브라우저의 localStorage에만 저장되며 외부로 전송되지
            않습니다(exchangerate-api 요청 시에만 사용).
          </p>
        </div>
      )}
    </div>
  );
}
