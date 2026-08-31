export type { NotifyMode } from './birthday';
import type { NotifyMode } from './birthday';
import type { Lang } from './i18n';

export type Tier = 1 | 2;

export interface RelationshipCategory {
  code: string;
  label_el: string;
  label_en: string | null;
  /** Δεν εμφανίζεται στην οθόνη — ορίζει μόνο την προεπιλογή υπενθυμίσεων. */
  tier: Tier;
  sort_order: number;
}

/** Η ετικέτα της κατηγορίας στη γλώσσα του χρήστη. */
export function categoryLabel(cat: RelationshipCategory | undefined, lang: Lang): string {
  if (!cat) return '';
  return lang === 'en' ? cat.label_en || cat.label_el : cat.label_el;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  /** Προαιρετικό — σε αντίθεση με το όνομα. */
  surname: string | null;
  /** 'YYYY-MM-DD' */
  birth_date: string;
  category_code: string;
  notify_mode: NotifyMode;
  notify_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Όνομα και επώνυμο μαζί, χωρίς κενό όταν λείπει το επώνυμο. */
export function fullName(c: Pick<Contact, 'name' | 'surname'>): string {
  return c.surname ? `${c.name} ${c.surname}` : c.name;
}

export type ContactInput = Pick<
  Contact,
  'name' | 'birth_date' | 'category_code' | 'notify_mode'
> & {
  surname?: string | null;
  notify_email?: string | null;
  notes?: string | null;
};
