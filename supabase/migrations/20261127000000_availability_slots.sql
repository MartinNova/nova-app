-- "Usually free" with real times per weekday, e.g. Mon 9:00–12:00 and 16:00–18:00,
-- instead of day chips + Morning/Afternoon/Evening.
-- Existing choices are converted (Morning 8–12, Afternoon 12–18, Evening 18–22; a day without
-- a time of day = 8–22). The old columns stay for now so an older app version keeps working.
-- Privacy: covered by the existing "Usually free" setting (field 'availability') in profile_cards.
-- Run once in the Supabase SQL Editor BEFORE deploying the app version with time windows.

-- 1. New column: [{ "day": "Mon", "from": "09:00", "to": "12:00" }, ...] -----------------

create function public.valid_availability_slots(slots jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(slots) <> 'array' then false
    -- At most 3 windows on each of the 7 days.
    when jsonb_array_length(slots) > 21 then false
    else not exists (
      select 1
      from jsonb_array_elements(slots) as s(slot)
      where not coalesce(
        jsonb_typeof(s.slot) = 'object'
          and s.slot ->> 'day' in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')
          and s.slot ->> 'from' ~ '^([01]\d|2[0-3]):[0-5]\d$'
          and s.slot ->> 'to' ~ '^([01]\d|2[0-3]):[0-5]\d$'
          and s.slot ->> 'from' < s.slot ->> 'to',
        false
      )
    )
  end;
$$;

alter table public.profiles
  add column availability_slots jsonb not null default '[]'::jsonb
    check (public.valid_availability_slots(availability_slots));

-- 2. Convert the old chips (the app merges neighbouring windows when it loads them) -------

update public.profiles p
set availability_slots = coalesce(
  (
    select jsonb_agg(
      jsonb_build_object('day', d.day, 'from', r.from_time, 'to', r.to_time)
      order by d.position, r.from_time
    )
    from unnest(array['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
      with ordinality as d(day, position)
    cross join (
      values ('Morning', '08:00', '12:00'),
             ('Afternoon', '12:00', '18:00'),
             ('Evening', '18:00', '22:00')
    ) as r(name, from_time, to_time)
    where d.day = any (p.availability_days)
      and (r.name = any (p.availability_times) or cardinality(p.availability_times) = 0)
  ),
  '[]'::jsonb
)
where cardinality(p.availability_days) > 0;

-- 3. Same rights as the other private details: only you change it, only the view reads it -

revoke select (availability_slots) on public.profiles from authenticated;
grant update (availability_slots) on public.profiles to authenticated;

-- 4. profile_cards: same as 20261126000000_field_privacy.sql plus the new column at the end -

create or replace view public.profile_cards
with (security_barrier = true)
as
select
  p.id,
  p.student_id,
  p.username,
  p.first_name,
  p.last_name,
  p.languages,
  p.study_start,
  p.study_end,
  p.study_status,
  p.visibility,
  p.show_in_suggestions,
  p.created_at,
  p.updated_at,
  case when public.field_visible(p.field_visibility, 'photo', me.is_owner, me.is_friend)
    then p.avatar_url else '' end as avatar_url,
  case when public.field_visible(p.field_visibility, 'bio', me.is_owner, me.is_friend)
    then p.bio else '' end as bio,
  case when public.field_visible(p.field_visibility, 'country', me.is_owner, me.is_friend)
    then p.country else '' end as country,
  case when public.field_visible(p.field_visibility, 'program', me.is_owner, me.is_friend)
    then p.program else '' end as program,
  case when public.field_visible(p.field_visibility, 'interests', me.is_owner, me.is_friend)
    then p.sports else '{}'::text[] end as sports,
  case when public.field_visible(p.field_visibility, 'interests', me.is_owner, me.is_friend)
    then p.padel_level end as padel_level,
  case when public.field_visible(p.field_visibility, 'availability', me.is_owner, me.is_friend)
    then p.availability_days else '{}'::text[] end as availability_days,
  case when public.field_visible(p.field_visibility, 'availability', me.is_owner, me.is_friend)
    then p.availability_times else '{}'::text[] end as availability_times,
  case when public.field_visible(p.field_visibility, 'social', me.is_owner, me.is_friend)
    then p.instagram else '' end as instagram,
  case when public.field_visible(p.field_visibility, 'social', me.is_owner, me.is_friend)
    then p.linkedin else '' end as linkedin,
  case when public.field_visible(p.field_visibility, 'phone', me.is_owner, me.is_friend)
    then p.phone else '' end as phone,
  -- Others don't learn what you hide from whom.
  case when me.is_owner then p.field_visibility end as field_visibility,
  case when public.field_visible(p.field_visibility, 'availability', me.is_owner, me.is_friend)
    then p.availability_slots else '[]'::jsonb end as availability_slots
from public.profiles p
cross join lateral (
  select
    coalesce(p.id = (select auth.uid()), false) as is_owner,
    exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = (select auth.uid()) and f.addressee_id = p.id)
          or (f.addressee_id = (select auth.uid()) and f.requester_id = p.id)
        )
    ) as is_friend
) as me
where p.visibility = 'everyone' or p.id = (select auth.uid());

-- Unchanged rights (create or replace keeps them; repeated to be safe).
revoke all on public.profile_cards from public, anon;
grant select on public.profile_cards to authenticated;
