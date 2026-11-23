# Nova Life

Web app that makes campus life at **Nova SBE (Lisbon)** more social and better organised.
Group project for **Introduction to Programming** (NOVA Master, S1).

## Features

Live at **https://nova-app-orcin-tau.vercel.app** (scan `docs/nova-app-qr.png`). Sign in with
e-mail and password, or look around without an account.

| Module    | What you can do                                                                                                                                                                                                                                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home      | **Your Week** (lectures, deadlines, to-dos, padel and runs of this week) and swipeable widgets: next lecture, surf in Carcavelos, padel, to-dos                                                                                                                                                                                                            |
| Sport     | **Padel**: post a booked court, ask to join, organiser accepts or declines (live). **Running**: clubs and runs. **Surf**: forecast (weather API) and schools. **Gym**, **Yoga**                                                                                                                                                                            |
| Study Hub | **Timetable**: weekly lectures, `.ics` import of exams and Moodle deadlines, holidays; tap a lecture to change name, day, time, room, Moodle link and notes. **To-dos**: lists, board, labels. **Payment deadlines**: import your own netPA statement (Excel/CSV), countdown, calendar reminders, what you already paid. **New at Nova**: apps and clubs   |
| Friends   | **Friend requests** (send, accept, decline), search all students. **Chats and groups** live: online dot, "typing…", photos and files, long-press to react, reply, forward, copy or delete, swipe to reply, **search across all chats**. **Group info**: description, admins, add people, media, links and docs                                             |
| Campus    | **Getting to campus** (next CP trains from Carcavelos/Oeiras, your train after class, Uber, map). **Rooms & flats**: listings with photo gallery, several areas (or your own under "Other"), filters (price range, type, bills, photos, move-in) and sorting, edit your listing, message the poster with the listing attached. Food Options, library links |
| Account   | Profile with picture, programme, links, optional phone and when you're usually free; choose who sees each detail (**Everyone / Friends / Only me**); change e-mail/password; delete account                                                                                                                                                                |

How it is built and why: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Tech stack

- Next.js (App Router), React, TypeScript
- Tailwind CSS, lucide-react icons
- ESLint + Prettier, GitHub Actions CI
- Supabase: Auth, Postgres with Row Level Security, Storage, Realtime ([docs/accounts.md](docs/accounts.md))
- Service layer (`lib/services`) with a demo mode (localStorage) when Supabase isn't configured
- Vercel (deploys `main` automatically)

## Setup

Requires Node.js 20.9 or newer (CI uses Node 24, see `.nvmrc`).

```bash
npm ci             # installs exactly the versions in package-lock.json
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

Dependencies are pinned to exact versions (`.npmrc` has `save-exact=true`), and CI fails on any
known vulnerability (`npm audit`). GitHub Actions are pinned to commit SHAs.

| Script              | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Start the dev server                         |
| `npm run lint`      | ESLint                                       |
| `npm run typecheck` | TypeScript check                             |
| `npm run format`    | Format all files with Prettier               |
| `npm test`          | Unit tests (Vitest)                          |
| `npm run build`     | Production build                             |
| `npm audit`         | Check dependencies for known vulnerabilities |

### Accounts and demo mode

The live app uses real accounts: sign up with e-mail and password (Supabase Auth, see
[docs/accounts.md](docs/accounts.md)). Without the Supabase keys in `.env.local` the app runs in
**demo mode**: data stays in the browser and you switch accounts in the header. Demo mode ships four
**team placeholder** accounts and six fictional **demo students**. To show your real names and
student IDs there (e.g. in the presentation), set `NEXT_PUBLIC_TEAM_MEMBERS` in `.env.local`. It is
never committed.

## Tests

`npm test` runs 450+ unit tests (Vitest) on every pull request and on `main` (see CI). They cover
the accepted path, the **rejected** actions and the **edge cases** of each workflow:

| Area                         | Accepted                                                 | Rejected / edge cases                                                                                                                                            | Files                                                 |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Accounts                     | valid usernames, profiles, links                         | too short/long usernames, 7-char passwords, bio over 300, fake LinkedIn URLs, wrong password message                                                             | `lib/profile/`, `lib/auth/`, `lib/validation/`        |
| Padel                        | post, ask to join, accept, leave                         | past dates, full courts, double requests, declined players asking again, non-organisers answering or cancelling                                                  | `lib/padel/`, `lib/services/rejected-actions.test.ts` |
| Rooms                        | post, filter, delete own                                 | someone else deleting your listing, rent 0 / 5001 / not a number, title 81 chars, end before start                                                               | `lib/rooms/`, `lib/services/`, `lib/validation/`      |
| Messages                     | send, group chats, unread, mark read                     | empty or 1001-char messages, others reading your chat, marking your own messages as read                                                                         | `lib/messages/`, `lib/services/`                      |
| Trains, deadlines, timetable | next trains, train after class, `.ics` export and import | after midnight, no data for a day, DST, holidays                                                                                                                 | `lib/transport/`, `lib/deadlines/`, `lib/timetable/`  |
| Security                     | –                                                        | every table has Row Level Security, no table granted to signed-out visitors, security-definer functions pin `search_path`, no secret keys or `.env.local` in git | `lib/security/security.test.ts`                       |

The services are tested in demo mode (an in-memory `localStorage`), so tests need no network.
The same rules are enforced a second time by the database (check constraints and RLS policies in
`supabase/migrations/`), so a modified client can't skip them.

## Folder structure

```
app/                    routes (one folder per URL), e.g. sport/padel, campus/rooms, friends/chat
components/
  ui/ layout/ providers/  shared building blocks, header and tab bar, current user
  <module>/             UI per module (sport/padel, rooms, messages, transport, ...)
lib/
  services/             data access per module: Supabase or localStorage (demo)
  <module>/             pure rules per module (validation, sorting, calculations) + tests
  supabase/             Supabase clients and config
  security/ validation/ cross-cutting tests (RLS, secrets, boundary values)
types/                  data shapes and service contracts per module
data/                   demo data, generated train timetable
supabase/migrations/    database tables, constraints and RLS policies (run in order)
scripts/                build-train-timetable.mjs (CP GTFS -> data/trains.json)
docs/                   ARCHITECTURE.md, accounts.md (Supabase setup), QR code
```

Details per layer and why: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Team workflow

One branch per feature, Pull Request into `main`, review by a teammate.
See [CONTRIBUTING.md](CONTRIBUTING.md) for which files belong to which module.

## Roadmap

Done: sport, study hub, friends with requests, chats and groups, campus, accounts, deployment. Next steps and known
limits are listed in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#5-limits-honest-list).

## Team

| Name                | Student ID |
| ------------------- | ---------- |
| Anna Nenninger      | 79633      |
| Martin Schallermair | 79780      |
| Till Fassbender     | 79109      |
| Lea Esau            | 78415      |
