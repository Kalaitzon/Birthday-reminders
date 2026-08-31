/**
 * Πάγκος δοκιμών — ΔΕΝ είναι μέρος της εφαρμογής.
 *
 * Αναπαράγει την ακριβή συνθήκη του bug: ο γονέας ξαναφτιάχνει τον
 * πίνακα `categories` συνέχεια (νέα ταυτότητα αντικειμένου κάθε φορά,
 * ίδιο περιεχόμενο), όπως γινόταν όταν το `load()` καλούνταν σε κάθε
 * render. Αν η φόρμα μηδενίζει τα πεδία σε κάθε τέτοια αλλαγή, ό,τι
 * γράφει ο χρήστης εξαφανίζεται.
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ContactForm from './components/ContactForm';
import type { RelationshipCategory, ContactInput } from './lib/types';
import './index.css';

const CATS: Omit<RelationshipCategory, never>[] = [
  { code: 'parent', label_el: 'Γονέας', label_en: 'Parent', tier: 1, sort_order: 10 },
  { code: 'friend', label_el: 'Φίλος/Φίλη', label_en: 'Friend', tier: 2, sort_order: 80 },
];

/** Μια υπάρχουσα επαφή με επώνυμο, όπως θα ερχόταν από τη βάση. */
const EXISTING = {
  id: 'c-1',
  user_id: 'u-1',
  name: 'Χριστίνα',
  surname: 'Καντζιάρη',
  birth_date: '2002-08-04',
  category_code: 'parent',
  notify_mode: 'auto' as const,
  notify_email: null,
  notes: null,
  created_at: '',
  updated_at: '',
};

function Harness() {
  const [tick, setTick] = useState(0);
  const [mode, setMode] = useState<'new' | 'edit'>(
    location.hash === '#edit' ? 'edit' : 'new'
  );

  // Κάθε 150ms δίνουμε ΝΕΑ αντικείμενα με το ίδιο περιεχόμενο.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 150);
    const onHash = () => setMode(location.hash === '#edit' ? 'edit' : 'new');
    addEventListener('hashchange', onHash);
    return () => {
      clearInterval(id);
      removeEventListener('hashchange', onHash);
    };
  }, []);

  const categories = CATS.map((c) => ({ ...c })) as RelationshipCategory[];
  // Και η επαφή ξαναφτιάχνεται: νέα ταυτότητα, ίδιο περιεχόμενο.
  const editing = mode === 'edit' ? { ...EXISTING } : null;

  return (
    <div className="wrap">
      <p data-testid="tick">ανανεώσεις: {tick}</p>
      <ContactForm
        categories={categories}
        editing={editing}
        lang="el"
        onSave={async (_input: ContactInput) => {}}
        onCancel={() => {}}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
