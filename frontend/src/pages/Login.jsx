import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { SectionHeader } from "../components/SectionHeader";
import { useAuth } from "../hooks/useAuth";
import { fetchIndianStates } from "../api";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", state: "" });
  const [states, setStates] = useState([]);
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, signup, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";

  useEffect(() => {
    fetchIndianStates().then(({ data }) => setStates(data.states || [])).catch(() => setStates([]));
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = mode === "signup" ? await signup(form.email, form.password, form.name, form.state) : await login(form.email, form.password);
      if (result.status === "verification_required") {
        setPendingEmail(result.email);
        setMode("verify");
        toast.success("We've sent a verification code to your email.");
      } else {
        toast.success(mode === "signup" ? "Account created. Welcome to Evolvix." : "Welcome back.");
        navigate(next, { replace: true });
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitOtp = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await verifyOtp(pendingEmail, otp);
      toast.success("Email verified. Welcome to Evolvix.");
      navigate(next, { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Invalid code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendOtp(pendingEmail);
      toast.success("A new code has been sent.");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not resend code. Please try again shortly.");
    }
  };

  if (mode === "verify") {
    return (
      <section className="section page-section" data-testid="login-page">
        <SectionHeader eyebrow="Account" title="Verify your email." text={`Enter the 6-digit code we sent to ${pendingEmail}.`} />
        <div className="contact-grid">
          <form onSubmit={submitOtp} className="contact-form" data-testid="login-otp-form">
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              data-testid="login-otp-input"
            />
            <button type="submit" className="primary-btn" disabled={submitting || otp.length !== 6} data-testid="login-otp-submit-button">
              {submitting ? "Verifying..." : "Verify Code"}
            </button>
          </form>
          <aside className="contact-panel" data-testid="login-otp-panel">
            <p data-testid="login-otp-resend-text">
              Didn't get it? <button type="button" className="text-btn" onClick={handleResend} data-testid="login-otp-resend-button">Resend code</button>
            </p>
            <p data-testid="login-otp-back-text">
              <button type="button" className="text-btn" onClick={() => setMode("login")} data-testid="login-otp-back-button">Back to log in</button>
            </p>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="section page-section" data-testid="login-page">
      <SectionHeader eyebrow="Account" title={mode === "signup" ? "Create your Evolvix account." : "Log in to continue."} text="One account for the Store, product demos, and Evolvix Lab downloads." />
      <div className="contact-grid">
        <form onSubmit={submit} className="contact-form" data-testid="login-form">
          {mode === "signup" && <input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Your name" data-testid="login-name-input" />}
          {mode === "signup" && (
            <select required value={form.state} onChange={(e) => setField("state", e.target.value)} data-testid="login-state-select">
              <option value="" disabled>Select your state (for GST on invoices)</option>
              {states.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          )}
          <input type="email" required value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="Email address" data-testid="login-email-input" />
          <input type="password" required minLength={mode === "signup" ? 8 : undefined} value={form.password} onChange={(e) => setField("password", e.target.value)} placeholder={mode === "signup" ? "Password (min. 8 characters)" : "Password"} data-testid="login-password-input" />
          <button type="submit" className="primary-btn" disabled={submitting} data-testid="login-submit-button">{submitting ? "Please wait..." : mode === "signup" ? "Create Account" : "Log In"}</button>
        </form>
        <aside className="contact-panel" data-testid="login-switch-panel">
          {mode === "login" ? (
            <p data-testid="login-switch-to-signup-text">New to Evolvix? <button type="button" className="text-btn" onClick={() => setMode("signup")} data-testid="login-switch-to-signup-button">Create an account</button></p>
          ) : (
            <p data-testid="login-switch-to-login-text">Already have an account? <button type="button" className="text-btn" onClick={() => setMode("login")} data-testid="login-switch-to-login-button">Log in</button></p>
          )}
        </aside>
      </div>
    </section>
  );
}
