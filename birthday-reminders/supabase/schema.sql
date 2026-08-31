-- ============================================================
--  Γενεθλιολόγιο — Supabase / PostgreSQL schema
--  Τρέξε ολόκληρο το αρχείο στο Supabase → SQL Editor → New query.
--  Είναι ασφαλές να ξανατρέξει όσες φορές θες.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Κατηγορίες σχέσης
--    Το tier ΔΕΝ εμφανίζεται στην οθόνη· καθορίζει μόνο την
--    προεπιλογή: tier 1 → διπλή υπενθύμιση, tier 2 → μονή.
--    Ο χρήστης μπορεί να την αλλάξει ανά επαφή.
-- ------------------------------------------------------------
create table if not exists public.relationship_categories (
  code        text primary key,
  label_el    text not null,
  label_en    text,
  tier        smallint not null check (tier in (1, 2)),
  sort_order  smallint not null default 100
);

alter table public.relationship_categories
  add column if not exists label_en text;

insert into public.relationship_categories (code, label_el, label_en, tier, sort_order) values
  ('parent',        'Γονέας',              'Parent',        1, 10),
  ('sibling',       'Αδερφός/Αδερφή',      'Sibling',       1, 20),
  ('partner',       'Κοπέλα/Σύζυγος',      'Partner',       1, 30),
  ('child',         'Παιδί',               'Child',         1, 40),
  ('grandparent',   'Παππούς/Γιαγιά',      'Grandparent',   2, 50),
  ('cousin',        'Ξάδερφος/Ξαδέρφη',    'Cousin',        2, 60),
  ('uncle_aunt',    'Θείος/Θεία',          'Uncle/Aunt',    2, 70),
  ('friend',        'Φίλος/Φίλη',          'Friend',        2, 80),
  ('family_friend', 'Οικογενειακός φίλος', 'Family friend', 2, 90),
  ('colleague',     'Συνάδελφος',          'Colleague',     2, 95),
  ('other',         'Άλλο',                'Other',         2, 99)
on conflict (code) do update
  set label_el   = excluded.label_el,
      label_en   = excluded.label_en,
      tier       = excluded.tier,
      sort_order = excluded.sort_order;

-- ------------------------------------------------------------
-- 2. Επαφές
-- ------------------------------------------------------------
create table if not exists public.contacts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null check (length(btrim(name)) > 0),
  surname        text,          -- προαιρετικό
  birth_date     date not null check (birth_date <= current_date),
  category_code  text not null references public.relationship_categories(code),
  -- 'auto' → ό,τι λέει το tier · 'double' / 'single' → ρητή επιλογή χρήστη
  notify_mode    text not null default 'auto'
                 check (notify_mode in ('auto', 'double', 'single')),
  notify_email   text,          -- αλλιώς στέλνει στο email του χρήστη
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.contacts add column if not exists surname text;
alter table public.contacts add column if not exists notify_mode text not null default 'auto';

create index if not exists contacts_user_id_idx on public.contacts (user_id);

-- Σημείωση: δεν υπάρχει ευρετήριο "μήνας-μέρα".
-- Το to_char() είναι STABLE και όχι IMMUTABLE (εξαρτάται από τις τοπικές
-- ρυθμίσεις), οπότε η Postgres δεν το δέχεται σε index expression.
-- Δεν το χρειαζόμαστε κιόλας: το cron φέρνει τις επαφές και φιλτράρει
-- τα γενέθλια σε JavaScript — έτσι ζει η ίδια λογική (μαζί με την
-- περίπτωση της 29ης Φεβρουαρίου) σε ένα μόνο σημείο.

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists contacts_touch_updated_at on public.contacts;
create trigger contacts_touch_updated_at
  before update on public.contacts
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 3. Ημερολόγιο ειδοποιήσεων (idempotency + ακυρώσεις)
-- ------------------------------------------------------------
create table if not exists public.notification_log (
  id             bigint generated always as identity primary key,
  contact_id     uuid not null references public.contacts(id) on delete cascade,
  birthday_date  date not null,
  slot           text not null check (slot in ('eve', 'noon')),
  -- 'sent'      → στάλθηκε email
  -- 'cancelled' → ο χρήστης πάτησε "έχω ήδη ευχηθεί" στο πρώτο email
  status         text not null default 'sent' check (status in ('sent', 'cancelled')),
  sent_at        timestamptz not null default now(),
  provider_id    text,
  unique (contact_id, birthday_date, slot)
);

alter table public.notification_log
  add column if not exists status text not null default 'sent';

create index if not exists notification_log_sent_at_idx
  on public.notification_log (sent_at desc);

-- ------------------------------------------------------------
-- 4. Row Level Security
--    Κάθε χρήστης βλέπει ΜΟΝΟ τις δικές του επαφές.
--    Το cron χρησιμοποιεί το secret key που παρακάμπτει RLS.
-- ------------------------------------------------------------
alter table public.contacts                enable row level security;
alter table public.notification_log        enable row level security;
alter table public.relationship_categories enable row level security;

drop policy if exists "categories readable by authenticated" on public.relationship_categories;
create policy "categories readable by authenticated"
  on public.relationship_categories for select
  to authenticated using (true);

drop policy if exists "contacts select own" on public.contacts;
create policy "contacts select own" on public.contacts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "contacts insert own" on public.contacts;
create policy "contacts insert own" on public.contacts
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "contacts update own" on public.contacts;
create policy "contacts update own" on public.contacts
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "contacts delete own" on public.contacts;
create policy "contacts delete own" on public.contacts
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "log select own" on public.notification_log;
create policy "log select own" on public.notification_log
  for select to authenticated using (
    exists (select 1 from public.contacts c
            where c.id = notification_log.contact_id and c.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- 5. Βοηθητικό view
--
--    DROP και μετά CREATE, για τον ίδιο λόγο με το migration-003: το
--    CREATE OR REPLACE απαιτεί ίδια σειρά και ονόματα στηλών, οπότε
--    σκάει όταν αναβαθμίζεις μια βάση με παλιότερη μορφή του view.
-- ------------------------------------------------------------
drop view if exists public.upcoming_birthdays;

create view public.upcoming_birthdays
with (security_invoker = true) as
select
  c.id, c.user_id, c.name, c.surname, c.birth_date,
  c.category_code, c.notify_mode,
  rc.label_el, rc.label_en, rc.tier,
  case
    when c.notify_mode in ('double', 'single') then c.notify_mode
    when rc.tier = 1 then 'double'
    else 'single'
  end as effective_mode,
  (date_part('year', age(current_date, c.birth_date)))::int as current_age
from public.contacts c
join public.relationship_categories rc on rc.code = c.category_code;
