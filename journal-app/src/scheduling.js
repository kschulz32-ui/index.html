const { DateTime } = require('luxon');

// Returns an ISO string (UTC) for the next Monday at 12:00 noon in the given
// timezone. If it is currently Monday before noon, that same day at noon is
// used; otherwise it rolls forward to next week's Monday.
function nextMondayNoon(timezone) {
  const now = DateTime.now().setZone(timezone);
  let target = now.set({
    hour: 12,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  const daysUntilMonday = (8 - now.weekday) % 7; // Luxon: Monday = 1
  if (now.weekday === 1 && now < target) {
    // today is Monday and it's still before noon — keep target as today
  } else if (now.weekday === 1) {
    target = target.plus({ days: 7 });
  } else {
    target = target.plus({ days: daysUntilMonday });
  }

  return target.toUTC().toISO();
}

function formatForDisplay(isoString, timezone) {
  if (!isoString) return null;
  return DateTime.fromISO(isoString, { zone: 'utc' })
    .setZone(timezone)
    .toFormat("cccc, LLLL d 'at' h:mm a ZZZZ");
}

module.exports = { nextMondayNoon, formatForDisplay };
