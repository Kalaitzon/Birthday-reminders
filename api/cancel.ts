import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
// Κατάληξη .js: το package.json είναι "type": "module", οπότε ο Node
// απαιτεί πλήρη διαδρομή αρχείου κατά την εκτέλεση.
import { verifyCancel } from './_token.js';

/**
 * Ακύρωση της 2ης υπενθύμισης, με ένα κλικ από το πρώτο email.
 *
 * GET  → σελίδα επιβεβαίωσης με κουμπί (ΔΕΝ ακυρώνει τίποτα)
 * POST → η πραγματική ακύρωση, ή η αναίρεσή της
 *
 * Γιατί χρειάζεται το ενδιάμεσο βήμα: αρκετοί email clients και εταιρικά
 * φίλτρα ασφαλείας "προ-φορτώνουν" κάθε link του μηνύματος για έλεγχο.
 * Αν το GET ακύρωνε κατευθείαν, θα έχανες τη δεύτερη υπενθύμιση χωρίς
 * να έχεις πατήσει τίποτα.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const GREEK_MONTHS = [
  'Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
  'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου',
];

function prettyDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${GREEK_MONTHS[m - 1]}`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

function page(opts: {
  icon: string;
  title: string;
  body: string;
  action?: { label: string; value: 'cancel' | 'undo'; tone: 'primary' | 'quiet' };
  hidden?: Record<string, string>;
}): string {
  const inputs = Object.entries(opts.hidden ?? {})
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}">`)
    .join('');

  const button = opts.action
    ? `<form method="post">${inputs}
         <input type="hidden" name="action" value="${opts.action.value}">
         <button class="${opts.action.tone}" type="submit">${esc(opts.action.label)}</button>
       </form>`
    : '';

  return `<!doctype html><html lang="el"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(opts.title)}</title>
<style>
:root{--bg:#FBF9FC;--card:#fff;--ink:#1E1826;--muted:#6B6076;--line:#E6E0EE;--accent:#6B3FA0;color-scheme:light}
@media(prefers-color-scheme:dark){:root{--bg:#141019;--card:#1C1723;--ink:#EDE7F2;--muted:#A195AE;--line:#2C2536;--accent:#BD9AEC;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--ink);
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:32px;max-width:420px;width:100%;text-align:center}
.icon{font-size:44px;line-height:1}
h1{font-size:20px;margin:14px 0 8px;letter-spacing:-.01em}
p{margin:0 0 20px;color:var(--muted);font-size:15px}
button{font:inherit;font-weight:600;padding:11px 20px;border-radius:9px;cursor:pointer;width:100%}
button.primary{background:var(--accent);color:#fff;border:1px solid transparent}
button.quiet{background:transparent;color:var(--muted);border:1px solid var(--line)}
button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style></head><body>
<div class="card"><div class="icon">${opts.icon}</div><h1>${opts.title}</h1><p>${opts.body}</p>${button}</div>
</body></html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const contactId = typeof req.query.c === 'string' ? req.query.c : '';
  const birthdayIso = typeof req.query.d === 'string' ? req.query.d : '';
  const token = req.query.t;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Ποτέ να μην αποθηκευτεί σε cache ή να βρεθεί από μηχανές αναζήτησης.
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdayIso) || !contactId) {
    return res.status(400).send(
      page({ icon: '🔗', title: 'Μη έγκυρος σύνδεσμος', body: 'Το link φαίνεται κομμένο. Δοκίμασε ξανά από το email.' })
    );
  }

  try {
    // Ο έλεγχος υπογραφής και η δημιουργία του client μένουν ΜΕΣΑ στο try:
    // και τα δύο πετούν εξαίρεση αν λείπει κάποια μεταβλητή περιβάλλοντος,
    // και θέλουμε σελίδα σφάλματος, όχι κατάρρευση της function.
    if (!verifyCancel(contactId, birthdayIso, token)) {
      return res.status(403).send(
        page({ icon: '🔒', title: 'Ο σύνδεσμος δεν ισχύει', body: 'Η υπογραφή δεν ταιριάζει. Χρησιμοποίησε το link ακριβώς όπως είναι στο email.' })
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: contact, error: cErr } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('id', contactId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!contact) {
      return res.status(404).send(
        page({ icon: '🔍', title: 'Η επαφή δεν βρέθηκε', body: 'Μάλλον διαγράφηκε στο μεταξύ.' })
      );
    }

    const name = esc(contact.name);
    const when = prettyDate(birthdayIso);

    const { data: existing } = await supabase
      .from('notification_log')
      .select('status')
      .match({ contact_id: contactId, birthday_date: birthdayIso, slot: 'noon' })
      .maybeSingle();

    /* ---------------- GET: μόνο ρωτάμε ---------------- */
    if (req.method !== 'POST') {
      if (existing?.status === 'sent') {
        return res.status(200).send(
          page({
            icon: '📬',
            title: 'Έχει ήδη σταλεί',
            body: `Η δεύτερη υπενθύμιση για τον/την <b>${name}</b> έφυγε ήδη στις 12:00.`,
          })
        );
      }
      if (existing?.status === 'cancelled') {
        return res.status(200).send(
          page({
            icon: '✅',
            title: 'Ακυρώθηκε ήδη',
            body: `Δεν θα λάβεις δεύτερη υπενθύμιση για τον/την <b>${name}</b> στις ${when}.`,
            action: { label: 'Αναίρεση — θέλω τελικά την υπενθύμιση', value: 'undo', tone: 'quiet' },
          })
        );
      }
      return res.status(200).send(
        page({
          icon: '🎂',
          title: 'Έχεις ήδη ευχηθεί;',
          body: `Θα ακυρωθεί η υπενθύμιση των 12:00 για τον/την <b>${name}</b> στις ${when}. Η επαφή μένει ως έχει — αφορά μόνο τη φετινή χρονιά.`,
          action: { label: 'Ναι, ακύρωσε τη δεύτερη υπενθύμιση', value: 'cancel', tone: 'primary' },
        })
      );
    }

    /* ---------------- POST: η πραγματική ενέργεια ---------------- */
    const action = (req.body?.action ?? 'cancel') as string;

    if (action === 'undo') {
      await supabase
        .from('notification_log')
        .delete()
        .match({ contact_id: contactId, birthday_date: birthdayIso, slot: 'noon', status: 'cancelled' });
      return res.status(200).send(
        page({
          icon: '🔔',
          title: 'Επανήλθε',
          body: `Θα λάβεις κανονικά τη δεύτερη υπενθύμιση για τον/την <b>${name}</b> στις 12:00.`,
          action: { label: 'Ακύρωσέ την ξανά', value: 'cancel', tone: 'quiet' },
        })
      );
    }

    if (existing?.status === 'sent') {
      return res.status(200).send(
        page({ icon: '📬', title: 'Έχει ήδη σταλεί', body: `Το δεύτερο email για τον/την <b>${name}</b> έφυγε ήδη.` })
      );
    }

    // Η ίδια εγγραφή που θα έγραφε το cron — απλώς με status 'cancelled'.
    // Το unique constraint κάνει το cron να την προσπεράσει.
    const { error: insErr } = await supabase.from('notification_log').insert({
      contact_id: contactId,
      birthday_date: birthdayIso,
      slot: 'noon',
      status: 'cancelled',
    });
    if (insErr && insErr.code !== '23505') throw insErr;

    return res.status(200).send(
      page({
        icon: '✅',
        title: 'Έγινε',
        body: `Δεν θα λάβεις δεύτερη υπενθύμιση για τον/την <b>${name}</b> στις ${when}. Του χρόνου όλα κανονικά.`,
        action: { label: 'Αναίρεση', value: 'undo', tone: 'quiet' },
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cancel]', message);
    return res.status(500).send(
      page({ icon: '⚠️', title: 'Κάτι πήγε στραβά', body: 'Δοκίμασε ξανά σε λίγο.' })
    );
  }
}
