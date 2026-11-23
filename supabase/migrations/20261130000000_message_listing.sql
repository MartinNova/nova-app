-- Chats: a message written from "Message" on a room listing shows that listing as a card
-- (picture, title, price) with a link to it, like a quoted reply.
-- Run once after 20261129000000_room_listing_areas.sql (Supabase SQL Editor). See docs/accounts.md.

-- A small snapshot (id, title, subtitle, photo), so the chat still shows what it was about
-- after the listing changes or is taken down. Senders set it when sending; nobody can edit it.
alter table public.messages
  add column listing jsonb
  check (listing is null or (jsonb_typeof(listing) = 'object' and pg_column_size(listing) <= 2048));
