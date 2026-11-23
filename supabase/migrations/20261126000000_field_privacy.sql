-- Who sees which profile detail: Everyone, Friends (accepted friend requests) or Only me.
-- Always visible (to students who can see the profile at all): name, username, student ID,
-- languages, study status with start and end. Everything else follows Settings -> Privacy.
--
-- Enforced here, not only in the app: the `profiles` table no longer hands out the private
-- columns, and the app reads profiles through the view `profile_cards`, which empties every
-- detail the signed-in student may not see. Hidden values never leave the database.
--
-- Run once in the Supabase SQL Editor right BEFORE deploying the app version with this
-- setting: from then on the old app version can't read the private columns any more.

-- 1. The setting: one audience per detail, missing keys = default -----------------------

create function public.valid_field_visibility(settings jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(settings) <> 'object' then false
    else not exists (
      select 1
      from jsonb_each_text(settings) as e(key, value)
      where e.key not in (
          'photo', 'bio', 'country', 'program', 'interests', 'availability', 'social', 'phone'
        )
        or e.value not in ('everyone', 'friends', 'private')
    )
  end;
$$;

alter table public.profiles
  add column field_visibility jsonb not null default '{}'::jsonb
    check (public.valid_field_visibility(field_visibility));

-- Only you change your own settings (row policy "Users can update their own profile").
-- Not readable on the table: the view below shows them to their owner only.
grant update (field_visibility) on public.profiles to authenticated;

-- 2. The rule (same as canSee() in lib/profile/privacy.ts) -----------------------------

-- Defaults: everything for everyone, except the mobile number (friends only).
create function public.field_visible(
  settings jsonb,
  field text,
  is_owner boolean,
  is_friend boolean
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(is_owner, false) or case coalesce(
      settings ->> field,
      case when field = 'phone' then 'friends' else 'everyone' end
    )
    when 'everyone' then true
    when 'friends' then coalesce(is_friend, false)
    else false
  end;
$$;

-- 3. The table only hands out the always-visible columns ------------------------------

revoke select (
  avatar_url, bio, country, program, sports, padel_level,
  availability_days, availability_times, instagram, linkedin, phone
) on public.profiles from authenticated;

-- 4. What the app reads: every detail checked for the signed-in student ---------------

-- The view runs with its owner's rights (it has to: students can't read the private
-- columns themselves), so it repeats the row rule of the profiles table in its WHERE:
-- public profiles and your own. Friends = an accepted request between you and them.
create view public.profile_cards
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
  case when me.is_owner then p.field_visibility end as field_visibility
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

-- Signed-in students only (new objects are exposed to anon by default in Supabase).
revoke all on public.profile_cards from public, anon;
grant select on public.profile_cards to authenticated;
