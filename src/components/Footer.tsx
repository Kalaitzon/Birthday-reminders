import { makeT, OWNER_NAME, OWNER_NAME_EN, type Lang } from '../lib/i18n';

export default function Footer({ lang }: { lang: Lang }) {
  const t = makeT(lang);
  const year = new Date().getFullYear();
  const owner = lang === 'en' ? OWNER_NAME_EN : OWNER_NAME;

  return (
    <footer className="app">
      <div className="rule" />
      <p style={{ margin: 0 }}>{t('footerNote')}</p>
      <p className="copy">
        © {year} <strong>{owner}</strong>. {t('rights')}
      </p>
    </footer>
  );
}
