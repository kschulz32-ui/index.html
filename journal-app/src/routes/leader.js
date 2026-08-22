const express = require('express');
const crypto = require('crypto');
const { db, getDefaultGroup } = require('../db');
const { buildEmailContent } = require('../mailer');
const { nextMondayNoon, formatForDisplay } = require('../scheduling');
const { sendEntryNow } = require('../scheduler');

const router = express.Router();

router.use((req, res, next) => {
  res.locals.group = getDefaultGroup();
  next();
});

function getTakeaways(entryId) {
  return db
    .prepare('SELECT * FROM weekly_takeaways WHERE weekly_entry_id = ? ORDER BY position ASC')
    .all(entryId);
}

function completionStats(entry) {
  const activeCount = db
    .prepare('SELECT COUNT(*) AS n FROM members WHERE group_id = ? AND active = 1')
    .get(entry.group_id).n;
  const respondedCount = db
    .prepare(
      `SELECT COUNT(DISTINCT jr.member_id) AS n
       FROM journal_responses jr
       JOIN members m ON m.id = jr.member_id
       WHERE jr.weekly_entry_id = ? AND m.active = 1`
    )
    .get(entry.id).n;
  const pct = activeCount === 0 ? 0 : Math.round((respondedCount / activeCount) * 100);
  return { activeCount, respondedCount, pct };
}

// ---- Dashboard / look-back list ----
router.get('/', (req, res) => {
  const group = res.locals.group;
  const entries = db
    .prepare('SELECT * FROM weekly_entries WHERE group_id = ? ORDER BY sermon_date DESC, id DESC')
    .all(group.id)
    .map((e) => ({
      ...e,
      stats: e.status === 'sent' ? completionStats(e) : null,
      scheduledDisplay: formatForDisplay(e.scheduled_for, group.timezone),
    }));

  res.render('leader/dashboard', { entries, group });
});

// ---- New entry ----
router.get('/entries/new', (req, res) => {
  res.render('leader/entry_form', { entry: null, takeaways: ['', '', '', '', ''], errors: [] });
});

router.post('/entries/new', (req, res) => {
  const group = res.locals.group;
  const { sermon_date, sermon_title, prompt_text } = req.body;
  const takeaways = [1, 2, 3, 4, 5].map((i) => (req.body[`takeaway_${i}`] || '').trim());

  const errors = [];
  if (!sermon_date) errors.push('Sermon date is required.');
  if (!sermon_title || !sermon_title.trim()) errors.push('Sermon title / theme is required.');

  if (errors.length) {
    return res.render('leader/entry_form', {
      entry: { sermon_date, sermon_title, prompt_text },
      takeaways,
      errors,
    });
  }

  const info = db
    .prepare(
      `INSERT INTO weekly_entries (group_id, sermon_date, sermon_title, prompt_text, status)
       VALUES (?, ?, ?, ?, 'draft')`
    )
    .run(group.id, sermon_date, sermon_title.trim(), (prompt_text || '').trim());

  const entryId = info.lastInsertRowid;
  const insertTakeaway = db.prepare(
    'INSERT INTO weekly_takeaways (weekly_entry_id, position, text) VALUES (?, ?, ?)'
  );
  takeaways.forEach((t, i) => insertTakeaway.run(entryId, i + 1, t));

  res.redirect(`/leader/entries/${entryId}`);
});

// ---- View / edit an entry ----
router.get('/entries/:id', (req, res) => {
  const group = res.locals.group;
  const entry = db
    .prepare('SELECT * FROM weekly_entries WHERE id = ? AND group_id = ?')
    .get(req.params.id, group.id);
  if (!entry) return res.status(404).send('Entry not found.');

  const takeaways = getTakeaways(entry.id);

  let responses = [];
  let stats = null;
  if (entry.status === 'sent') {
    stats = completionStats(entry);
    responses = db
      .prepare(
        `SELECT m.name AS member_name, jr.personal_text, jr.work_text, jr.family_text, jr.updated_at
         FROM journal_responses jr
         JOIN members m ON m.id = jr.member_id
         WHERE jr.weekly_entry_id = ?
         ORDER BY m.name ASC`
      )
      .all(entry.id);
  }

  res.render('leader/entry_detail', {
    entry,
    takeaways,
    responses,
    stats,
    scheduledDisplay: formatForDisplay(entry.scheduled_for, group.timezone),
  });
});

router.get('/entries/:id/edit', (req, res) => {
  const group = res.locals.group;
  const entry = db
    .prepare('SELECT * FROM weekly_entries WHERE id = ? AND group_id = ?')
    .get(req.params.id, group.id);
  if (!entry) return res.status(404).send('Entry not found.');
  if (entry.status !== 'draft') return res.redirect(`/leader/entries/${entry.id}`);

  const takeaways = getTakeaways(entry.id).map((t) => t.text);
  res.render('leader/entry_form', { entry, takeaways, errors: [] });
});

router.post('/entries/:id', (req, res) => {
  const group = res.locals.group;
  const entry = db
    .prepare('SELECT * FROM weekly_entries WHERE id = ? AND group_id = ?')
    .get(req.params.id, group.id);
  if (!entry) return res.status(404).send('Entry not found.');
  if (entry.status !== 'draft') {
    return res.status(400).send('This entry has already been confirmed and can no longer be edited.');
  }

  const { sermon_date, sermon_title, prompt_text } = req.body;
  const takeaways = [1, 2, 3, 4, 5].map((i) => (req.body[`takeaway_${i}`] || '').trim());

  const errors = [];
  if (!sermon_date) errors.push('Sermon date is required.');
  if (!sermon_title || !sermon_title.trim()) errors.push('Sermon title / theme is required.');

  if (errors.length) {
    return res.render('leader/entry_form', {
      entry: { id: entry.id, sermon_date, sermon_title, prompt_text },
      takeaways,
      errors,
    });
  }

  db.prepare(
    `UPDATE weekly_entries SET sermon_date = ?, sermon_title = ?, prompt_text = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(sermon_date, sermon_title.trim(), (prompt_text || '').trim(), entry.id);

  const updateTakeaway = db.prepare(
    'UPDATE weekly_takeaways SET text = ? WHERE weekly_entry_id = ? AND position = ?'
  );
  takeaways.forEach((t, i) => updateTakeaway.run(t, entry.id, i + 1));

  res.redirect(`/leader/entries/${entry.id}`);
});

// ---- Confirmation screen ----
router.get('/entries/:id/confirm', (req, res) => {
  const group = res.locals.group;
  const entry = db
    .prepare('SELECT * FROM weekly_entries WHERE id = ? AND group_id = ?')
    .get(req.params.id, group.id);
  if (!entry) return res.status(404).send('Entry not found.');
  if (entry.status !== 'draft') {
    return res.redirect(`/leader/entries/${entry.id}`);
  }

  const takeaways = getTakeaways(entry.id);
  const errors = [];
  if (!entry.sermon_date) errors.push('Sermon date is required before this entry can send.');
  if (!entry.sermon_title) errors.push('Sermon title / theme is required before this entry can send.');
  if (takeaways.every((t) => !t.text)) errors.push('Add at least one takeaway before sending.');
  if (!entry.prompt_text) errors.push('This week’s prompt is required before sending.');

  const members = db
    .prepare('SELECT * FROM members WHERE group_id = ? AND active = 1 ORDER BY name ASC')
    .all(group.id);

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const sampleMember = members[0] || { name: 'Member Name', token: 'sample-token' };
  const sampleEmail = buildEmailContent({
    entry,
    takeaways,
    member: sampleMember,
    journalUrl: `${baseUrl}/journal/${sampleMember.token}`,
  });

  res.render('leader/confirm', {
    entry,
    takeaways,
    members,
    errors,
    sampleEmail,
    sampleMemberIsPlaceholder: members.length === 0,
  });
});

router.post('/entries/:id/approve', (req, res) => {
  const group = res.locals.group;
  const entry = db
    .prepare('SELECT * FROM weekly_entries WHERE id = ? AND group_id = ?')
    .get(req.params.id, group.id);
  if (!entry) return res.status(404).send('Entry not found.');
  if (entry.status !== 'draft') return res.redirect(`/leader/entries/${entry.id}`);

  const takeaways = getTakeaways(entry.id);
  const hasRequiredFields =
    entry.sermon_date && entry.sermon_title && entry.prompt_text && takeaways.some((t) => t.text);
  if (!hasRequiredFields) {
    return res.status(400).send('This entry is missing required fields and cannot be sent.');
  }

  const scheduledFor = nextMondayNoon(group.timezone);
  db.prepare(
    `UPDATE weekly_entries SET status = 'approved', scheduled_for = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(scheduledFor, entry.id);

  res.redirect(`/leader/entries/${entry.id}`);
});

// Steps an approval back so the entry can be edited again, as long as it
// hasn't actually gone out yet.
router.post('/entries/:id/unapprove', (req, res) => {
  const group = res.locals.group;
  const entry = db
    .prepare('SELECT * FROM weekly_entries WHERE id = ? AND group_id = ?')
    .get(req.params.id, group.id);
  if (!entry) return res.status(404).send('Entry not found.');
  if (entry.status === 'approved') {
    db.prepare(
      `UPDATE weekly_entries SET status = 'draft', scheduled_for = NULL, updated_at = datetime('now') WHERE id = ?`
    ).run(entry.id);
  }
  res.redirect(`/leader/entries/${entry.id}`);
});

// Dev-only: fire the scheduled send immediately instead of waiting for
// Monday noon. Not linked from any nav — useful for verifying the mock
// email output while testing the pilot.
router.post('/entries/:id/send-now-dev', async (req, res) => {
  const group = res.locals.group;
  const entry = db
    .prepare('SELECT * FROM weekly_entries WHERE id = ? AND group_id = ?')
    .get(req.params.id, group.id);
  if (!entry) return res.status(404).send('Entry not found.');
  if (entry.status !== 'approved') {
    return res.status(400).send('Only an approved entry can be sent.');
  }
  await sendEntryNow(entry.id);
  res.redirect(`/leader/entries/${entry.id}`);
});

// ---- Members management ----
router.get('/members', (req, res) => {
  const group = res.locals.group;
  const members = db
    .prepare('SELECT * FROM members WHERE group_id = ? ORDER BY active DESC, name ASC')
    .all(group.id);
  res.render('leader/members', { members, errors: [] });
});

router.post('/members', (req, res) => {
  const group = res.locals.group;
  const { name, email } = req.body;
  if (!name || !name.trim() || !email || !email.trim()) {
    const members = db
      .prepare('SELECT * FROM members WHERE group_id = ? ORDER BY active DESC, name ASC')
      .all(group.id);
    return res.render('leader/members', { members, errors: ['Name and email are both required.'] });
  }
  const token = crypto.randomBytes(16).toString('hex');
  db.prepare(
    'INSERT INTO members (group_id, name, email, active, token) VALUES (?, ?, ?, 1, ?)'
  ).run(group.id, name.trim(), email.trim(), token);
  res.redirect('/leader/members');
});

router.post('/members/:id/toggle-active', (req, res) => {
  const group = res.locals.group;
  const member = db
    .prepare('SELECT * FROM members WHERE id = ? AND group_id = ?')
    .get(req.params.id, group.id);
  if (member) {
    db.prepare('UPDATE members SET active = ? WHERE id = ?').run(member.active ? 0 : 1, member.id);
  }
  res.redirect('/leader/members');
});

module.exports = router;
