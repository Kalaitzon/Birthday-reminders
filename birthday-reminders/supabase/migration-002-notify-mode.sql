-- ============================================================
--  Migration 002 — ρυθμιζόμενες ειδοποιήσεις ανά επαφή
--  Τρέξ' το ΜΟΝΟ αν είχες ήδη τρέξει το schema.sql παλαιότερα.
--  (Το schema.sql είναι ήδη ενημερωμένο — σε καθαρή βάση αρκεί εκείνο.)
-- ============================================================

-- 1. Πόσες ειδοποιήσεις θέλει ο χρήστης για τη ΣΥΓΚΕΚΡΙΜΕΝΗ επαφή.
--    'auto'   → ό,τι λέει το tier της σχέσης (προεπιλογή)
--    'double' → 2 ειδοποιήσεις (23:59 παραμονή + 12:00)
--    'single' → 1 ειδοποίηση (12:00)
alter table public.contacts
  add column if not exists notify_mode text not null default 'auto'
  check (notify_mode in ('auto', 'double', 'single'));

-- 2. Το log κρατά πλέον και τις ακυρώσεις.
--    'sent'      → στάλθηκε email
--    'cancelled' → ο χρήστης ακύρωσε τη 2η υπενθύμιση από το πρώτο email
alter table public.notification_log
  add column if not exists status text not null default 'sent'
  check (status in ('sent', 'cancelled'));

-- 3. Το ευρετήριο to_char() δεν είναι έγκυρο στην Postgres (STABLE, όχι
--    IMMUTABLE). Αν είχε δημιουργηθεί σε παλιότερη προσπάθεια, φύγε το.
drop index if exists public.contacts_month_day_idx;

-- 4. Το view δείχνει πλέον και το mode.
create or replace view public.upcoming_birthdays
with (security_invoker = true) as
select
  c.id, c.user_id, c.name, c.birth_date, c.category_code, c.notify_mode,
  rc.label_el, rc.tier,
  case
    when c.notify_mode in ('double', 'single') then c.notify_mode
    when rc.tier = 1 then 'double'
    else 'single'
  end as effective_mode,
  (date_part('year', age(current_date, c.birth_date)))::int as current_age
from public.contacts c
join public.relationship_categories rc on rc.code = c.category_code;
