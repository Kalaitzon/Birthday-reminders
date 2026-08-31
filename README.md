# 🎂 Γενεθλιολόγιο · Birthday Calendar

A small web app that keeps track of birthdays and emails you before you forget one.

**Stack:** React · Vite · TypeScript · Vercel Functions · Supabase (Postgres + Auth) · Resend

---

## How the reminders work

Every contact belongs to a relationship category, and the category sets a **default** reminder frequency:

| Tier | Categories | Default |
|---|---|---|
| **1** | Mother, Father, Siblings, Partner, Children | **23:59** the night before **+ 12:00** on the day |
| **2** | Grandparents, Cousins, Aunts/Uncles, Friends, Family friends | **12:00** on the day |

The default is only a starting point. Each contact has a `notify_mode`:

- `auto` — follow the category's tier *(default)*
- `double` — two reminders, whatever the tier says *(the close friend you must not forget)*
- `single` — one reminder, whatever the tier says *(you don't need two for your brother)*

### Two cron jobs, not four

A single endpoint takes a `slot` parameter and turns it into one question:

| Slot | Runs at | Asks the database |
|---|---|---|
| `eve` | 23:59 | *Whose birthday is **tomorrow**, among contacts set to double?* |
| `noon` | 12:00 | *Whose birthday is **today**?* (everyone) |

This fits the free Vercel Hobby plan exactly — it allows two cron jobs, once a day each.

### You will never get a duplicate email

`notification_log` carries `unique(contact_id, birthday_date, slot)`. The system **writes the log row first and sends afterwards**. If the cron runs twice — a retry, a redeploy, a manual call — the insert is rejected and no second email goes out.

### "I've already wished them" — cancelling the second reminder

The 23:59 email carries a button that cancels the 12:00 reminder. You tap it from your phone, no login required, and it applies to **that year only** — next year is back to normal.

Three decisions make this work:

1. **No token table.** The link carries an `HMAC-SHA256(contact_id + date, CRON_SECRET)` signature. Only the server can produce it; without a valid signature the endpoint answers `403`. The signature is bound to one contact on one date and unlocks nothing else.

2. **Clicking the link doesn't cancel anything.** It opens a confirmation page whose button issues a POST. Without that step, the corporate security scanners that pre-fetch every link in an email would silently cancel your reminder for you.

3. **A cancellation is the row the cron would have written**, just with `status='cancelled'`. The existing unique constraint makes the cron skip it — no new logic, no race condition. The same page offers an undo.

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
   *(Upgrading from an older version? Also run `supabase/migration-002-notify-mode.sql`.)*
3. **Project Settings → API Keys** — copy the **publishable** and **secret** keys.
4. **Authentication → Users → Add user** — create your account, tick *Auto Confirm*.
5. **Authentication → Sign In / Providers → Email** — turn **off** *Allow new users to sign up*, so nobody else can register.
6. After deploying, set **Authentication → URL Configuration → Site URL** to your live URL.

### 2. Resend

1. Create an account at [resend.com](https://resend.com) and generate an API key.
2. `onboarding@resend.dev` works immediately for testing — but **it only delivers to the email address that owns the Resend account**. If that differs from your login email, put it in `NOTIFY_EMAIL`.
3. For anything beyond that, verify your own domain under **Domains** and send from it.

Free tier: 3,000 emails/month, 100/day.

### 3. Deploy to Vercel

Import the repository at [vercel.com/new](https://vercel.com/new). The Vite preset is detected automatically.

| Variable | Type | What it is |
|---|---|---|
| `VITE_SUPABASE_URL` | Config | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Config | Publishable key |
| `SUPABASE_URL` | Config | Same project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Secret key |
| `RESEND_API_KEY` | **Secret** | `re_...` |
| `EMAIL_FROM` | Config | `Birthday <onboarding@resend.dev>` |
| `NOTIFY_EMAIL` | Config | Where reminders go *(optional — defaults to your login email)* |
| `CRON_SECRET` | **Secret** | Random value, see below |
| `APP_URL` | Config | *Optional* — falls back to the URL Vercel provides |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> Anything prefixed `VITE_` is compiled into the JavaScript the browser downloads. Vercel enforces this: those must be **Config**, never **Secret**. Row Level Security is what keeps the publishable key harmless.

Adding or changing a variable later requires a **Redeploy** — it does not apply to a running deployment.

### 4. Scheduling, and the daylight-saving problem

Vercel Crons run in **UTC** and know nothing about daylight saving. Greece is UTC+3 in summer and UTC+2 in winter, so a fixed UTC schedule is an hour off for half the year.

**Recommended — [cron-job.org](https://cron-job.org)** (free, timezone-aware). Create two jobs with **Timezone: Europe/Athens**:

| Time | URL |
|---|---|
| 23:59 | `…/api/cron/notify?slot=eve&key=CRON_SECRET` |
| 12:00 | `…/api/cron/notify?slot=noon&key=CRON_SECRET` |

**Alternative — the built-in Vercel Crons.** `vercel.json` is already configured for summer time. Switch the two schedules to `59 21 * * *` and `0 10 * * *` in winter. Vercel sends the `Authorization: Bearer $CRON_SECRET` header on its own.

---

## Testing without waiting for a birthday

Two helper parameters:

- `dryRun=1` — report who *would* be emailed, send nothing
- `today=YYYY-MM-DD` — pretend it is a different date

```bash
# Who gets an email at noon on 5 September?
curl "https://YOUR-APP.vercel.app/api/cron/notify?slot=noon&today=2026-09-05&dryRun=1&key=YOUR_SECRET"

# Send for real — tier 1, the night before
curl "https://YOUR-APP.vercel.app/api/cron/notify?slot=eve&today=2026-09-04&key=YOUR_SECRET"
```

The response is JSON with `due`, `sent`, `skipped` and a per-contact breakdown, so you can see exactly what happened and why.

---

## Local development

```bash
cp .env.example .env.local   # fill in your keys
npm install
npm run dev                  # frontend only  → http://localhost:5173
vercel dev                   # frontend + API functions together → :3000
npm test                     # date logic tests, no database needed
```

The frontend talks to Supabase directly, so `npm run dev` is enough for everything except the cron and cancellation endpoints.

---

## Layout

```
birthday-reminders/
├── api/
│   ├── cron/notify.ts        ← who has a birthday, who gets told, what the email says
│   ├── cancel.ts             ← the "already wished them" page, works without login
│   └── _token.ts             ← HMAC signatures for email links (the _ keeps it out of routing)
├── supabase/
│   ├── schema.sql            ← tables, categories, RLS policies
│   └── migration-002-notify-mode.sql
├── src/
│   ├── App.tsx               ← auth and CRUD
│   ├── components/           ← Login, ContactForm, ContactList
│   └── lib/birthday.ts       ← ALL date and scheduling logic, shared front and back
├── tests/birthday.test.js    ← 14 tests
└── vercel.json               ← cron schedules + SPA rewrites
```

`src/lib/birthday.ts` is deliberately shared by the browser and the cron function, so the countdown you see on screen and the decision to send an email can never disagree.

---

## Notes on correctness

**29 February.** Someone born on a leap day is treated as celebrating on 28 February in non-leap years — otherwise they would never receive an email at all.

**Dates are strings.** Everything moves around as `'YYYY-MM-DD'`, never as a `Date` object. That is why there are no timezone bugs: the only place a timezone is consulted is `todayInAthens()`, which asks what the date is in Greece right now.

**No month-day index.** An index on `to_char(birth_date, 'MM-DD')` is invalid in Postgres — `to_char` is `STABLE`, not `IMMUTABLE`, because its output depends on locale settings. It isn't needed either: the cron fetches contacts and filters in JavaScript, which keeps the leap-day rule in one place.

---

## Security

| Concern | How it's handled |
|---|---|
| Data access | Row Level Security — even with the public key, nobody reads your contacts |
| Cron abuse | Wrong or missing `CRON_SECRET` returns `401` |
| Duplicate emails | A database unique constraint, not a check-then-write that would race |
| Failed sends | If Resend fails, the log row is deleted so the next run retries |
| Login-free links | HMAC-signed, scoped to one contact and one date, `no-store` and `noindex` |
| Key exposure | The secret key is server-side only, never in the browser bundle |

---

## Possible next steps

- Greek name days (εορτολόγιο) as a second event type
- Web Push instead of email
- Import from Google Contacts
- A configurable **time** per contact, not just a count
- Snooze instead of cancel — remind me again in two hours
