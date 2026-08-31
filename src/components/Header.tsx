import Logo from './Logo';
import type { Lang } from '../lib/i18n';
import { makeT } from '../lib/i18n';

/**
 * Το όνομα της εφαρμογής με το λογότυπο, και ο διακόπτης γλώσσας.
 * Χρησιμοποιείται και στη σελίδα σύνδεσης και στον πίνακα.
 */
export default function Header({
  lang,
  onLang,
  compact = false,
  children,
}: {
  lang: Lang;
  onLang: (l: Lang) => void;
  /** true στη σελίδα σύνδεσης: κεντραρισμένο, χωρίς ενέργειες δεξιά */
  compact?: boolean;
  children?: React.ReactNode;
}) {
  const t = makeT(lang);

  return (
    <header className="app">
      <div className="brand">
        <Logo size={compact ? 48 : 42} />
        <div className="brand-text">
          <h1>{t('appName')}</h1>
          <p className="tagline">{t('tagline')}</p>
        </div>
      </div>

      {!compact && (
        <div className="header-actions">
          <LanguageToggle lang={lang} onLang={onLang} />
          {children}
        </div>
      )}
    </header>
  );
}

export function LanguageToggle({
  lang,
  onLang,
}: {
  lang: Lang;
  onLang: (l: Lang) => void;
}) {
  return (
    <div className="lang" role="group" aria-label="Language / Γλώσσα">
      <button type="button" aria-pressed={lang === 'el'} onClick={() => onLang('el')}>
        ΕΛ
      </button>
      <button type="button" aria-pressed={lang === 'en'} onClick={() => onLang('en')}>
        EN
      </button>
    </div>
  );
}
