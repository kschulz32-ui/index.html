// Seeds one church, one admin, one leader, two members, one published example
// message, and one draft (to check drafts stay hidden from members).
//
//   npm run db:seed            adds the seed data if it isn't there yet
//   npm run db:seed -- --reset removes the seed church (and everything in it) first
import "./env";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "../src/db";
import { churches, messages, users } from "../src/db/schema";

const JOIN_CODE = "GRACE22";
const SEED_EMAILS = [
  "admin@example.org",
  "leader@example.org",
  "maria@example.org",
  "sam@example.org",
];

/** Most recent Sunday on or before today, as YYYY-MM-DD. */
function lastSunday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

async function main() {
  const reset = process.argv.includes("--reset");
  const [existing] = await db.select().from(churches).where(eq(churches.joinCode, JOIN_CODE));

  if (existing && !reset) {
    console.log("Seed data already there. Run with --reset to recreate it.");
    return;
  }
  if (existing) {
    await db.delete(users).where(inArray(users.email, SEED_EMAILS));
    await db.delete(churches).where(eq(churches.id, existing.id));
    console.log("Removed old seed data.");
  }

  const [church] = await db
    .insert(churches)
    .values({
      name: "Grace Community Church",
      timezone: "America/Chicago",
      recapDay: 1,
      recapTime: "12:00",
      joinCode: JOIN_CODE,
    })
    .returning();

  const [, leader] = await db
    .insert(users)
    .values([
      { email: "admin@example.org", name: "Admin", role: "admin", churchId: church.id },
      { email: "leader@example.org", name: "Pastor Dana", role: "leader", churchId: church.id },
      { email: "maria@example.org", name: "Maria", role: "member", churchId: church.id, shareCounts: true },
      { email: "sam@example.org", name: "Sam", role: "member", churchId: church.id },
    ])
    .returning();

  const sunday = lastSunday();

  await db.insert(messages).values([
    {
      churchId: church.id,
      title: "Doers, Not Only Hearers",
      speaker: "Pastor Dana",
      date: sunday,
      scripture: ["James 1:22-25"],
      takeaways: [
        {
          know: "Hearing God's word is a good start, but it is meant to change how we live.",
          act: "Write one line from Sunday on a card and put it where you will see it.",
        },
        {
          know: "Scripture is like a mirror. We can walk away and forget, or respond.",
          act: "Take two quiet minutes tonight and name one thing you noticed about yourself.",
        },
        {
          know: "Small acts of obedience, done often, matter more than big plans we never start.",
          act: "Pick one five minute kindness and do it before lunch tomorrow.",
        },
        {
          know: "Doing what we hear brings a quiet kind of freedom.",
          act: "Text a friend one thing you sense God is teaching you right now.",
        },
      ],
      transformation: "Someone whose faith shows up on Monday in small, steady ways.",
      transcriptExcerpt:
        "James tells us to be doers of the word and not hearers only. He says that if we only listen, " +
        "we are like someone who looks in a mirror, walks away, and forgets what they look like. " +
        "The point is not to hear more. The point is to do one small thing with what we heard.",
      status: "published",
      publishedAt: new Date(),
      createdBy: leader.id,
    },
    {
      churchId: church.id,
      title: "Draft: Quick to Listen",
      speaker: "Pastor Dana",
      date: sunday,
      scripture: ["James 1:19-21"],
      takeaways: [
        { know: "Listening well is a way of loving people.", act: "Ask one person a question and just listen." },
      ],
      transformation: "Someone who listens first.",
      status: "draft",
      createdBy: leader.id,
    },
  ]);

  console.log(`Seeded "${church.name}" (join code ${JOIN_CODE}).`);
  console.log("Sign in as any of:", SEED_EMAILS.join(", "));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
