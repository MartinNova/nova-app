-- Group info like WhatsApp: a description of what the group is for.
-- Run once after 20261130000000_message_listing.sql (Supabase SQL Editor). See docs/accounts.md.

alter table public.chat_groups
  add column description text not null default ''
  check (char_length(description) <= 500);

-- Admins change it, like the name and picture ("Admins edit their groups" policy).
grant update (description) on public.chat_groups to authenticated;
