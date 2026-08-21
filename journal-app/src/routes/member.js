const express = require('express');
const { db } = require('../db');

const router = express.Router();

function findMemberByToken(token) {
  return db.prepare('SELECT * FROM members WHERE token = ?').get(token);
}

function getTakeaways(entryId) {
  return db
    .prepare('SELECT * FROM weekly_takeaways WHERE weekly_entry_id = ? ORDER BY position ASC')
    .all(entryId);
}

function getResponse(entryId, memberId) {
  return db
    .prepare('SELECT * FROM journal_responses WHERE weekly_entry_id = ? AND member_id = ?')
    .get(entryId, memberId);
}

// ---- This week ----
router.get('/:token', (req, res) => {
  const member = findMemberByToken(req.params.token);
  if (!member) return res.status(404).render('member/not_found');

  const latestEntry = db
    .prepare(
      `SELECT * FROM weekly_entries WHERE group_id = ? AND status = 'sent'
       ORDER BY sermon_date DESC, id DESC LIMIT 1`
    )
    .get(member.group_id);

  if (!latestEntry) {
    return res.render('member/waiting', { member });
  }

  const takeaways = getTakeaways(latestEntry.id);
  const response = getResponse(latestEntry.id, member.id);

  const hasAnyEntryEver = db
    .prepare(
      `SELECT COUNT(*) AS n FROM journal_responses WHERE member_id = ?`
    )
    .get(member.id).n;

  res.render('member/this_week', {
    member,
    entry: latestEntry,
    takeaways,
    response,
    isFirstEverVisit: hasAnyEntryEver === 0 && !response,
    saved: req.query.saved === '1',
  });
});

router.post('/:token/entries/:entryId', (req, res) => {
  const member = findMemberByToken(req.params.token);
  if (!member) return res.status(404).render('member/not_found');

  const entry = db
    .prepare(`SELECT * FROM weekly_entries WHERE id = ? AND group_id = ? AND status = 'sent'`)
    .get(req.params.entryId, member.group_id);
  if (!entry) return res.status(404).send('Entry not found.');

  const { personal_text, work_text, family_text } = req.body;
  const existing = getResponse(entry.id, member.id);

  if (existing) {
    db.prepare(
      `UPDATE journal_responses SET personal_text = ?, work_text = ?, family_text = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(personal_text || '', work_text || '', family_text || '', existing.id);
  } else {
    db.prepare(
      `INSERT INTO journal_responses (weekly_entry_id, member_id, personal_text, work_text, family_text)
       VALUES (?, ?, ?, ?, ?)`
    ).run(entry.id, member.id, personal_text || '', work_text || '', family_text || '');
  }

  const returnTo = req.body.return_to === 'history' ? 'history' : 'this_week';
  if (returnTo === 'history') {
    return res.redirect(`/journal/${member.token}/history?saved=1`);
  }
  res.redirect(`/journal/${member.token}?saved=1`);
});

// ---- History / look-back ----
router.get('/:token/history', (req, res) => {
  const member = findMemberByToken(req.params.token);
  if (!member) return res.status(404).render('member/not_found');

  const sentEntries = db
    .prepare(
      `SELECT * FROM weekly_entries WHERE group_id = ? AND status = 'sent'
       ORDER BY sermon_date DESC, id DESC`
    )
    .all(member.group_id);

  const pages = sentEntries.map((entry) => ({
    entry,
    takeaways: getTakeaways(entry.id),
    response: getResponse(entry.id, member.id),
  }));

  const hasWrittenAnything = pages.some((p) => p.response);

  res.render('member/history', {
    member,
    pages,
    hasWrittenAnything,
    saved: req.query.saved === '1',
  });
});

module.exports = router;
