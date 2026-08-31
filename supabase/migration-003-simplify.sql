-- ============================================================
--  Migration 003
--   · επώνυμο (προαιρετικό)
--   · αγγλικές ετικέτες κατηγοριών
--   · απλοποιημένες κατηγορίες σχέσης
--  Τρέξ' το ολόκληρο στο SQL Editor. Είναι ασφαλές να ξανατρέξει.
-- ============================================================

-- 1. Επώνυμο — προαιρετικό, σε αντίθεση με το όνομα
alter table public.contacts
  add column if not exists surname text;

-- 2. Αγγλική ετικέτα για κάθε κατηγορία
alter table public.relationship_categories
  add column if not exists label_en text;

-- 3. Οι νέες, απλοποιημένες κατηγορίες.
--    Το tier μένει — καθορίζει την προεπιλογή διπλής/μονής υπενθύμισης —
--    αλλά δεν εμφανίζεται πουθενά στην οθόνη.
insert into public.relationship_categories (code, label_el, label_en, tier, sort_order) values
  ('parent',        'Γονέας',              'Parent',        1, 10),
  ('sibling',       'Αδερφός/Αδερφή',      'Sibling',       1, 20),
  ('partner',       'Κοπέλα/Σύζυγος',      'Partner',       1, 30),
  ('child',         'Παιδί',               'Child',         1, 40),
  ('grandparent',   'Παππούς/Γιαγιά',      'Grandparent',   2, 50),
  ('cousin',        'Ξάδερφος/Ξαδέρφη',    'Cousin',        2, 60),
  ('uncle_aunt',    'Θείος/Θεία',          'Uncle/Aunt',    2, 70),
  ('friend',        'Φίλος/Φίλη',          'Friend',        2, 80),
  ('family_friend', 'Οικογενειακός/ή φίλος/η', 'Family friend', 2, 90),
  ('colleague',     'Συνάδελφος',          'Colleague',     2, 95),
  ('other',         'Άλλο',                'Other',         2, 99)
on conflict (code) do update
  set label_el   = excluded.label_el,
      label_en   = excluded.label_en,
      tier       = excluded.tier,
      sort_order = excluded.sort_order;

-- 4. Μετακίνησε τις υπάρχουσες επαφές στις νέες κατηγορίες
--    πριν σβήσουμε τις παλιές, αλλιώς το foreign key θα μπλόκαρε.
update public.contacts set category_code = 'parent'
  where category_code in ('mother', 'father');
update public.contacts set category_code = 'sibling'
  where category_code in ('sister', 'brother');

-- 5. Καθάρισε τις παλιές
delete from public.relationship_categories
  where code in ('mother', 'father', 'sister', 'brother');

-- 6. Ενημέρωσε το view ώστε να δείχνει επώνυμο και αγγλική ετικέτα
--
--    Πρώτα DROP και μετά CREATE, όχι CREATE OR REPLACE. Το "replace"
--    απαιτεί οι στήλες να μείνουν στην ίδια σειρά με τις ίδιες ονομασίες·
--    το `surname` μπαίνει τέταρτο και τις μετατοπίζει, οπότε η Postgres
--    απαντά 42P16 «cannot change name of view column». Το view δεν κρατά
--    δεδομένα — είναι αποθηκευμένο ερώτημα — άρα η διαγραφή δεν κοστίζει.
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
