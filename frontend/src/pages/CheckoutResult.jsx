import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { fetchPaymentStatus } from "../api";

export default function CheckoutResult() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState({ loading: true, message: "Checking payment status...", paid: false });
  useEffect(() => {
    let attempts = 0;
    let timer;
    const poll = async () => {
      if (!sessionId || attempts >= 5) { setStatus({ loading: false, message: "Payment status check timed out. Please contact support if needed.", paid: false }); return; }
      attempts += 1;
      try {
        const { data } = await fetchPaymentStatus(sessionId);
        if (data.payment_status === "paid") { setStatus({ loading: false, message: data.delivery, paid: true }); return; }
        timer = setTimeout(poll, 2000);
      } catch (error) { setStatus({ loading: false, message: "Unable to confirm payment right now.", paid: false }); }
    };
    poll();
    return () => clearTimeout(timer);
  }, [sessionId]);
  return <section className="section page-section checkout-page" data-testid="checkout-result-page"><article className="checkout-status" data-testid="checkout-status-card">{status.loading ? <Loader2 className="spin" size={34} data-testid="checkout-loading-icon" /> : <CheckCircle2 size={34} data-testid="checkout-complete-icon" />}<h1 data-testid="checkout-result-title">{status.paid ? "Payment confirmed" : "Checkout status"}</h1><p data-testid="checkout-result-message">{status.message}</p><Link to="/shop" className="primary-btn" data-testid="checkout-return-shop-link">Return to Shop</Link></article></section>;
}