import { useEffect, useState } from 'react';
import type { Contact, ContactInput, NotifyMode, RelationshipCategory } from '../lib/types';
import { categoryLabel } from '../lib/types';
import { effectiveMode } from '../lib/birthday';
import { makeT, type Lang } from '../lib/i18n';
import { errorMessage, explain } from '../lib/errors';

interface Props {
  categories: RelationshipCategory[];
  editing: Contact | null;
  lang: Lang;
  onSave: (input: ContactInput) => Promise<void>;
  onCancel: () => void;
}

const EMPTY: ContactInput = {
  name: '',
  surname: null,
  birth_date: '',
  category_code: '',
  notify_mode: 'auto',
  notify_email: null,
};

export default function ContactForm({ categories, editing, lang, onSave, onCancel }: Props) {
  const t = makeT(lang);
  const [form, setForm] = useState<ContactInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const modes: Array<{ value: NotifyMode; label: string }> = [
    { value: 'auto', label: t('modeAuto') },
    { value: 'double', label: t('modeDouble') },
    { value: 'single', label: t('modeSingle') },
  ];

  /**
   * Γέμισε τη φόρμα ΜΟΝΟ όταν αλλάζει ποια επαφή επεξεργαζόμαστε.
   *
   * Η εξάρτηση είναι το `id`, όχι το αντικείμενο `editing` ούτε ο πίνακας
   * `categories`. Οι πίνακες και τα αντικείμενα που έρχονται από τη βάση
   * παίρνουν νέα ταυτότητα σε κάθε φόρτωση — ακόμη κι όταν το περιεχόμενο
   * είναι πανομοιότυπο. Αν κρεμόμασταν από αυτά, κάθε ανανέωση θα
   * ξαναέγραφε τη φόρμα και θα έσβηνε ό,τι πληκτρολογεί ο χρήστης.
   */
  const editingId = editing?.id ?? null;

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        surname: editing.surname,
        birth_date: editing.birth_date,
        category_code: editing.category_code,
        notify_mode: editing.notify_mode ?? 'auto',
        notify_email: editing.notify_email,
      });
    } else {
      setForm({ ...EMPTY });
    }
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  /**
   * Οι κατηγορίες φτάνουν από τη βάση λίγο μετά το πρώτο render, οπότε
   * η άδεια φόρμα δεν έχει ακόμα προεπιλογή. Τη συμπληρώνουμε μόλις
   * έρθουν — και μόνο αν είναι όντως κενή, ώστε να μην πατάμε ποτέ
   * πάνω σε επιλογή του χρήστη.
   */
  useEffect(() => {
    if (!form.category_code && categories.length > 0) {
      setForm((f) => ({ ...f, category_code: categories[0].code }));
    }
  }, [categories, form.category_code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        surname: form.surname?.trim() || null,
        notify_email: form.notify_email?.trim() || null,
      });
      if (!editing) setForm({ ...EMPTY, category_code: categories[0]?.code ?? '' });
    } catch (e) {
      // Δείξε τι είπε πραγματικά η βάση, όχι μια γενικότητα.
      const raw = errorMessage(e, t('somethingWrong'));
      const hint = explain(raw, lang);
      setErr(hint ? `${hint}\n(${raw})` : raw);
    } finally {
      setBusy(false);
    }
  }

  const tier = categories.find((c) => c.code === form.category_code)?.tier ?? 2;
  const autoLabel =
    effectiveMode('auto', tier) === 'double' ? t('modeDouble') : t('modeSingle');
  const schedule =
    effectiveMode(form.notify_mode, tier) === 'double'
      ? t('scheduleDouble')
      : t('scheduleSingle');

  return (
    <form className="card" onSubmit={submit}>
      <h2>{editing ? `${t('editing')}: ${editing.name}` : t('newContact')}</h2>

      {err && (
        <div className="notice error" style={{ whiteSpace: 'pre-line' }}>
          {err}
        </div>
      )}

      <div className="row">
        <div>
          <label htmlFor="name">
            {t('firstName')}<span className="req">*</span>
          </label>
          <input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="surname">
            {t('surname')} <span className="opt">({t('optional')})</span>
          </label>
          <input
            id="surname"
            value={form.surname ?? ''}
            onChange={(e) => setForm({ ...form, surname: e.target.value })}
          />
        </div>
      </div>

      <div className="row">
        <div>
          <label htmlFor="dob">
            {t('birthDate')}<span className="req">*</span>
          </label>
          <input
            id="dob"
            type="date"
            required
            max={new Date().toISOString().slice(0, 10)}
            value={form.birth_date}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="cat">
            {t('relationship')}<span className="req">*</span>
          </label>
          <select
            id="cat"
            required
            value={form.category_code}
            onChange={(e) => setForm({ ...form, category_code: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.code} value={c.code}>
                {categoryLabel(c, lang)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row">
        <div>
          <label htmlFor="mail">
            {t('recipientEmail')} <span className="opt">({t('recipientHint')})</span>
          </label>
          <input
            id="mail"
            type="email"
            value={form.notify_email ?? ''}
            onChange={(e) => setForm({ ...form, notify_email: e.target.value })}
          />
        </div>
      </div>

      <fieldset className="modes">
        <legend>{t('reminders')}</legend>
        <div className="segmented">
          {modes.map((m) => (
            <label key={m.value} className={form.notify_mode === m.value ? 'on' : ''}>
              <input
                type="radio"
                name="notify_mode"
                value={m.value}
                checked={form.notify_mode === m.value}
                onChange={() => setForm({ ...form, notify_mode: m.value })}
              />
              {m.value === 'auto' ? `${m.label} · ${autoLabel}` : m.label}
            </label>
          ))}
        </div>
        <p className="muted small" style={{ margin: '9px 0 0' }}>
          {schedule}
          {form.notify_mode === 'auto' && ` — ${t('fromRelation')}.`}
        </p>
      </fieldset>

      <div style={{ display: 'flex', gap: 9 }}>
        <button type="submit" disabled={busy}>
          {busy ? t('saving') : editing ? t('save') : t('add')}
        </button>
        {editing && (
          <button type="button" className="ghost" onClick={onCancel}>
            {t('cancel')}
          </button>
        )}
      </div>
    </form>
  );
}
