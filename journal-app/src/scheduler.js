const cron = require('node-cron');
const { db } = require('./db');
const { buildEmailContent, sendEmail } = require('./mailer');

// Sends any approved weekly entry whose scheduled send time has arrived.
// Called every minute by the cron job below, and can also be invoked
// directly (see routes/leader.js dev trigger) for testing without waiting
// for an actual Monday.
async function runScheduledSends() {
  const dueEntries = db
    .prepare(
      `SELECT * FROM weekly_entries
       WHERE status = 'approved' AND scheduled_for <= datetime('now')`
    )
    .all();

  for (const entry of dueEntries) {
    await sendEntryNow(entry.id);
  }

  return dueEntries.length;
}

async function sendEntryNow(entryId) {
  const entry = db.prepare('SELECT * FROM weekly_entries WHERE id = ?').get(entryId);
  if (!entry || entry.status === 'sent') return;

  const takeaways = db
    .prepare(
      'SELECT * FROM weekly_takeaways WHERE weekly_entry_id = ? ORDER BY position ASC'
    )
    .all(entry.id);

  const members = db
    .prepare('SELECT * FROM members WHERE group_id = ? AND active = 1')
    .all(entry.group_id);

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  for (const member of members) {
    const journalUrl = `${baseUrl}/journal/${member.token}`;
    const { subject, body } = buildEmailContent({ entry, takeaways, member, journalUrl });
    await sendEmail({ to: member.email, subject, body });
  }

  db.prepare(
    `UPDATE weekly_entries SET status = 'sent', sent_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).run(entry.id);
}

function startScheduler() {
  // Checks every minute for entries whose scheduled Monday-noon send time
  // has arrived.
  cron.schedule('* * * * *', () => {
    runScheduledSends().catch((err) => {
      console.error('Scheduler error:', err);
    });
  });
}

module.exports = { startScheduler, runScheduledSends, sendEntryNow };
