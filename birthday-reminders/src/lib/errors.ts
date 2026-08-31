/**
 * Το μήνυμα ενός σφάλματος, όποια μορφή κι αν έχει.
 *
 * Γιατί υπάρχει αυτό το αρχείο: το Supabase δεν πετάει `Error`. Επιστρέφει
 * ένα απλό αντικείμενο (`PostgrestError`) με πεδία message / details / hint.
 * Ένας έλεγχος `e instanceof Error` το προσπερνά, οπότε το πραγματικό
 * μήνυμα — «Could not find the 'surname' column», ας πούμε — χάνεται και
 * ο χρήστης βλέπει ένα άχρηστο «Κάτι πήγε στραβά».
 *
 * Ένα σφάλμα που δεν λέει τι έφταιξε κοστίζει περισσότερο από κανένα.
 */
export function errorMessage(e: unknown, fallback: string): string {
  if (typeof e === 'string' && e.trim()) return e;

  if (typeof e === 'object' && e !== null) {
    const o = e as { message?: unknown; hint?: unknown; details?: unknown };
    const parts: string[] = [];
    if (typeof o.message === 'string' && o.message) parts.push(o.message);
    if (typeof o.hint === 'string' && o.hint) parts.push(o.hint);
    else if (typeof o.details === 'string' && o.details) parts.push(o.details);
    if (parts.length) return parts.join(' — ');
  }

  return e instanceof Error && e.message ? e.message : fallback;
}

/**
 * Μερικά σφάλματα της βάσης έχουν μία και μόνη αιτία στην πράξη.
 * Όταν την αναγνωρίζουμε, λέμε κατευθείαν τι να κάνει ο χρήστης.
 */
export function explain(message: string, lang: 'el' | 'en'): string | null {
  const m = message.toLowerCase();

  const missingColumn =
    m.includes("could not find") && (m.includes('surname') || m.includes('notify_mode'));
  const missingCategory = m.includes('foreign key') || m.includes('category_code');

  if (missingColumn || missingCategory) {
    return lang === 'en'
      ? 'The database is a version behind. Run supabase/migration-003-simplify.sql in the Supabase SQL Editor.'
      : 'Η βάση είναι μια έκδοση πίσω. Τρέξε το supabase/migration-003-simplify.sql στο SQL Editor του Supabase.';
  }
  return null;
}
