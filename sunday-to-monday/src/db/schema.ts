import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["member", "leader", "admin"]);
export const messageStatusEnum = pgEnum("message_status", ["draft", "published"]);
export const modeEnum = pgEnum("commit_mode", ["do", "pray", "say", "share"]);
export const eventTypeEnum = pgEnum("event_type", ["opened", "chose", "acted", "finished"]);
export const channelEnum = pgEnum("notify_channel", ["push", "email"]);

export type Takeaway = { know: string; act: string };

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const churches = pgTable(
  "church",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    // IANA zone, e.g. "America/Chicago"
    timezone: varchar("timezone", { length: 64 }).notNull().default("America/Chicago"),
    // 0 = Sunday ... 6 = Saturday
    recapDay: smallint("recap_day").notNull().default(1),
    // "HH:MM" 24h, local to the church timezone
    recapTime: varchar("recap_time", { length: 5 }).notNull().default("12:00"),
    // Short code members type once to join their church
    joinCode: varchar("join_code", { length: 16 }).notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [
    check("recap_day_range", sql`${t.recapDay} between 0 and 6`),
    check("recap_time_format", sql`${t.recapTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
  ],
);

export const users = pgTable(
  "app_user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    name: varchar("name", { length: 80 }),
    churchId: uuid("church_id").references(() => churches.id, { onDelete: "set null" }),
    role: roleEnum("role").notNull().default("member"),
    notifyPush: boolean("notify_push").notNull().default(true),
    notifyEmail: boolean("notify_email").notNull().default(true),
    shareCounts: boolean("share_counts").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("app_user_email_lower").on(sql`lower(${t.email})`),
    index("app_user_church").on(t.churchId),
  ],
);

export const messages = pgTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    churchId: uuid("church_id")
      .notNull()
      .references(() => churches.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 140 }).notNull(),
    speaker: varchar("speaker", { length: 80 }),
    date: date("date").notNull(),
    scripture: text("scripture").array().notNull().default(sql`'{}'::text[]`),
    takeaways: jsonb("takeaways").$type<Takeaway[]>().notNull().default(sql`'[]'::jsonb`),
    transformation: varchar("transformation", { length: 300 }),
    link: varchar("link", { length: 500 }),
    // Only an excerpt is kept. The church owns the full transcript.
    transcriptExcerpt: varchar("transcript_excerpt", { length: 6000 }),
    status: messageStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("message_church_status").on(t.churchId, t.status, t.date),
    check(
      "published_has_time",
      sql`(${t.status} = 'draft') or (${t.publishedAt} is not null)`,
    ),
  ],
);

export const commitments = pgTable(
  "commitment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    takeawayIndex: smallint("takeaway_index").notNull(),
    iWill: varchar("i_will", { length: 280 }).notNull(),
    mode: modeEnum("mode"),
    startDate: date("start_date").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // One loop per person per message
    uniqueIndex("commitment_user_message").on(t.userId, t.messageId),
    check("takeaway_index_range", sql`${t.takeawayIndex} between 0 and 4`),
  ],
);

export const actionDays = pgTable(
  "action_day",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commitmentId: uuid("commitment_id")
      .notNull()
      .references(() => commitments.id, { onDelete: "cascade" }),
    dayIndex: smallint("day_index").notNull(),
    text: varchar("text", { length: 400 }).notNull(),
    done: boolean("done").notNull().default(false),
    note: varchar("note", { length: 200 }),
    doneAt: timestamp("done_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("action_day_commitment_day").on(t.commitmentId, t.dayIndex),
    check("day_index_range", sql`${t.dayIndex} between 0 and 4`),
  ],
);

export const lookbacks = pgTable("lookback", {
  id: uuid("id").primaryKey().defaultRandom(),
  commitmentId: uuid("commitment_id")
    .notNull()
    .unique()
    .references(() => commitments.id, { onDelete: "cascade" }),
  text: varchar("text", { length: 1000 }).notNull(),
  createdAt: createdAt(),
});

export const pushSubscriptions = pgTable("push_subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: createdAt(),
});

// Counts only. Never holds free text.
export const events = pgTable(
  "event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    type: eventTypeEnum("type").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // Each step counts once per person per message
    uniqueIndex("event_once").on(t.userId, t.messageId, t.type),
    index("event_message").on(t.messageId, t.type),
  ],
);

// One row per (person, message, channel). The unique index is what makes
// the recap send idempotent: we insert first, and only send if the insert won.
export const notificationSends = pgTable(
  "notification_send",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    channel: channelEnum("channel").notNull(),
    sentAt: createdAt(),
  },
  (t) => [uniqueIndex("notification_once").on(t.userId, t.messageId, t.channel)],
);

// ---- Auth ----

// Magic link tokens. We store only a SHA-256 hash of the token.
export const loginTokens = pgTable(
  "login_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("login_token_email").on(t.email, t.createdAt)],
);

// Server-side sessions. The cookie holds a random token, the DB holds its hash.
export const sessions = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("session_user").on(t.userId)],
);

// Fixed-window counters for rate limiting (Claude routes, sign-in emails).
export const rateLimits = pgTable("rate_limit", {
  key: varchar("key", { length: 200 }).primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
});

export type Church = typeof churches.$inferSelect;
export type User = typeof users.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Commitment = typeof commitments.$inferSelect;
export type ActionDay = typeof actionDays.$inferSelect;
