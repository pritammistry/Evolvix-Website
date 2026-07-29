const LEAD_CAPTURED_KEY = "evolvix_lead_captured_v1";

// Shared between the welcome popup and the chat widget's lead form so a
// visitor is only ever asked for their contact details once.
export function markLeadCaptured() {
  try { localStorage.setItem(LEAD_CAPTURED_KEY, String(Date.now())); } catch {}
}

export function hasLeadBeenCaptured() {
  try { return !!localStorage.getItem(LEAD_CAPTURED_KEY); } catch { return false; }
}
