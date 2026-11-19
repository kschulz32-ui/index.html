# Sunday to Monday

Churches do the first half of James 1:22 well: people hear the message. This app helps with the second half, doing it. Each Sunday's sermon becomes a Monday recap, one personal commitment, five small daily actions and a short look-back at the end of the week.

Knowledge + Action = Transformation. The app is meant to be finite and calm. No feed, no streaks, no scores.

## Status

| Milestone | What | State |
| --- | --- | --- |
| 1 | Setup, magic link auth, schema, seed | done |
| 2 | Leader flow: transcript, Claude takeaways, edit, publish | next |
| 3 | Member flow: recap, commit, plan, today, harvest, log | |
| 4 | Push + email fallback, recap cron (every 15 min) | |
| 5 | Leader counts view | |
| 6 | PWA install, offline shell, polish, privacy tests | |

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Postgres + Drizzle ORM. Any Postgres 14+ works, so the hosted database can be picked later.
- Magic link sign-in, built in (`src/server/auth-core.ts`). Tokens and sessions are stored only as SHA-256 hashes.
- Vitest for tests, run against a real throwaway Postgres database.

## Run it locally

You need Node 20.9+ and a Postgres database.

```bash
npm install
cp .env.example .env.local     # then edit DATABASE_URL / TEST_DATABASE_URL
npm run db:setup               # runs migrations, then seeds
npm run dev
```

Open http://localhost:3000. While `EMAIL_DRIVER=console` (the default in dev), sign-in emails are printed to the server log and the sign-in page shows the link directly, so no email provider is needed yet.

### Seed accounts

`npm run db:seed` creates "Grace Community Church" (join code `GRACE22`, America/Chicago, recap Monday 12:00) with:

| Email | Role |
| --- | --- |
| admin@example.org | admin |
| leader@example.org | leader |
| maria@example.org | member (sharing counts on) |
| sam@example.org | member |

It also adds one published example message ("Doers, Not Only Hearers") and one draft, which members should never see. Use `npm run db:seed -- --reset` to recreate the seed church.

Any other email can sign in too. New people land on a "Find your church" screen and join with the church code.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run db:generate` | make a new migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | apply migrations |
| `npm run db:seed` | add seed data |
| `npm test` | migrate the test DB, then run tests (they wipe `TEST_DATABASE_URL`) |
| `npm run typecheck` / `npm run lint` | checks |

## Layout

```
src/db/schema.ts        all tables (church, app_user, message, commitment, action_day,
                        lookback, push_subscription, event, notification_send, auth, rate_limit)
src/server/             server-only code: auth, sessions, rate limits, email, data access
src/app/(auth)/         sign-in, verify, join
src/app/(app)/          signed-in screens with the bottom tab bar
scripts/                migrate + seed
tests/                  vitest, against Postgres
drizzle/                generated SQL migrations
```

## Privacy notes so far

- Member screens read messages only through `src/server/messages.ts`, which always filters to the member's church and `status = 'published'`.
- Magic links need a button tap on the landing page (a POST), so email scanners that pre-open links can't use them up.
- The `event` table has no free-text column. The `notification_send` table has a unique key per person, message and channel, which is what will make recap sends idempotent in milestone 4.
