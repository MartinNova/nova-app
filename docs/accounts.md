# Accounts (e-mail + password)

Students create an account with e-mail, username and password, add a profile
picture and fill in their settings. Supabase handles login, database and file
storage. Without the Supabase keys in `.env.local` the app keeps the demo login.

| Page        | What it does                                                                              |
| ----------- | ----------------------------------------------------------------------------------------- |
| `/login`    | Sign in or create an account                                                              |
| `/profile`  | "Your area": your profile card (picture, programme, year, interests)                      |
| `/settings` | Profile, studies at Nova, sports & free time, privacy, account (e-mail, password, delete) |
| `/friends`  | Everyone with a public profile, search and filters; tap someone to see how to reach them  |

The header shows **Sign in** when signed out, otherwise the settings gear and your picture.

## One-time setup (Supabase)

1. Create a free project on [supabase.com](https://supabase.com), region EU.
2. **SQL Editor** → run every file in `supabase/migrations/` once, oldest first:
   1. `20261117000000_profiles.sql` (profiles table)
   2. `20261117010000_accounts.sql` (username, picture, settings, `avatars` bucket)
   3. `20261117020000_padel_friends.sql` (shared padel matches, live updates, e-mail hidden from others)
   4. `20261118000000_rooms.sql` (rooms & flats listings, `room-photos` bucket, live updates)
   5. `20261118010000_messages.sql` (direct messages, only readable by the two people in a chat)
   6. `20261118020000_padel_requests.sql` (ask to join a padel match, the organiser accepts or declines)
   7. `20261119000000_message_images.sql` (pictures in chats, private `message-images` bucket)
   8. `20261119010000_message_files.sql` (files in chats, private `message-files` bucket)
   9. `20261119020000_group_chats.sql` (group chats with admins, private `group-photos` bucket)
   10. `20261119030000_student_id.sql` (student ID editable in Settings)
   11. `20261119040000_student_id_visible.sql` (student ID shown on profiles to other students)
   12. `20261121000000_student_count.sql` (number of students for the welcome screen, no names)
   13. `20261122000000_message_actions.sql` (long-press on a message: reactions, reply, forward, delete)
   14. `20261123000000_profile_phone.sql` (optional mobile number, visible to signed-in students who can see your profile)
   15. `20261124000000_friendships.sql` (friend requests: send, accept or decline, unfriend; live updates)
   16. `20261125000000_personal_data.sql` (to-dos and timetable saved per account, on every device)
   17. `20261126000000_field_privacy.sql` (who sees which profile detail: Everyone, Friends or Only me)
   18. `20261127000000_availability_slots.sql` ("Usually free" with real times per weekday)
   19. `20261128000000_room_listing_edit.sql` (edit your room listing after posting it)
   20. `20261129000000_room_listing_areas.sql` (several areas per room listing, also your own under "Other")
   21. `20261130000000_message_listing.sql` (messages written from a room listing show it as a card)
3. **Authentication → Sign In / Providers → Email**: enabled (default).
   - For a live demo, turn **Confirm email** off: Supabase's built-in mail server only
     sends a few e-mails per hour. With it on, new users must click a link first.
4. **Authentication → URL Configuration**: Site URL `http://localhost:3000`,
   Redirect URLs `http://localhost:3000/auth/callback` (add the deployed URL later).
5. **Project Settings → API Keys**: copy the Project URL and the publishable / `anon` key.

```bash
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                  # restart after changing .env.local
```

The `anon` key is meant for the browser; access is protected by row level security.
Never put the `service_role` key into the app or the repo.

## Who can see what

- Signed-in users see profiles with visibility "All students on the app" and always their own.
- Everyone can only edit their own profile; e-mail and student number can't be edited.
- Profile pictures are public by URL (bucket `avatars`), each user can only upload to their own folder.
- "Delete account" removes the login, profile and pictures for good.

## Options

| Variable                            | Effect                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` | e.g. `novasbe.pt`: only these addresses may sign in. Empty = everyone.                               |
| `NEXT_PUBLIC_MICROSOFT_LOGIN`       | `true` adds "Sign in with Microsoft" ([docs/microsoft-login.md](microsoft-login.md), needs Nova IT). |
