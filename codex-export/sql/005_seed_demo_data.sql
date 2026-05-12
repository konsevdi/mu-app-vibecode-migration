-- 005_seed_demo_data.sql
-- Pure SQL inserts for reference data + waitlist demo rows.
-- Listings + users are seeded by scripts/seed.ts (they depend on auth.users
-- rows created via the Supabase Admin API; see 006_seed_admin_user.sql).
--
-- All inserts are idempotent: re-running this file is safe.

-- ============================================================
-- Cities
-- ============================================================

insert into public.cities (name, name_el, country, country_el, is_eligible, display_order) values
  ('Rhodes',       'Ρόδος',        'Greece',         'Ελλάδα',             true,  1),
  ('Athens',       'Αθήνα',        'Greece',         'Ελλάδα',             false, 2),
  ('Thessaloniki', 'Θεσσαλονίκη',  'Greece',         'Ελλάδα',             false, 3),
  ('Patras',       'Πάτρα',        'Greece',         'Ελλάδα',             false, 4),
  ('Heraklion',    'Ηράκλειο',     'Greece',         'Ελλάδα',             false, 5),
  ('Larissa',      'Λάρισα',       'Greece',         'Ελλάδα',             false, 6),
  ('Volos',        'Βόλος',        'Greece',         'Ελλάδα',             false, 7),
  ('Ioannina',     'Ιωάννινα',     'Greece',         'Ελλάδα',             false, 8),
  ('Chania',       'Χανιά',        'Greece',         'Ελλάδα',             false, 9),
  ('London',       'London',       'United Kingdom', 'Ηνωμένο Βασίλειο',   false, 10),
  ('Berlin',       'Berlin',       'Germany',        'Γερμανία',           false, 11),
  ('Paris',        'Paris',        'France',         'Γαλλία',             false, 12),
  ('Amsterdam',    'Amsterdam',    'Netherlands',    'Ολλανδία',           false, 13),
  ('Rome',         'Rome',         'Italy',          'Ιταλία',             false, 14),
  ('Madrid',       'Madrid',       'Spain',          'Ισπανία',            false, 15)
on conflict (name) do update set
  name_el       = excluded.name_el,
  country       = excluded.country,
  country_el    = excluded.country_el,
  is_eligible   = excluded.is_eligible,
  display_order = excluded.display_order;

-- ============================================================
-- Stores
-- ============================================================

insert into public.stores (id, name, subtitle, address, city, store_page_url, lat, lng, is_primary, hours_json, services) values
(
  'irepair-rhodes',
  'iRepair Rhodes',
  null,
  'Αμμοχώστου 18, 85131, Ρόδος',
  'Rhodes',
  'https://irepair.gr/stores/irepair-%CF%81%CF%8C%CE%B4%CE%BF%CF%82',
  36.4349,
  28.2176,
  true,
  '{
    "monday":    {"open":"09:30","close":"21:00"},
    "tuesday":   {"open":"09:30","close":"21:00"},
    "wednesday": {"open":"09:30","close":"21:00"},
    "thursday":  {"open":"09:30","close":"21:00"},
    "friday":    {"open":"09:30","close":"21:00"},
    "saturday":  {"open":"10:00","close":"20:00"},
    "sunday":    null
  }'::jsonb,
  array['diagnostic','repair','grading','sales']::text[]
),
(
  'irepair-spot',
  'iRepair Spot',
  'Public Νέα Μαρίνα',
  'Αυστραλίας 84-86, 85100, Ρόδος',
  'Rhodes',
  'https://irepair.gr/stores/irepair-public-home-%CF%81%CF%8C%CE%B4%CE%BF%CF%82',
  36.4412,
  28.2234,
  false,
  '{
    "monday":    {"open":"09:30","close":"21:00"},
    "tuesday":   {"open":"09:30","close":"21:00"},
    "wednesday": {"open":"09:30","close":"21:00"},
    "thursday":  {"open":"09:30","close":"21:00"},
    "friday":    {"open":"09:30","close":"21:00"},
    "saturday":  {"open":"10:00","close":"20:00"},
    "sunday":    null
  }'::jsonb,
  array['diagnostic','repair','sales']::text[]
)
on conflict (id) do update set
  name           = excluded.name,
  subtitle       = excluded.subtitle,
  address        = excluded.address,
  city           = excluded.city,
  store_page_url = excluded.store_page_url,
  lat            = excluded.lat,
  lng            = excluded.lng,
  is_primary     = excluded.is_primary,
  hours_json     = excluded.hours_json,
  services       = excluded.services;

-- ============================================================
-- Grade config — global default + iRepair Rhodes override
-- ============================================================

insert into public.grade_config (store_id, grade_a_mult, grade_b_mult, grade_c_mult, grade_d_mult) values
  (null,             1.000, 0.930, 0.850, 0.600),
  ('irepair-rhodes', 1.000, 0.930, 0.850, 0.600)
on conflict (store_id) do update set
  grade_a_mult = excluded.grade_a_mult,
  grade_b_mult = excluded.grade_b_mult,
  grade_c_mult = excluded.grade_c_mult,
  grade_d_mult = excluded.grade_d_mult;

-- ============================================================
-- Moderation config — single global row
-- ============================================================

insert into public.moderation_config (
  id,
  private_report_threshold,
  store_report_threshold,
  cooldown_days,
  limited_state_days,
  strike_decay_days,
  fraud_hold_threshold
) values (
  1, 2, 5, 7, 7, 90, 80
)
on conflict (id) do update set
  private_report_threshold = excluded.private_report_threshold,
  store_report_threshold   = excluded.store_report_threshold,
  cooldown_days            = excluded.cooldown_days,
  limited_state_days       = excluded.limited_state_days,
  strike_decay_days        = excluded.strike_decay_days,
  fraud_hold_threshold     = excluded.fraud_hold_threshold;

-- ============================================================
-- Waitlist demo signups — referral chain
-- ============================================================

insert into public.waitlist_signups (
  email, city, country, interest_type, consent, language_pref,
  referral_code, referred_by_code, referral_count, position_score
) values
  ('athens.buyer@example.com',      'Athens',       'Greece',         'buyer',  true, 'el', 'MUATHEN1', null,        1, 3),
  ('thessaloniki.both@example.com', 'Thessaloniki', 'Greece',         'both',   true, 'el', 'MUTHESS1', 'MUATHEN1',  0, 0),
  ('london.seller@example.com',     'London',       'United Kingdom', 'seller', true, 'en', 'MULOND01', null,        0, 0)
on conflict (email) do nothing;
