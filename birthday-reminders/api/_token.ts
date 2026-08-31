import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Υπογραφή για τα links ακύρωσης μέσα στα email.
 *
 * Το link πρέπει να δουλεύει χωρίς login — το πατάς από το κινητό σου
 * στις 23:59 χωρίς να ανοίξεις την εφαρμογή. Αντί για κωδικό, το URL
 * κουβαλάει μια υπογραφή HMAC-SHA256 που μόνο ο server μπορεί να
 * παράγει (με το CRON_SECRET). Χωρίς σωστή υπογραφή, το endpoint
 * απαντά 403 — κανείς δεν μπορεί να μαντέψει links για άλλες επαφές.
 *
 * Δεν χρειάζεται πίνακας με tokens: η υπογραφή είναι δεμένη με το
 * ζευγάρι (επαφή, ημερομηνία γενεθλίων) και ισχύει μόνο γι' αυτό.
 */

function secret(): string {
  const s = process.env.CRON_SECRET;
  if (!s) throw new Error('Λείπει το CRON_SECRET.');
  return s;
}

export function signCancel(contactId: string, birthdayIso: string): string {
  return createHmac('sha256', secret())
    .update(`cancel:${contactId}:${birthdayIso}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyCancel(
  contactId: string,
  birthdayIso: string,
  token: unknown
): boolean {
  if (typeof token !== 'string') return false;
  const expected = signCancel(contactId, birthdayIso);
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/** Το δημόσιο URL της εφαρμογής, για τα links μέσα στα email. */
export function appUrl(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : '';
}

export function cancelLink(contactId: string, birthdayIso: string): string | null {
  const base = appUrl();
  if (!base) return null;
  const t = signCancel(contactId, birthdayIso);
  return `${base}/api/cancel?c=${encodeURIComponent(contactId)}&d=${birthdayIso}&t=${t}`;
}
