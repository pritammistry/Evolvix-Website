import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { fetchPaymentDownloads, fetchPaymentStatus } from "../api";

export default function CheckoutResult() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState({ loading: true, message: "Checking payment status...", paid: false });
  const [downloads, setDownloads] = useState([]);
  const loadDownloads = useCallback((id) => {
    fetchPaymentDownloads(id).then(({ data }) => setDownloads(data.downloads || [])).catch(() => setDownloads([]));
  }, []);
  useEffect(() => {
    let isActive = true;
    let timer;

    const poll = async (attempt = 0) => {
      if (!sessionId || attempt >= 5) {
        if (isActive) setStatus({ loading: false, message: "Payment status check timed out. Please contact support if needed.", paid: false });
        return;
      }
      try {
        const { data: paymentData } = await fetchPaymentStatus(sessionId);
        if (!isActive) return;
        if (paymentData.payment_status === "paid") {
          setStatus({ loading: false, message: paymentData.delivery, paid: true });
          loadDownloads(sessionId);
          return;
        }
        timer = setTimeout(() => poll(attempt + 1), 2000);
      } catch (checkoutError) {
        if (isActive) setStatus({ loading: false, message: "Unable to confirm payment right now.", paid: false });
      }
    };

    poll();
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [loadDownloads, sessionId]);
  return <section className="section page-section checkout-page" data-testid="checkout-result-page"><article className="checkout-status" data-testid="checkout-status-card">{status.loading ? <Loader2 className="spin" size={34} data-testid="checkout-loading-icon" /> : <CheckCircle2 size={34} data-testid="checkout-complete-icon" />}<h1 data-testid="checkout-result-title">{status.paid ? "Payment confirmed" : "Checkout status"}</h1><p data-testid="checkout-result-message">{status.message}</p>{status.paid && <div className="download-panel" data-testid="checkout-download-panel"><h2 data-testid="checkout-download-title">Your downloads</h2>{downloads.length ? downloads.map((file) => <a key={file.id} className="download-link" href={file.url} data-testid={`checkout-download-link-${file.id}`}><Download size={17} /> <span>{file.filename}</span><small>{Math.max(1, Math.round((file.size || 0) / 1024))} KB</small></a>) : <p data-testid="checkout-no-downloads-message">No files are attached yet. Evolvix can add product files from the admin dashboard.</p>}</div>}<Link to="/shop" className="primary-btn" data-testid="checkout-return-shop-link">Return to Shop</Link></article></section>;
}