/**
 * Δύο γλώσσες, ένα αρχείο.
 *
 * Κάθε κείμενο της οθόνης ζει εδώ, σε ζευγάρι el/en. Η επιλογή του
 * χρήστη μένει στον browser του, οπότε την επόμενη φορά ανοίγει
 * στη γλώσσα που άφησε. Προεπιλογή: ελληνικά.
 */

export type Lang = 'el' | 'en';
export const DEFAULT_LANG: Lang = 'en';

const STORAGE_KEY = 'birthday-lang';

export function loadLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'el' || saved === 'en') return saved;
  } catch {
    // ιδιωτικό παράθυρο ή κλειδωμένη αποθήκευση — πέφτουμε στην προεπιλογή
  }
  return DEFAULT_LANG;
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // αδιάφορο· η γλώσσα ισχύει για την τρέχουσα συνεδρία
  }
}

type Dict = Record<string, { el: string; en: string }>;

const STRINGS: Dict = {
  appName:        { el: 'Γενεθλιολόγιο',        en: 'Birthday Calendar' },
  tagline:        { el: 'Υπενθυμίσεις γενεθλίων',    en: 'Birthday reminders' },

  // Σύνδεση
  signInTitle:    { el: 'Σύνδεση στον πίνακά σου.',  en: 'Sign in to your dashboard.' },
  signUpTitle:    { el: 'Δημιουργία λογαριασμού.',   en: 'Create an account.' },
  email:          { el: 'Email',                     en: 'Email' },
  password:       { el: 'Κωδικός',                   en: 'Password' },
  signIn:         { el: 'Σύνδεση',                   en: 'Sign in' },
  signUp:         { el: 'Εγγραφή',                   en: 'Sign up' },
  noAccount:      { el: 'Δεν έχω λογαριασμό',        en: "I don't have an account" },
  haveAccount:    { el: 'Έχω ήδη λογαριασμό',        en: 'I already have an account' },
  checkEmail:     { el: 'Έγινε! Έλεγξε το email σου για επιβεβαίωση και μετά συνδέσου.',
                    en: 'Done! Check your email to confirm, then sign in.' },
  signOut:        { el: 'Αποσύνδεση',                en: 'Sign out' },

  // Φόρμα
  newContact:     { el: 'Νέα επαφή',                 en: 'New contact' },
  editing:        { el: 'Επεξεργασία',               en: 'Editing' },
  firstName:      { el: 'Όνομα',                     en: 'First name' },
  surname:        { el: 'Επώνυμο',                   en: 'Surname' },
  optional:       { el: 'προαιρετικό',               en: 'optional' },
  birthDate:      { el: 'Ημερομηνία γέννησης',       en: 'Date of birth' },
  relationship:   { el: 'Σχέση',                     en: 'Relationship' },
  recipientEmail: { el: 'Email παραλήπτη',           en: 'Recipient email' },
  recipientHint:  { el: 'αλλιώς στο δικό σου',       en: 'otherwise yours' },
  reminders:      { el: 'Υπενθυμίσεις',              en: 'Reminders' },
  modeAuto:       { el: 'Αυτόματο',                  en: 'Automatic' },
  modeDouble:     { el: 'Διπλή',                     en: 'Double' },
  modeSingle:     { el: 'Μονή',                      en: 'Single' },
  scheduleDouble: { el: '2 ειδοποιήσεις: 23:59 την παραμονή και 12:00 την ημέρα',
                    en: '2 reminders: 23:59 the night before and 12:00 on the day' },
  scheduleSingle: { el: '1 ειδοποίηση: 12:00 την ημέρα των γενεθλίων',
                    en: '1 reminder: 12:00 on the day' },
  fromRelation:   { el: 'από τη σχέση που διάλεξες',  en: 'based on the relationship' },
  add:            { el: 'Προσθήκη',                  en: 'Add' },
  save:           { el: 'Αποθήκευση',                en: 'Save' },
  saving:         { el: 'Αποθήκευση...',             en: 'Saving...' },
  cancel:         { el: 'Άκυρο',                     en: 'Cancel' },
  somethingWrong: { el: 'Κάτι πήγε στραβά.',         en: 'Something went wrong.' },

  // Λίστα
  contacts:       { el: 'Επαφές',                    en: 'Contacts' },
  empty:          { el: 'Δεν έχεις προσθέσει ακόμα καμία επαφή.',
                    en: "You haven't added any contacts yet." },
  edit:           { el: 'Επεξ.',                     en: 'Edit' },
  del:            { el: 'Διαγρ.',                    en: 'Delete' },
  confirmDelete:  { el: 'Διαγραφή του/της',          en: 'Delete' },
  turning:        { el: 'κλείνει τα',                en: 'turning' },
  today:          { el: 'σήμερα!',                   en: 'today!' },
  tomorrow:       { el: 'αύριο',                     en: 'tomorrow' },
  inDays:         { el: 'σε {n} μέρες',              en: 'in {n} days' },
  contactsWord:   { el: 'επαφές',                    en: 'contacts' },
  withDouble:     { el: 'με διπλή υπενθύμιση',       en: 'with a double reminder' },

  // Υποσέλιδο
  footerNote:     { el: 'Ώρα Ελλάδας. Στο πρώτο email υπάρχει κουμπί για να ακυρώσεις τη δεύτερη υπενθύμιση.',
                    en: 'Greek time. The first email carries a button to cancel the second reminder.' },
  rights:         { el: 'Με επιφύλαξη παντός δικαιώματος.',
                    en: 'All rights reserved.' },
};

export function makeT(lang: Lang) {
  return function t(key: keyof typeof STRINGS, vars?: Record<string, string | number>): string {
    const entry = STRINGS[key as string];
    let out = entry ? entry[lang] : (key as string);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        out = out.replace(`{${k}}`, String(v));
      }
    }
    return out;
  };
}

/** Σύντομοι μήνες, για την εμφάνιση ημερομηνιών. */
export const MONTHS: Record<Lang, string[]> = {
  el: ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export const OWNER_NAME = 'Ιωάννης Καλαϊτζίδης';
export const OWNER_NAME_EN = 'Ioannis Kalaitzidis';
