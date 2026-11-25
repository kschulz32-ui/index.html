# Sunday to Monday

Churches do the first half of James 1:22 well: people hear the message. This app helps with the second half, doing it. Each Sunday's sermon becomes a Monday recap, one personal commitment, five small daily actions and a short look-back at the end of the week.

Knowledge + Action = Transformation. The app is meant to be finite and calm. No feed, no streaks, no scores.

## Status

| Milestone | What | State |
| --- | --- | --- |
| 1 | Setup, magic link auth, schema, seed | done |
| 2 | Leader flow: transcript, Claude takeaways, edit, publish | done |
| 3 | Member flow: recap, commit, plan, today, harvest, log | done |
| 4 | Push + email fallback, recap cron (every 15 min) | next |
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

## Leader flow

1. **Leader > New message**: paste the transcript or notes, set the date, speaker and an optional video link. The link is stored as text only, nothing is downloaded.
2. **Draft takeaways with Claude** sends the transcript to Claude from the server (`src/server/ai.ts`) and asks for structured JSON: title, scripture, 3 to 5 `{know, act}` pairs and a transformation line. **Write them myself** skips Claude.
3. The editor shows every field, with a live word count for each Know line. Save as many drafts as you like.
4. **Publish to members** runs the strict checks (3 to 5 takeaways, Know at most 16 words, every Act and the Become line filled). Only then does `status` flip to `published`. Members' queries only ever read published rows.
5. Once live, wording can be fixed but takeaways can't be added or removed, because members' commitments point at a takeaway by position. Drafts can be deleted, but published messages can't.

### Claude

- Model `claude-opus-5-5`, structured outputs (Zod schema), effort `medium`, server-side refusal fallback (`fallbacks: "default"`).
- The transcript is cleaned (control characters removed, anything that looks like a `<transcript>` or `<system>` tag defused) and wrapped in `<transcript>` tags. The system prompt says that text is data, not instructions. The output is validated and clamped again on our side.
- Rate limits: 12 drafts per leader per hour, 60 per church per day.
- Transcripts over 100k characters are rejected with a message instead of being cut silently. Only the first 6,000 characters are stored.
- **No key?** Leave `ANTHROPIC_API_KEY` empty. The leader screens say Claude isn't set up and go straight to writing takeaways by hand. If a call fails (bad key, outage, refusal), the draft is still created and the leader is told to write the takeaways.

## Member flow

1. **Recap** shows the latest published message: each takeaway's Know line with its Act line under it, then the Become sentence. Opening it counts as "opened".
2. Tapping a takeaway opens **This week I will...**, prefilled with the suggested action. Nothing else is shown until the member confirms their own words.
3. They pick **Do it, Pray it, Say it or Share it**. The server asks Claude for exactly 5 daily actions (`src/server/ai.ts`, effort `low`). If there's no key, the call fails or the member hits the rate limit (6 an hour), the built-in plan for that mode is used and the Today screen says so.
4. **Today** shows the commitment, a five-day strip and the selected day's action. Future days are locked, both in the UI and on the server. Past days can still be marked done, with an optional one-line note. Any action can be reworded. If an earlier day was missed: "Nothing is lost. Today is the next one."
5. From day 5 on, **What grew in you this week?** appears. After day 5 the week says it's finished, and the next message starts a new loop.
6. **Log** is private: what they heard, what they said they'd do, what they did, and what changed, for every week, plus **Copy my log** and the **Count me in church totals** switch (off by default).

"Today" is always the church's local date (`church.timezone`). Events (`opened`, `chose`, `acted`, `finished`) are counts only, recorded once per person per message. "Finished" means the look-back was written.

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
