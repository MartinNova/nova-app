-- Optional mobile number on the profile (Settings -> Contact).
-- Visible to signed-in students who can see your profile (like Instagram and LinkedIn):
-- private profiles stay owner-only through the existing row policy, and logged-out visitors
-- (anon) can't read profiles at all. Only you can change your own number.
-- Run once in the Supabase SQL Editor BEFORE deploying the app version with the phone field,
-- because the app reads the new column.

alter table public.profiles
  add column phone text not null default '' check (
    phone = ''
    or (
      phone ~ '^\+?[0-9][0-9 ]*$'
      and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 6 and 15
    )
  );

-- Column privileges are granted one by one (see 20261117020000_padel_friends.sql),
-- so the new column has to be added explicitly. Nothing is granted to anon.
grant select (phone) on public.profiles to authenticated;
grant update (phone) on public.profiles to authenticated;
