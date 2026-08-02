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
