-- Friend requests: you're only friends once the other person accepts.
-- Until now everyone on the app counted as a friend; existing chats and groups stay as they are.
-- Run once in the Supabase SQL Editor BEFORE deploying the app version with friend requests,
-- because the app reads the new table.

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

-- One request per pair, whichever direction it was sent in.
create unique index friendships_pair_idx on public.friendships (
  least(requester_id, addressee_id), greatest(requester_id, addressee_id)
);
create index friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

-- Both people see the request. Only the status can change (and only to "accepted").
-- Declining, withdrawing and unfriending all delete the row.
grant select, insert, delete on public.friendships to authenticated;
grant update (status, responded_at) on public.friendships to authenticated;

create policy "Users see their own friend requests"
  on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));
create policy "Users send friend requests as themselves"
  on public.friendships for insert to authenticated
  with check ((select auth.uid()) = requester_id and status = 'pending' and responded_at is null);
create policy "Only the recipient accepts a request"
  on public.friendships for update to authenticated
  using ((select auth.uid()) = addressee_id and status = 'pending')
  with check ((select auth.uid()) = addressee_id and status = 'accepted');
create policy "Either person declines, withdraws or unfriends"
  on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Live updates: new requests show up (and the badge counts them) without reloading.
alter publication supabase_realtime add table public.friendships;
