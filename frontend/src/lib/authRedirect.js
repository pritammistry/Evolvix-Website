const PENDING_BUY_KEY = "evolvix_pending_buy_product_id";

export function redirectToLoginForBuy(navigate, productId, returnPath) {
  sessionStorage.setItem(PENDING_BUY_KEY, productId);
  navigate(`/login?next=${encodeURIComponent(returnPath)}`);
}

export function consumePendingBuyProductId() {
  const id = sessionStorage.getItem(PENDING_BUY_KEY);
  if (id) sessionStorage.removeItem(PENDING_BUY_KEY);
  return id;
}
