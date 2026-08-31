import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { makeT, type Lang } from '../lib/i18n';
import Header, { LanguageToggle } from './Header';

export default function Login({
  lang,
  onLang,
}: {
  lang: Lang;
  onLang: (l: Lang) => void;
}) {
  const t = makeT(lang);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) setErr(error.message);
    else if (mode === 'signup') setMsg(t('checkEmail'));

    setBusy(false);
  }

  return (
    <div className="wrap login">
      <Header lang={lang} onLang={onLang} compact />

      <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 18px' }}>
        <LanguageToggle lang={lang} onLang={onLang} />
      </div>

      <div className="card">
        <p className="muted small center" style={{ marginTop: 0 }}>
          {mode === 'signin' ? t('signInTitle') : t('signUpTitle')}
        </p>

        {err && <div className="notice error">{err}</div>}
        {msg && <div className="notice">{msg}</div>}

        <form onSubmit={submit}>
          <div style={{ marginBottom: 13 }}>
            <label htmlFor="email">{t('email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              autoComplete="email"
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="password">{t('password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? '…' : mode === 'signin' ? t('signIn') : t('signUp')}
          </button>
        </form>

        <p className="center small" style={{ marginBottom: 0 }}>
          <button
            className="link"
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setErr(null);
              setMsg(null);
            }}
          >
            {mode === 'signin' ? t('noAccount') : t('haveAccount')}
          </button>
        </p>
      </div>
    </div>
  );
}
