import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  todayInAthens,
  targetDateForSlot,
  shouldNotify,
  effectiveMode,
  isBirthdayOn,
  ageOn,
  type Slot,
  type NotifyMode,
  // Η κατάληξη .js είναι υποχρεωτική, όχι στυλιστική: το package.json δηλώνει
  // "type": "module", οπότε ο Node τρέχει τα compiled αρχεία ως native ESM —
  // και το ESM απαιτεί πλήρη διαδρομή αρχείου. Χωρίς αυτήν, η function
  // καταρρέει στη φόρτωση με ERR_MODULE_NOT_FOUND. Το TypeScript ξέρει να
  // αντιστοιχίσει το .js στο .ts κατά τη μεταγλώττιση.
} from '../../src/lib/birthday.js';
import { cancelLink, appUrl } from '../_token.js';

/* ------------------------------------------------------------------ *
 *  Ρυθμίσεις από environment variables (Vercel → Settings → Env Vars)
 * ------------------------------------------------------------------ */
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Γενεθλιολόγιο <onboarding@resend.dev>';
const CRON_SECRET = process.env.CRON_SECRET!;

/**
 * Πού πάνε οι υπενθυμίσεις.
 *
 * Το email με το οποίο συνδέεσαι δεν χρειάζεται να είναι αυτό που λαμβάνει.
 * Αν οριστεί το NOTIFY_EMAIL, εκεί στέλνονται όλες οι υπενθυμίσεις.
 * Σειρά προτεραιότητας:
 *   1. contact.notify_email  — ρητή επιλογή για τη συγκεκριμένη επαφή
 *   2. NOTIFY_EMAIL          — μία διεύθυνση για όλα
 *   3. το email του χρήστη στο Supabase — η προεπιλογή
 */
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;

interface ContactRow {
  id: string;
  user_id: string;
  name: string;
  surname: string | null;
  birth_date: string;
  category_code: string;
  notify_mode: NotifyMode | null;
  notify_email: string | null;
  relationship_categories: { label_el: string; tier: number } | null;
}

/** Όνομα και επώνυμο μαζί, χωρίς κενό όταν λείπει το επώνυμο. */
function displayName(c: ContactRow): string {
  return c.surname ? `${c.name} ${c.surname}` : c.name;
}

/** Ξεφεύγει χαρακτήρες που θα έσπαγαν το HTML του μηνύματος. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!
  );
}

/* ------------------------------------------------------------------ *
 *  Κείμενο email
 * ------------------------------------------------------------------ */
function buildEmail(
  contact: ContactRow,
  slot: Slot,
  birthdayIso: string,
  /** Link ακύρωσης — μπαίνει μόνο στο πρώτο (23:59) email. */
  cancelUrl: string | null
): { subject: string; text: string; html: string } {
  const label = contact.relationship_categories?.label_el ?? '';
  const age = ageOn(contact.birth_date, birthdayIso);
  const when = slot === 'eve' ? 'αύριο' : 'σήμερα';
  const who = displayName(contact);

  const [y, m, d] = birthdayIso.split('-').map(Number);
  const prettyDate = `${d} ${GREEK_MONTHS[m - 1]} ${y}`;

  const subject = `🎂 Υπενθύμιση: ο/η ${who} έχει γενέθλια ${when}!`;
  const line = `Υπενθύμιση: Ο/Η ${who} έχει γενέθλια ${when}!`;
  const detail = `${label ? label + ' · ' : ''}κλείνει τα ${age}`;

  const text =
    `${line}\n${detail}\n${prettyDate}` +
    (cancelUrl
      ? `\n\nΕυχήθηκες ήδη; Ακύρωσε τη δεύτερη υπενθύμιση των 12:00:\n${cancelUrl}`
      : '') +
    `\n\n— Γενεθλιολόγιο`;

  /* Τα email δεν έχουν CSS αρχεία, εξωτερικές γραμματοσειρές ή flexbox
     που να δουλεύουν παντού. Οπότε: πίνακες για τη διάταξη, χρώματα
     γραμμένα inline, και η ίδια περλ παλέτα με την εφαρμογή. */
  const cancelBlock = cancelUrl
    ? `<tr><td style="padding:0 30px 28px">
         <div style="border-top:1px solid #EFE2EA;padding-top:20px">
           <p style="margin:0 0 14px;color:#7A6C7D;font-size:13px;line-height:1.6">
             Ευχήθηκες ήδη; Δεν χρειάζεται να σου ξανάρθει στις 12:00.
           </p>
           <a href="${cancelUrl}"
              style="display:inline-block;padding:11px 20px;border-radius:11px;background:#FFFFFF;border:1px solid #E3C7D6;color:#A8467C;text-decoration:none;font-size:14px;font-weight:700">
             Ακύρωσε τη δεύτερη υπενθύμιση
           </a>
         </div>
       </td></tr>`
    : '';

  const html = `<!doctype html>
<html lang="el"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:28px 16px;background:#F7F1F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2B2130">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
   <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="480"
           style="width:480px;max-width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #EFE2EA">

      <!-- Ταινία με τα χρώματα της τούρτας -->
      <tr><td style="height:6px;background:#E9A9C4;line-height:6px;font-size:0">&nbsp;</td></tr>

      <tr><td align="center" style="padding:30px 30px 0">
        <div style="font-size:46px;line-height:1">🎂</div>
      </td></tr>

      <tr><td align="center" style="padding:16px 30px 0">
        <h1 style="margin:0;font-size:20px;line-height:1.35;font-weight:700;color:#2B2130">
          ${esc(line)}
        </h1>
      </td></tr>

      <tr><td align="center" style="padding:10px 30px 0">
        <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:#F9EDF4;color:#A8467C;font-size:13px;font-weight:700">
          ${esc(detail)}
        </span>
      </td></tr>

      <tr><td align="center" style="padding:14px 30px 26px">
        <p style="margin:0;color:#9A8C9D;font-size:12.5px">${esc(prettyDate)}</p>
      </td></tr>

      ${cancelBlock}

      <tr><td align="center" style="padding:16px 30px 22px;background:#FBF6F9;border-top:1px solid #EFE2EA">
        <p style="margin:0;color:#9A8C9D;font-size:11.5px;letter-spacing:0.03em">
          Γενεθλιολόγιο
        </p>
      </td></tr>
    </table>
   </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}

const GREEK_MONTHS = [
  'Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
  'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου',
];

/* ------------------------------------------------------------------ *
 *  Handler
 * ------------------------------------------------------------------ */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // --- 1. Ασφάλεια: μόνο ο scheduler μπορεί να το καλέσει ---------
  const auth = req.headers.authorization;
  const key = typeof req.query.key === 'string' ? req.query.key : undefined;
  if (!CRON_SECRET || (auth !== `Bearer ${CRON_SECRET}` && key !== CRON_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // --- 2. Λείπει καμία ρύθμιση; -----------------------------------
  //     Χωρίς αυτόν τον έλεγχο, ο constructor του Supabase ή του Resend
  //     πετάει εξαίρεση πριν προλάβει να τρέξει το catch παρακάτω, και
  //     το Vercel επιστρέφει ένα αδιάφανο FUNCTION_INVOCATION_FAILED.
  //     Καλύτερα να πούμε ακριβώς τι λείπει.
  const missing = [
    ['SUPABASE_URL', SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY],
    ['RESEND_API_KEY', RESEND_API_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    return res.status(500).json({
      error: 'missing-configuration',
      missing,
      hint: 'Πρόσθεσέ τα στο Vercel → Settings → Environment Variables και κάνε Redeploy.',
    });
  }

  // Διαγνωστικό: ?check=1 δείχνει ποιες ρυθμίσεις έφτασαν, χωρίς τις τιμές τους.
  if (req.query.check === '1') {
    return res.status(200).json({
      ok: true,
      todayInAthens: todayInAthens(),
      configured: {
        SUPABASE_URL: Boolean(SUPABASE_URL),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(SUPABASE_SERVICE_ROLE_KEY),
        RESEND_API_KEY: Boolean(RESEND_API_KEY),
        NOTIFY_EMAIL: NOTIFY_EMAIL ?? '(δεν έχει οριστεί — θα σταλεί στο email σύνδεσης)',
        EMAIL_FROM,
        APP_URL: appUrl() || '(δεν βρέθηκε)',
      },
    });
  }

  // --- 3. Ποιο slot τρέχει; --------------------------------------
  const slot = (req.query.slot === 'eve' ? 'eve' : 'noon') as Slot;
  const dryRun = req.query.dryRun === '1';
  const today = typeof req.query.today === 'string' ? req.query.today : todayInAthens();
  const birthdayIso = targetDateForSlot(slot, today);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const resend = new Resend(RESEND_API_KEY);

    // --- 3. Φέρε όλες τις επαφές με τα tiers τους ----------------
    const { data, error } = await supabase
      .from('contacts')
      .select(
        'id, user_id, name, surname, birth_date, category_code, notify_mode, notify_email, relationship_categories(label_el, tier)'
      );
    if (error) throw error;

    const contacts = (data ?? []) as unknown as ContactRow[];

    // --- 4. Κράτα όσους έχουν γενέθλια ΚΑΙ θέλουν αυτό το slot ---
    //     Το tier δίνει την προεπιλογή, το notify_mode της επαφής υπερισχύει.
    const due = contacts.filter(
      (c) =>
        isBirthdayOn(c.birth_date, birthdayIso) &&
        shouldNotify(slot, c.notify_mode, c.relationship_categories?.tier ?? 2)
    );

    if (due.length === 0) {
      return res.status(200).json({ slot, birthdayIso, due: 0, sent: 0, skipped: 0 });
    }

    // --- 5. Βρες σε ποιο email στέλνουμε για κάθε χρήστη ---------
    //     Αν υπάρχει NOTIFY_EMAIL, δεν χρειάζεται καν να ρωτήσουμε το Supabase.
    const ownerEmails = new Map<string, string | undefined>();
    if (!NOTIFY_EMAIL) {
      for (const userId of new Set(due.map((c) => c.user_id))) {
        const { data: u } = await supabase.auth.admin.getUserById(userId);
        ownerEmails.set(userId, u?.user?.email ?? undefined);
      }
    }

    // --- 6. Στείλε (μία φορά ανά επαφή/ημερομηνία/slot) ----------
    const results: Array<Record<string, unknown>> = [];
    let sent = 0;
    let skipped = 0;

    for (const contact of due) {
      const to =
        contact.notify_email || NOTIFY_EMAIL || ownerEmails.get(contact.user_id);
      if (!to) {
        results.push({ contact: displayName(contact), status: 'no-recipient' });
        skipped++;
        continue;
      }

      // "Κλείδωσε" τη θέση πρώτα: αν υπάρχει ήδη, το unique constraint
      // επιστρέφει 23505 και δεν ξαναστέλνουμε.
      if (!dryRun) {
        const { error: logErr } = await supabase.from('notification_log').insert({
          contact_id: contact.id,
          birthday_date: birthdayIso,
          slot,
          status: 'sent',
        });
        if (logErr) {
          if (logErr.code === '23505') {
            // Υπάρχει ήδη εγγραφή: ή στάλθηκε, ή ο χρήστης την ακύρωσε
            // πατώντας "έχω ήδη ευχηθεί" στο πρώτο email.
            const { data: prev } = await supabase
              .from('notification_log')
              .select('status')
              .match({ contact_id: contact.id, birthday_date: birthdayIso, slot })
              .maybeSingle();
            results.push({
              contact: displayName(contact),
              status: prev?.status === 'cancelled' ? 'cancelled-by-user' : 'already-sent',
            });
            skipped++;
            continue;
          }
          throw logErr;
        }
      }

      // Το link ακύρωσης μπαίνει μόνο στο πρώτο email — το δεύτερο
      // είναι το τελευταίο, δεν έχει τι να ακυρώσει.
      const cancelUrl = slot === 'eve' ? cancelLink(contact.id, birthdayIso) : null;
      const { subject, text, html } = buildEmail(contact, slot, birthdayIso, cancelUrl);

      if (dryRun) {
        results.push({
          contact: displayName(contact),
          to,
          subject,
          mode: effectiveMode(contact.notify_mode, contact.relationship_categories?.tier ?? 2),
          status: 'dry-run',
        });
        continue;
      }

      const { data: mail, error: mailErr } = await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html,
      });

      if (mailErr) {
        // Αν απέτυχε το email, καθάρισε το log ώστε να ξαναπροσπαθήσει.
        await supabase
          .from('notification_log')
          .delete()
          .match({ contact_id: contact.id, birthday_date: birthdayIso, slot });
        results.push({ contact: displayName(contact), status: 'failed', error: mailErr.message });
        continue;
      }

      await supabase
        .from('notification_log')
        .update({ provider_id: mail?.id ?? null })
        .match({ contact_id: contact.id, birthday_date: birthdayIso, slot });

      results.push({ contact: displayName(contact), to, status: 'sent', id: mail?.id });
      sent++;
    }

    return res.status(200).json({
      slot,
      today,
      birthdayIso,
      due: due.length,
      sent,
      skipped,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/notify]', message);
    return res.status(500).json({ error: message });
  }
}
