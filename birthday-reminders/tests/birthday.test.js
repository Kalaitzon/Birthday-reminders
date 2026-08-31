import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  isLeapYear,
  isBirthdayOn,
  ageOn,
  nextBirthday,
  daysUntilBirthday,
  targetDateForSlot,
  effectiveMode,
  shouldNotify,
  todayInAthens,
  hourInAthens,
} from './build/birthday.js';

test('addDays περνάει σωστά τα όρια μήνα/χρόνου', () => {
  assert.equal(addDays('2026-08-31', 1), '2026-09-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
});

test('isLeapYear', () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2026), false);
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2000), true);
});

test('isBirthdayOn: κανονική περίπτωση', () => {
  assert.equal(isBirthdayOn('1990-05-14', '2026-05-14'), true);
  assert.equal(isBirthdayOn('1990-05-14', '2026-05-15'), false);
});

test('isBirthdayOn: 29 Φεβρουαρίου', () => {
  assert.equal(isBirthdayOn('1992-02-29', '2028-02-29'), true, 'δίσεκτο → 29/2');
  assert.equal(isBirthdayOn('1992-02-29', '2026-02-28'), true, 'μη δίσεκτο → 28/2');
  assert.equal(isBirthdayOn('1992-02-29', '2028-02-28'), false, 'δίσεκτο → όχι 28/2');
});

test('ageOn', () => {
  assert.equal(ageOn('1990-05-14', '2026-05-14'), 36);
});

test('nextBirthday & daysUntilBirthday', () => {
  assert.equal(nextBirthday('1990-09-05', '2026-08-29'), '2026-09-05');
  assert.equal(daysUntilBirthday('1990-09-05', '2026-08-29'), 7);

  // γενέθλια σήμερα
  assert.equal(daysUntilBirthday('1990-08-29', '2026-08-29'), 0);

  // πέρασαν φέτος → του χρόνου
  assert.equal(nextBirthday('1990-01-10', '2026-08-29'), '2027-01-10');
  assert.equal(daysUntilBirthday('1990-01-10', '2026-08-29'), 134);

  // 29/2 από μη-δίσεκτο έτος
  assert.equal(nextBirthday('1992-02-29', '2026-03-01'), '2027-02-28');
});

test('slots: ποια ημερομηνία αφορά το καθένα', () => {
  // 23:59 στις 4/9 → αφορά τα γενέθλια της 5/9
  assert.equal(targetDateForSlot('eve', '2026-09-04'), '2026-09-05');
  // 12:00 στις 5/9 → αφορά τα γενέθλια της 5/9
  assert.equal(targetDateForSlot('noon', '2026-09-05'), '2026-09-05');
});

test('effectiveMode: το tier δίνει την προεπιλογή', () => {
  assert.equal(effectiveMode('auto', 1), 'double');
  assert.equal(effectiveMode('auto', 2), 'single');
  assert.equal(effectiveMode(null, 1), 'double', 'κενό = auto');
  assert.equal(effectiveMode(undefined, 2), 'single');
});

test('effectiveMode: η επιλογή του χρήστη υπερισχύει του tier', () => {
  // Tier 1 αλλά ο χρήστης θέλει μόνο μία
  assert.equal(effectiveMode('single', 1), 'single');
  // Tier 2 φίλος που ο χρήστης θέλει να τον θυμάται διπλά
  assert.equal(effectiveMode('double', 2), 'double');
});

test('shouldNotify: το μεσημεριανό το παίρνουν όλοι', () => {
  assert.equal(shouldNotify('noon', 'auto', 1), true);
  assert.equal(shouldNotify('noon', 'auto', 2), true);
  assert.equal(shouldNotify('noon', 'single', 1), true);
  assert.equal(shouldNotify('noon', 'double', 2), true);
});

test('shouldNotify: την παραμονή μόνο όσοι έχουν διπλή', () => {
  assert.equal(shouldNotify('eve', 'auto', 1), true, 'Tier 1 by default');
  assert.equal(shouldNotify('eve', 'auto', 2), false, 'Tier 2 by default');
  assert.equal(shouldNotify('eve', 'single', 1), false, 'Tier 1 που κατέβηκε σε μονή');
  assert.equal(shouldNotify('eve', 'double', 2), true, 'Tier 2 που ανέβηκε σε διπλή');
});

test('ώρα Ελλάδας: θερινή και χειμερινή', () => {
  // 20:59 UTC στις 4/9 (θερινή ώρα, UTC+3) = 23:59 Αθήνα
  const summer = new Date('2026-09-04T20:59:00Z');
  assert.equal(todayInAthens(summer), '2026-09-04');
  assert.equal(hourInAthens(summer), 23);

  // 21:59 UTC στις 4/12 (χειμερινή ώρα, UTC+2) = 23:59 Αθήνα
  const winter = new Date('2026-12-04T21:59:00Z');
  assert.equal(todayInAthens(winter), '2026-12-04');
  assert.equal(hourInAthens(winter), 23);

  // 22:30 UTC = 01:30 της επόμενης μέρας στην Αθήνα (θερινή)
  const rollover = new Date('2026-09-04T22:30:00Z');
  assert.equal(todayInAthens(rollover), '2026-09-05');
});

test('σενάριο end-to-end: ποιος παίρνει τι', () => {
  const contacts = [
    { name: 'Μητέρα', birth_date: '1965-09-05', tier: 1, mode: 'auto' },
    { name: 'Φίλος', birth_date: '1995-09-05', tier: 2, mode: 'auto' },
    { name: 'Ξάδερφος', birth_date: '1998-09-06', tier: 2, mode: 'auto' },
    // Κολλητός Tier 2 που ο χρήστης ανέβασε σε διπλή
    { name: 'Κολλητός', birth_date: '1994-09-05', tier: 2, mode: 'double' },
    // Αδερφός Tier 1 που ο χρήστης κατέβασε σε μονή
    { name: 'Αδερφός', birth_date: '1997-09-05', tier: 1, mode: 'single' },
  ];
  const pick = (slot, today) => {
    const target = targetDateForSlot(slot, today);
    return contacts
      .filter(
        (c) => isBirthdayOn(c.birth_date, target) && shouldNotify(slot, c.mode, c.tier)
      )
      .map((c) => c.name);
  };

  // 23:59 στις 4/9 → όσοι έχουν διπλή: Μητέρα (auto) + Κολλητός (override)
  assert.deepEqual(pick('eve', '2026-09-04'), ['Μητέρα', 'Κολλητός']);
  // 12:00 στις 5/9 → όλοι όσοι έχουν γενέθλια, ανεξαρτήτως mode
  assert.deepEqual(pick('noon', '2026-09-05'), ['Μητέρα', 'Φίλος', 'Κολλητός', 'Αδερφός']);
  // 12:00 στις 6/9 → μόνο ο Ξάδερφος
  assert.deepEqual(pick('noon', '2026-09-06'), ['Ξάδερφος']);
});

test('ακύρωση 2ης υπενθύμισης: η εγγραφή cancelled μπλοκάρει το noon', () => {
  // Προσομοίωση του unique constraint της βάσης.
  const log = new Map();
  const key = (c, d, s) => `${c}|${d}|${s}`;
  const claim = (c, d, s, status) => {
    if (log.has(key(c, d, s))) return { ok: false, existing: log.get(key(c, d, s)) };
    log.set(key(c, d, s), status);
    return { ok: true };
  };

  // 23:59 — φεύγει το πρώτο email
  assert.deepEqual(claim('c1', '2026-09-05', 'eve', 'sent'), { ok: true });

  // Ο χρήστης πατάει "έχω ήδη ευχηθεί"
  assert.deepEqual(claim('c1', '2026-09-05', 'noon', 'cancelled'), { ok: true });

  // 12:00 — το cron προσπαθεί και βρίσκει την ακύρωση
  const attempt = claim('c1', '2026-09-05', 'noon', 'sent');
  assert.equal(attempt.ok, false);
  assert.equal(attempt.existing, 'cancelled');

  // Η ακύρωση αφορά ΜΟΝΟ φέτος — του χρόνου καθαρό
  assert.deepEqual(claim('c1', '2027-09-05', 'noon', 'sent'), { ok: true });
});

/* ------------------------------------------------------------------ *
 *  Μηνύματα σφαλμάτων
 *
 *  Αυτά τα τεστ υπάρχουν επειδή ένα πραγματικό bug κρύφτηκε πίσω από
 *  ένα γενικό «Κάτι πήγε στραβά»: το Supabase δεν πετάει Error, οπότε
 *  ο έλεγχος `instanceof Error` πετούσε το χρήσιμο μήνυμα στα σκουπίδια.
 * ------------------------------------------------------------------ */
import { errorMessage, explain } from './build/errors.js';

test('errorMessage: κρατά το μήνυμα του Supabase (απλό αντικείμενο, όχι Error)', () => {
  const supabaseError = {
    code: 'PGRST204',
    message: "Could not find the 'surname' column of 'contacts' in the schema cache",
    details: null,
    hint: null,
  };
  const out = errorMessage(supabaseError, 'ΓΕΝΙΚΟ');
  assert.match(out, /surname/);
  assert.notEqual(out, 'ΓΕΝΙΚΟ');
});

test('errorMessage: προσθέτει το hint όταν υπάρχει', () => {
  const out = errorMessage({ message: 'κάτι έσπασε', hint: 'δοκίμασε αυτό' }, 'ΓΕΝΙΚΟ');
  assert.equal(out, 'κάτι έσπασε — δοκίμασε αυτό');
});

test('errorMessage: δουλεύει και με κανονικό Error και με σκέτο string', () => {
  assert.equal(errorMessage(new Error('μπουμ'), 'ΓΕΝΙΚΟ'), 'μπουμ');
  assert.equal(errorMessage('μπουμ', 'ΓΕΝΙΚΟ'), 'μπουμ');
});

test('errorMessage: πέφτει στο εφεδρικό μόνο όταν δεν υπάρχει τίποτα', () => {
  assert.equal(errorMessage(null, 'ΓΕΝΙΚΟ'), 'ΓΕΝΙΚΟ');
  assert.equal(errorMessage({}, 'ΓΕΝΙΚΟ'), 'ΓΕΝΙΚΟ');
});

test('explain: αναγνωρίζει τη βάση που είναι πίσω σε έκδοση', () => {
  const msg = "Could not find the 'surname' column of 'contacts' in the schema cache";
  assert.match(explain(msg, 'el'), /migration-003/);
  assert.match(explain(msg, 'en'), /migration-003/);
  assert.equal(explain('κάποιο άσχετο σφάλμα', 'el'), null);
});
