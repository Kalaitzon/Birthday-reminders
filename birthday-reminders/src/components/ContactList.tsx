import type { Contact, RelationshipCategory } from '../lib/types';
import { categoryLabel, fullName } from '../lib/types';
import {
  daysUntilBirthday,
  nextBirthday,
  ageOn,
  todayInAthens,
  effectiveMode,
  describeSchedule,
} from '../lib/birthday';
import { makeT, MONTHS, type Lang } from '../lib/i18n';

interface Props {
  contacts: Contact[];
  categories: RelationshipCategory[];
  lang: Lang;
  onEdit: (c: Contact) => void;
  onDelete: (c: Contact) => void;
}

export default function ContactList({ contacts, categories, lang, onEdit, onDelete }: Props) {
  const t = makeT(lang);
  const today = todayInAthens();
  const byCode = new Map(categories.map((c) => [c.code, c]));

  const formatDayMonth = (iso: string) => {
    const [, m, d] = iso.split('-').map(Number);
    return lang === 'en' ? `${MONTHS.en[m - 1]} ${d}` : `${d} ${MONTHS.el[m - 1]}`;
  };

  const countdown = (days: number) =>
    days === 0 ? t('today') : days === 1 ? t('tomorrow') : t('inDays', { n: days });

  const sorted = [...contacts].sort(
    (a, b) =>
      daysUntilBirthday(a.birth_date, today) - daysUntilBirthday(b.birth_date, today) ||
      fullName(a).localeCompare(fullName(b), lang)
  );

  if (sorted.length === 0) {
    return <div className="card center muted">{t('empty')}</div>;
  }

  return (
    <div className="card">
      <h2>
        {t('contacts')} <span className="muted small">({sorted.length})</span>
      </h2>
      <ul className="contacts">
        {sorted.map((c) => {
          const cat = byCode.get(c.category_code);
          const days = daysUntilBirthday(c.birth_date, today);
          const next = nextBirthday(c.birth_date, today);
          const turning = ageOn(c.birth_date, next);
          const tier = cat?.tier ?? 2;
          const mode = effectiveMode(c.notify_mode, tier);
          const overridden = c.notify_mode === 'double' || c.notify_mode === 'single';

          return (
            <li key={c.id}>
              <div className="grow">
                <div className="name">{fullName(c)}</div>
                <div className="meta">
                  {formatDayMonth(c.birth_date)} · {t('turning')} {turning}
                  {c.notify_email ? ` · → ${c.notify_email}` : ''}
                </div>
              </div>

              <span className="badge">{categoryLabel(cat, lang)}</span>

              <span
                className={`bells${overridden ? ' custom' : ''}`}
                title={describeSchedule(c.notify_mode, tier)}
              >
                {mode === 'double' ? '🔔🔔' : '🔔'}
              </span>

              <div className="countdown">
                <strong className={days === 0 ? 'today' : undefined}>{countdown(days)}</strong>
                {formatDayMonth(next)}
              </div>

              <div style={{ display: 'flex' }}>
                <button className="link" onClick={() => onEdit(c)}>
                  {t('edit')}
                </button>
                <button
                  className="link danger"
                  onClick={() => {
                    if (confirm(`${t('confirmDelete')} ${fullName(c)};`)) onDelete(c);
                  }}
                >
                  {t('del')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
