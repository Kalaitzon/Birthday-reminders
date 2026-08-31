/**
 * Καθαρή λογική ημερομηνιών — χωρίς εξαρτήσεις, χρησιμοποιείται
 * ΚΑΙ από το frontend ΚΑΙ από το cron function στο backend.
 *
 * Κανόνας: όλες οι ημερομηνίες κυκλοφορούν ως strings 'YYYY-MM-DD'.
 * Έτσι δεν υπάρχει ποτέ πρόβλημα με ζώνες ώρας ή θερινή ώρα.
 */

export const TIMEZONE = 'Europe/Athens';

/** Η σημερινή ημερομηνία στην Ελλάδα, ως 'YYYY-MM-DD'. */
export function todayInAthens(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Η τρέχουσα ώρα (0-23) στην Ελλάδα. */
export function hourInAthens(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      hour12: false,
    }).format(now)
  );
}

/** Προσθέτει (ή αφαιρεί) μέρες σε ένα 'YYYY-MM-DD'. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Έχει η επαφή γενέθλια την ημερομηνία-στόχο;
 *
 * Ειδική περίπτωση: όποιος γεννήθηκε 29 Φεβρουαρίου γιορτάζει
 * 28 Φεβρουαρίου στα μη-δίσεκτα έτη (αλλιώς δεν θα έπαιρνε ποτέ email).
 */
export function isBirthdayOn(birthDate: string, targetIso: string): boolean {
  const [, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = targetIso.split('-').map(Number);

  if (bm === tm && bd === td) return true;

  // 29/02 σε μη-δίσεκτο έτος → γιορτάζει 28/02
  if (bm === 2 && bd === 29 && tm === 2 && td === 28 && !isLeapYear(ty)) {
    return true;
  }
  return false;
}

/** Πόσα χρόνια κλείνει η επαφή την ημερομηνία-στόχο. */
export function ageOn(birthDate: string, targetIso: string): number {
  const by = Number(birthDate.slice(0, 4));
  const ty = Number(targetIso.slice(0, 4));
  return ty - by;
}

/** Μετατρέπει 'YYYY-MM-DD' σε timestamp UTC (μεσάνυχτα). */
function toUtcMillis(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Η επόμενη επέτειος γενεθλίων (ως 'YYYY-MM-DD'), από το `fromIso` και μετά. */
export function nextBirthday(birthDate: string, fromIso: string): string {
  const fromYear = Number(fromIso.slice(0, 4));
  const md = birthDate.slice(5);
  for (const year of [fromYear, fromYear + 1, fromYear + 2]) {
    const candidate =
      md === '02-29' && !isLeapYear(year) ? `${year}-02-28` : `${year}-${md}`;
    if (candidate >= fromIso) return candidate;
  }
  return `${fromYear + 1}-${md}`;
}

/** Πόσες μέρες μένουν μέχρι τα επόμενα γενέθλια (0 = σήμερα). */
export function daysUntilBirthday(birthDate: string, fromIso: string): number {
  const target = nextBirthday(birthDate, fromIso);
  return Math.round((toUtcMillis(target) - toUtcMillis(fromIso)) / 86_400_000);
}

/**
 * Ποια ημερομηνία γενεθλίων αφορά κάθε slot.
 *  - 'eve'  : τρέχει στις 23:59 της μέρας ΠΡΙΝ → αφορά το ΑΥΡΙΟ
 *  - 'noon' : τρέχει στις 12:00 της ίδιας μέρας → αφορά το ΣΗΜΕΡΑ
 */
export type Slot = 'eve' | 'noon';

export function targetDateForSlot(slot: Slot, todayIso: string): string {
  return slot === 'eve' ? addDays(todayIso, 1) : todayIso;
}

/* ------------------------------------------------------------------ *
 *  Πόσες ειδοποιήσεις ανά επαφή
 * ------------------------------------------------------------------ */

/**
 * Τι έχει επιλέξει ο χρήστης για τη συγκεκριμένη επαφή.
 *  - 'auto'   → ακολούθησε το tier της σχέσης (προεπιλογή)
 *  - 'double' → 2 ειδοποιήσεις, ό,τι κι αν λέει το tier
 *  - 'single' → 1 ειδοποίηση, ό,τι κι αν λέει το tier
 */
export type NotifyMode = 'auto' | 'double' | 'single';

/** Το tier δίνει την προεπιλογή· η ρητή επιλογή του χρήστη υπερισχύει. */
export function effectiveMode(
  mode: NotifyMode | null | undefined,
  tier: number
): 'double' | 'single' {
  if (mode === 'double' || mode === 'single') return mode;
  return tier === 1 ? 'double' : 'single';
}

/** Στέλνουμε email σε αυτή την επαφή, σε αυτό το slot; */
export function shouldNotify(
  slot: Slot,
  mode: NotifyMode | null | undefined,
  tier: number
): boolean {
  // Το μεσημεριανό το παίρνουν όλοι· η παραμονή μόνο όσοι έχουν διπλή.
  return slot === 'noon' || effectiveMode(mode, tier) === 'double';
}

/** Περιγραφή για το UI. */
export function describeSchedule(
  mode: NotifyMode | null | undefined,
  tier: number
): string {
  return effectiveMode(mode, tier) === 'double'
    ? '2 ειδοποιήσεις: 23:59 την παραμονή και 12:00 την ημέρα'
    : '1 ειδοποίηση: 12:00 την ημέρα των γενεθλίων';
}
