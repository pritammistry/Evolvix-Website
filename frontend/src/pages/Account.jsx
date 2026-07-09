import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Download, ExternalLink, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "../components/SectionHeader";
import { useSEO } from "../hooks/useSEO";
import { useAuth } from "../hooks/useAuth";
import { useSiteContent } from "../hooks/useSiteContent";
import { fetchVisitorOrders, paymentInvoiceUrl } from "../api";

export default function Account() {
  useSEO({ title: "My Account — Evolvix", description: "View your purchase history, download your digital products, and get help from Evolvix.", path: "/account" });
  const { user, logout } = useAuth();
  const { content } = useSiteContent();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const whatsapp = content.contact?.whatsapp?.replace(/[^0-9]/g, "") || "919831842869";

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/account", { replace: true });
      return;
    }
    fetchVisitorOrders()
      .then(({ data }) => setOrders(data.orders || []))
      .catch(() => toast.error("Could not load your orders. Please try again."))
      .finally(() => setLoadingOrders(false));
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out.");
    navigate("/");
  };

  return (
    <section className="section page-section" data-testid="account-page">
      <SectionHeader eyebrow="My Account" title={`Hi, ${user.name || user.email}.`} text="Your purchases and account options." />

      <h2 style={{ marginBottom: 16 }}>Your Purchases</h2>
      {loadingOrders ? (
        <p style={{ color: "var(--muted)" }}>Loading your orders…</p>
      ) : orders.length === 0 ? (
        <div className="contact-panel" style={{ maxWidth: 560 }}>
          <p>You haven't made any purchases yet.</p>
          <Link to="/shop" className="primary-btn" style={{ marginTop: 14, display: "inline-flex" }}>Browse the Store <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="account-order-list">
          {orders.map((order) => (
            <div className="account-order-row" key={order.id || order.session_id}>
              <div className="account-order-info">
                <strong>{order.metadata?.product_title || "Evolvix Product"}</strong>
                <span className="account-order-meta">
                  {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {" · "}
                  ₹{Number(order.amount || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="account-order-actions">
                <Link to={`/checkout/success?session_id=${order.session_id}`} className="ghost-buy">
                  <Download size={15} /> Downloads
                </Link>
                <a href={paymentInvoiceUrl(order.session_id)} className="text-btn" target="_blank" rel="noopener noreferrer">
                  Invoice <ExternalLink size={13} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="contact-panel account-help-panel">
        <h2 style={{ marginBottom: 10 }}>Need help?</h2>
        <p style={{ color: "var(--muted)", marginBottom: 18, maxWidth: 480 }}>Questions about an order, a download issue, or anything else — reach out directly. We usually respond within a few hours on business days.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href={`https://wa.me/${whatsapp}?text=Hi+Evolvix%2C+I+need+help+with+my+order.`}
            className="primary-btn"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="account-whatsapp-link"
          >
            <MessageCircle size={16} /> WhatsApp Support
          </a>
          <Link to="/contact?type=Support&service=Order+help" className="secondary-btn" data-testid="account-contact-link">
            <Mail size={16} /> Contact Form
          </Link>
        </div>
      </div>

      <button onClick={handleLogout} className="text-btn" style={{ marginTop: 32, color: "var(--muted)" }} data-testid="account-logout-button">
        Log out of this account
      </button>
    </section>
  );
}
