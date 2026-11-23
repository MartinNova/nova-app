-- Rooms & flats: a listing can name several areas, also one typed in under "Other".
-- Run once after 20261128000000_room_listing_edit.sql (Supabase SQL Editor). See docs/accounts.md.

alter table public.room_listings add column areas text[] not null default '{}';

-- Existing listings keep their one area.
update public.room_listings set areas = array[area] where cardinality(areas) = 0;

-- One to five areas, each at most 60 characters (`area` stays the first one, for older app versions).
alter table public.room_listings
  add constraint room_listings_areas_count check (cardinality(areas) between 1 and 5),
  add constraint room_listings_areas_length check (char_length(array_to_string(areas, '|')) <= 5 * 61);

grant update (areas) on public.room_listings to authenticated;
