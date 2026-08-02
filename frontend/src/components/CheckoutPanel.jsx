import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { X, Tag, Check, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createCheckout, validatePromoCode } from "../api";
import { openRazorpayCheckout } from "../lib/razorpay";

// Order confirmation step between "Buy Now" and the Razorpay sheet. It exists
// so a promo code can be entered, and so the customer sees what they are about
// to pay for. The discount previewed here is advisory only — the server
// re-validates the code and recomputes the amount when the order is created.
export function CheckoutPanel({ product, onClose }) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(null);
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const listPrice = Number(product?.price) || 0;
  const total = applied ? applied.final_amount : listPrice;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !paying) onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 260);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(focusTimer);
    };
  }, [onClose, paying]);

  const applyCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) { setError("Enter a promo code."); return; }
    setError("");
    setChecking(true);
    try {
      const { data } = await validatePromoCode({ code: trimmed, product_id: product.id });
      setApplied(data);
      setCode(data.code);
    } catch (err) {
      setApplied(null);
      setError(err?.response?.data?.detail || "That promo code is not valid.");
    } finally {
      setChecking(false);
    }
  };

  const removeCode = () => { setApplied(null); setCode(""); setError(""); };

  const pay = async () => {
    setPaying(true);
    try {
      const { data: order } = await createCheckout({
        product_id: product.id,
        origin_url: window.location.origin,
        promo_code: applied?.code || undefined,
      });
      await openRazorpayCheckout({
        order,
        product,
        onSuccess: () => {
          window.location.href = `/checkout/success?session_id=${order.session_id}&product=${product.slug || product.id}`;
        },
        onDismiss: () => { setPaying(false); toast.error("Checkout was cancelled."); },
      });
    } catch (err) {
      setPaying(false);
      const detail = err?.response?.data?.detail;
      if (detail) {
        // Most likely the code expired or hit its cap between preview and pay.
        setApplied(null);
        setError(detail);
      } else {
        toast.error("Checkout could not start. Please use the contact page for help.");
      }
    }
  };

  // Portalled to <body>: .page-transition-wrap carries a transform, which would
  // otherwise become the containing block for position:fixed and push the
  // overlay off-screen.
  return ReactDOM.createPortal(
    <div className="checkout-overlay" onClick={() => !paying && onClose()} role="dialog" aria-modal="true" aria-label="Confirm your order" data-testid="checkout-overlay">
      <div className="checkout-card" onClick={(e) => e.stopPropagation()} data-testid="checkout-panel">
        <button className="checkout-close" onClick={onClose} disabled={paying} aria-label="Close" data-testid="checkout-close">
          <X size={17} />
        </button>

        <p className="checkout-eyebrow">Confirm your order</p>
        <h3 className="checkout-title" data-testid="checkout-product-title">{product.title}</h3>
        <p className="checkout-category">{product.category}</p>

        <div className="checkout-promo">
          {applied ? (
            <div className="checkout-promo-applied" data-testid="checkout-promo-applied">
              <span className="checkout-promo-tag"><Check size={14} /> {applied.code} · {applied.label}</span>
              <button type="button" onClick={removeCode} className="checkout-promo-remove" data-testid="checkout-promo-remove">Remove</button>
            </div>
          ) : (
            <div className="checkout-promo-row">
              <span className="checkout-promo-icon"><Tag size={15} /></span>
              <input
                ref={inputRef}
                className="checkout-promo-input"
                placeholder="Promo code"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCode(); } }}
                maxLength={32}
                disabled={checking}
                data-testid="checkout-promo-input"
              />
              <button type="button" className="checkout-promo-apply" onClick={applyCode} disabled={checking || !code.trim()} data-testid="checkout-promo-apply">
                {checking ? <Loader2 size={14} className="checkout-spin" /> : "Apply"}
              </button>
            </div>
          )}
          {error && <p className="checkout-error" data-testid="checkout-promo-error">{error}</p>}
        </div>

        <div className="checkout-lines">
          <div className="checkout-line">
            <span>Price</span>
            <span data-testid="checkout-list-price">₹{listPrice.toFixed(2)}</span>
          </div>
          {applied && (
            <div className="checkout-line checkout-line--save" data-testid="checkout-discount-line">
              <span>Discount ({applied.code})</span>
              <span>− ₹{applied.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="checkout-line checkout-line--total">
            <span>Total payable</span>
            <span data-testid="checkout-total">₹{total.toFixed(2)}</span>
          </div>
          <p className="checkout-gst">Price is inclusive of GST. A GST invoice is issued on payment.</p>
        </div>

        <button className="checkout-pay" onClick={pay} disabled={paying} data-testid="checkout-pay-button">
          {paying ? <><Loader2 size={16} className="checkout-spin" /> Opening payment…</> : <>Pay ₹{total.toFixed(2)}</>}
        </button>
        <p className="checkout-secure"><ShieldCheck size={13} /> Secure payment via Razorpay</p>
      </div>
    </div>,
    document.body
  );
}
