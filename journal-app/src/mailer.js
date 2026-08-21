// Placeholder email sender. Logs exactly what would be sent instead of
// contacting a real email provider. Swap this out for a real service once
// the flow is proven end to end — nothing else in the app should need to
// change, since callers only depend on buildEmailContent() + sendEmail().

function buildEmailContent({ entry, takeaways, member, journalUrl }) {
  const firstName = (member.name || '').trim().split(/\s+/)[0] || member.name;
  const sermonDate = entry.sermon_date;
  const subject = `This week's entry: ${entry.sermon_title}`;

  const takeawayLines = takeaways
    .map((t, i) => `  ${i + 1}. ${t.text}`)
    .join('\n');

  const body = `Hi ${firstName},

Sunday's message — "${entry.sermon_title}" (${sermonDate}) — left us with a few things worth carrying into the week. Here's what stood out:

${takeawayLines}

This week's entry:
${entry.prompt_text}

Your journal is waiting for you, whenever you're ready to write:
${journalUrl}

No pressure to fill every section — just write where this one actually landed.
`;

  return { subject, body };
}

async function sendEmail({ to, subject, body }) {
  // Mock send: log what would go out. Always "succeeds".
  console.log('----- MOCK EMAIL SEND -----');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(body);
  console.log('----- END MOCK EMAIL -----');
  return Promise.resolve({ ok: true });
}

module.exports = { buildEmailContent, sendEmail };
