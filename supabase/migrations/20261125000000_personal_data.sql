-- Personal to-dos and timetable, saved per account instead of only in this browser,
-- so they show up on every device you sign in on.
-- Run once in the Supabase SQL Editor. Until it has run, the app keeps both in the browser
-- (it checks for the missing table), so the order of deploy and SQL doesn't matter.

create table public.personal_data (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- 'todos' = lists, labels and tasks; 'timetable' = lectures, imported calendars and events.
  kind text not null check (kind in ('todos', 'timetable')),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 1000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.personal_data enable row level security;

-- Private: nobody else can read or change your to-dos and timetable.
grant select, insert, update, delete on public.personal_data to authenticated;

create policy "Users read their own personal data"
  on public.personal_data for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users save their own personal data"
  on public.personal_data for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users update their own personal data"
  on public.personal_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own personal data"
  on public.personal_data for delete to authenticated
  using ((select auth.uid()) = user_id);
