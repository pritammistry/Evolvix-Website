const PENDING_BUY_KEY = "evolvix_pending_buy_product_id";
const PENDING_DEMO_KEY = "evolvix_pending_demo";

export function redirectToLoginForBuy(navigate, productId, returnPath) {
  sessionStorage.setItem(PENDING_BUY_KEY, productId);
  navigate(`/login?next=${encodeURIComponent(returnPath)}`);
}

export function consumePendingBuyProductId() {
  const id = sessionStorage.getItem(PENDING_BUY_KEY);
  if (id) sessionStorage.removeItem(PENDING_BUY_KEY);
  return id;
}

export function redirectToLoginForDemo(navigate, demoId, demoUrl) {
  sessionStorage.setItem(PENDING_DEMO_KEY, JSON.stringify({ id: demoId, url: demoUrl }));
  navigate("/login?next=/demo");
}

export function consumePendingDemo() {
  const raw = sessionStorage.getItem(PENDING_DEMO_KEY);
  if (raw) sessionStorage.removeItem(PENDING_DEMO_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}
