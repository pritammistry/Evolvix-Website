// Shared by the welcome popup and the store, so the offer shown while browsing
// and the offer shown on first visit can never drift apart.

// Returns the campaign only while it is genuinely running. A missing or
// unparseable end date counts as expired, so a typo fails safe to no campaign
// rather than leaving a stale offer on the site forever.
export function activeCampaign(cfg) {
  const campaign = cfg?.campaign;
  if (!campaign || campaign.enabled === false) return null;
  const endsAt = Date.parse(campaign.ends_at);
  if (Number.isNaN(endsAt) || Date.now() >= endsAt) return null;
  return campaign;
}

export function daysRemaining(endsAt) {
  const ms = Date.parse(endsAt) - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

// Urgency for a deadline, or null when there is none worth showing.
//
// Returns null while the deadline is comfortably far off, so the banner stays
// quiet until pressure is real — a countdown that runs for a fortnight stops
// being a countdown. `urgent` is what earns the highlight.
export function timeLeft(endsAt) {
  const ms = Date.parse(endsAt) - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  const hours = ms / 3600000;
  if (hours < 1) return { label: "Minutes left", urgent: true };
  if (hours < 24) {
    const h = Math.floor(hours);
    return { label: `${h} ${h === 1 ? "hour" : "hours"} left`, urgent: true };
  }
  const days = Math.ceil(hours / 24);
  if (days <= 3) return { label: `${days} days left`, urgent: true };
  return { label: null, urgent: false };
}

// "4 September" — the deadline as a date, for when it is still far away.
export function deadlineDate(endsAt) {
  const d = new Date(endsAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
}
