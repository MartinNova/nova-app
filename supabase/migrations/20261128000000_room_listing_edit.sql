-- Rooms & flats: edit your listing after posting it.
-- Run once after 20261127000000_availability_slots.sql (Supabase SQL Editor). See docs/accounts.md.

-- Only the content can change: not who posted it, when, or whether it's an offer or a search.
grant update (
  title, room_type, area, rent, bills_included, available_from, available_until,
  description, photos
) on public.room_listings to authenticated;

create policy "Users can edit their own listings"
  on public.room_listings for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);
