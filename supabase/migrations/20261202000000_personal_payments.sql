-- Payment deadlines: everyone imports their own netPA statement, saved like the timetable
-- (one private row per person in personal_data, only they can read it).
-- Run once after 20261201000000_group_description.sql (Supabase SQL Editor). See docs/accounts.md.

alter table public.personal_data drop constraint personal_data_kind_check;
alter table public.personal_data
  add constraint personal_data_kind_check check (kind in ('todos', 'timetable', 'payments'));
