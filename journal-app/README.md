# The Journal — Message Action Journal

Cultivate > Consume.

A small weekly journal for a church small group pilot: the leader enters
Sunday's takeaways and one prompt for a brave next step, it goes out to the
group every Monday at noon, and members write short entries across
personal / work / family that build into their own journal over time.

## Stack

- Node.js + Express, server-rendered EJS views (no frontend build step)
- SQLite via `better-sqlite3` — a real file-backed database, not JSON files
- `node-cron` for the Monday-noon send check
- A mock email "sender" that logs exactly what would be sent to the console
  — swap `src/mailer.js`'s `sendEmail()` for a real provider (Postmark,
  SendGrid, etc.) once the flow is proven; nothing else needs to change

This is intentionally simple to run and cheap to host (Fly.io, Render,
Railway, a small VPS — anywhere that gives the SQLite file a persistent
disk/volume).

## Setup

```
npm install
cp .env.example .env   # adjust BASE_URL / GROUP_TIMEZONE for your deploy
npm start
```

The app runs at `http://localhost:3000` and redirects to `/leader`. A
single "Pilot Group" is seeded automatically on first run — the schema
supports more groups later, but every route currently operates against
that first group.

## How the pieces fit together

**Leader flow** (`/leader`, no login yet — see "Not built yet" below)
1. `/leader/entries/new` — enter the sermon date, title/theme, five
   takeaways, and one prompt for a specific, courageous action.
2. `/leader/entries/:id/confirm` — see the *exact* email text that will go
   out, and the list of recipients. Nothing sends from this screen by
   itself.
3. Confirming schedules the entry for the next Monday at noon (in
   `GROUP_TIMEZONE`) — it does not send immediately. A cron check runs
   every minute looking for approved entries whose time has come.
4. `/leader` — the week list doubles as the look-back view, showing each
   past week's status and (once sent) how many members have written an
   entry so far.

**Member flow** (`/journal/:token`, no login — the token is the link)
- `/journal/:token` — this week's entry: the sermon date/title, takeaways,
  the prompt, and a form for personal / work / family (all optional).
- `/journal/:token/history` — every past entry, headed by its sermon date
  and title like a real journal, with what the member wrote (or a quiet
  "pick this back up when you're ready" for weeks they haven't gotten to).

Member tokens are generated when you add someone under `/leader/members`
and don't expire — a member's link always takes them back to their own
journal.

## Deploying to Fly.io (free-tier friendly, with a persistent volume)

Fly.io is the recommended host here because it gives the SQLite database an
actual persistent disk on its free usage allowance — Render's free web
service tier, by contrast, wipes the filesystem on every restart, which
would silently erase the journal.

From inside `journal-app/`, on your own machine (this needs your own Fly
account — I can't authenticate as you from here):

1. Install the CLI and sign up/log in:
   ```
   curl -L https://fly.io/install.sh | sh
   fly auth signup   # or: fly auth login
   ```
2. Launch the app. Fly will detect the `Dockerfile` and offer to rewrite
   `fly.toml` with your app name/region — let it, then say **no** when it
   asks to deploy immediately (we need the volume first):
   ```
   fly launch --no-deploy
   ```
3. Create the persistent volume the database lives on (must match the
   `[[mounts]]` `destination` in `fly.toml`, `/data`):
   ```
   fly volumes create journal_data --size 1 --region <same region as above>
   ```
4. Deploy:
   ```
   fly deploy
   ```
5. Once it's up, update `BASE_URL` in `fly.toml` to your real
   `https://<your-app-name>.fly.dev` URL (this only affects the link text
   inside the mocked email logs) and redeploy:
   ```
   fly deploy
   ```
6. Open it:
   ```
   fly open        # or just visit https://<your-app-name>.fly.dev/leader
   ```

The Dockerfile and `fly.toml` are already in this branch and were smoke-tested
locally (production env vars, custom `DATABASE_PATH`, server boot) — `fly
launch` should just work against them without edits beyond app name/region.

## Testing the send without waiting for an actual Monday

Since email is mocked anyway, an approved entry can be force-sent
immediately from its detail page (`Send now (testing only)`) — this hits
`POST /leader/entries/:id/send-now-dev`, which is not linked from any
member-facing copy or nav. Sent output shows up in the server console.

## Data model

- `groups` — just one today, but every other table is scoped by `group_id`
- `members` — name, email, active flag, a unique token for their journal link
- `weekly_entries` — sermon date + title (both required to send), prompt
  text, status (`draft` / `approved` / `sent`), scheduled/sent timestamps
- `weekly_takeaways` — the five takeaways for an entry, as ordered rows
- `journal_responses` — one row per member per weekly entry, with
  personal/work/family text fields and timestamps

## Not built yet (by design, for this pilot)

- Leader authentication (routes under `/leader` are open — fine while it's
  just you; add a shared password or real auth before handing this to a
  co-leader)
- SMS, analytics/charts, multi-group UI, self-serve signup, AI-generated
  content, a native mobile app
