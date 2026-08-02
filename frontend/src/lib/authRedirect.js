const PENDING_BUY_KEY = "evolvix_pending_buy_product_id";
const PENDING_PROMO_KEY = "evolvix_pending_promo_code";
const PENDING_DEMO_KEY = "evolvix_pending_demo";

export function redirectToLoginForBuy(navigate, productId, returnPath, promoCode) {
  sessionStorage.setItem(PENDING_BUY_KEY, productId);
  // Carried across login so a code applied before signing in is still applied
  // when the customer lands back on the product.
  if (promoCode) sessionStorage.setItem(PENDING_PROMO_KEY, promoCode);
  else sessionStorage.removeItem(PENDING_PROMO_KEY);
  navigate(`/login?next=${encodeURIComponent(returnPath)}`);
}

export function consumePendingBuyProductId() {
  const id = sessionStorage.getItem(PENDING_BUY_KEY);
  if (id) sessionStorage.removeItem(PENDING_BUY_KEY);
  return id;
}

export function consumePendingPromoCode() {
  const code = sessionStorage.getItem(PENDING_PROMO_KEY);
  if (code) sessionStorage.removeItem(PENDING_PROMO_KEY);
  return code;
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
