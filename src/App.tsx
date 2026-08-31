import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { effectiveMode } from './lib/birthday';
import { loadLang, saveLang, makeT, type Lang } from './lib/i18n';
import { errorMessage, explain } from './lib/errors';
import type { Contact, ContactInput, RelationshipCategory } from './lib/types';
import Background from './components/Background';
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './components/Login';
import ContactForm from './components/ContactForm';
import ContactList from './components/ContactList';

export default function App() {
  const [lang, setLang] = useState<Lang>(loadLang);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<RelationshipCategory[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Η makeT φτιάχνει ΝΕΑ συνάρτηση σε κάθε κλήση. Χωρίς useMemo, το `t`
   * άλλαζε ταυτότητα σε κάθε render· το `describe` που εξαρτάται από αυτό
   * άλλαζε κι εκείνο, μαζί του το `load`, και το useEffect που παρακολουθεί
   * το `load` ξανακαλούσε τη βάση — ατέρμονα. Κάθε φόρτωση έδινε νέους
   * πίνακες, που ξαναέγραφαν τη φόρμα και έσβηναν ό,τι πληκτρολογούσε
   * ο χρήστης. Μία γραμμή, τρία επίπεδα παρακάτω.
   */
  const t = useMemo(() => makeT(lang), [lang]);

  function changeLang(l: Lang) {
    setLang(l);
    saveLang(l);
    document.documentElement.lang = l;
  }

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /** Το μήνυμα της βάσης, με οδηγία από πάνω όταν την αναγνωρίζουμε. */
  const describe = useCallback(
    (e: unknown) => {
      const raw = errorMessage(e, t('somethingWrong'));
      const hint = explain(raw, lang);
      return hint ? `${hint}\n(${raw})` : raw;
    },
    [lang, t]
  );

  const load = useCallback(async () => {
    const [cats, rows] = await Promise.all([
      supabase.from('relationship_categories').select('*').order('sort_order'),
      supabase.from('contacts').select('*').order('name'),
    ]);
    if (cats.error) return setError(describe(cats.error));
    if (rows.error) return setError(describe(rows.error));
    setCategories(cats.data as RelationshipCategory[]);
    setContacts(rows.data as Contact[]);
    setError(null);
  }, [describe]);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  async function save(input: ContactInput) {
    if (editing) {
      const { error } = await supabase.from('contacts').update(input).eq('id', editing.id);
      if (error) throw error;
      setEditing(null);
    } else {
      const { error } = await supabase
        .from('contacts')
        .insert({ ...input, user_id: session!.user.id });
      if (error) throw error;
    }
    await load();
  }

  async function remove(c: Contact) {
    const { error } = await supabase.from('contacts').delete().eq('id', c.id);
    if (error) return setError(describe(error));
    if (editing?.id === c.id) setEditing(null);
    await load();
  }

  if (!ready) return <Background />;

  if (!session) {
    return (
      <>
        <Background />
        <Login lang={lang} onLang={changeLang} />
        <Footer lang={lang} />
      </>
    );
  }

  const doubles = contacts.filter(
    (c) =>
      effectiveMode(
        c.notify_mode,
        categories.find((k) => k.code === c.category_code)?.tier ?? 2
      ) === 'double'
  ).length;

  return (
    <>
      <Background />

      <div className="wrap">
        <Header lang={lang} onLang={changeLang}>
          <button className="ghost" onClick={() => supabase.auth.signOut()}>
            {t('signOut')}
          </button>
        </Header>

        <div className="who" style={{ marginTop: -14, marginBottom: 18 }}>
          {session.user.email} · {contacts.length} {t('contactsWord')} ({doubles}{' '}
          {t('withDouble')})
        </div>

        {error && (
          <div className="notice error" style={{ whiteSpace: 'pre-line' }}>
            {error}
          </div>
        )}

        <ContactForm
          categories={categories}
          editing={editing}
          lang={lang}
          onSave={save}
          onCancel={() => setEditing(null)}
        />

        <ContactList
          contacts={contacts}
          categories={categories}
          lang={lang}
          onEdit={setEditing}
          onDelete={remove}
        />
      </div>

      <Footer lang={lang} />
    </>
  );
}
