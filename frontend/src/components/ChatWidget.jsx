import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Phone } from "lucide-react";
import { useSiteContent } from "../hooks/useSiteContent";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

const QUICK_REPLIES = [
  "Tell me about your services",
  "I need a website or app",
  "Resume design / branding",
  "AI consulting for my business",
  "Browse LearnAI products",
];

function getContextualCTAs(text) {
  const t = text.toLowerCase();
  const ctas = [];
  if (/service|creative|design|resume|branding|logo|presentation|catalog|social media/.test(t))
    ctas.push({ label: "View Services", href: "/services" });
  if (/website|web app|\bapp\b|software|build|develop|automat/.test(t))
    ctas.push({ label: "Request a Build", href: "/contact?" + new URLSearchParams({ type: "Website / App / Software" }).toString() });
  if (/learn|course|guide|prompt|download|ebook|resource|product|learnai/.test(t))
    ctas.push({ label: "Browse Products", href: "/shop" });
  if (/demo|example|prototype|showcase/.test(t))
    ctas.push({ label: "See Demos", href: "/demo" });
  if (/price|cost|quote|budget|how much|package|plan/.test(t))
    ctas.push({ label: "Get a Quote", href: "/contact?" + new URLSearchParams({ type: "Business inquiry" }).toString() });
  if (ctas.length === 0)
    ctas.push({ label: "Contact Us", href: "/contact" });
  else if (!ctas.some((c) => c.href.startsWith("/contact")))
    ctas.push({ label: "Get a Quote", href: "/contact?" + new URLSearchParams({ type: "Business inquiry" }).toString() });
  return ctas.slice(0, 3);
}

function TypingDots() {
  return (
    <div className="chat-typing-dots" aria-label="Assistant is typing">
      <span /><span /><span />
    </div>
  );
}

function ChatBubbleText({ content }) {
  const lines = content.split("\n").filter((l) => l.trim() !== "");
  return (
    <>
      {lines.map((line, i) => {
        // render **bold** spans inline
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="chat-bubble-line">
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**")
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </>
  );
}

export function ChatWidget() {
  const { content } = useSiteContent();
  const contact = content.contact || {};
  const waNumber = String(contact.whatsapp || "919831842869").replace(/\D/g, "");
  const phoneNumber = contact.phone || "+91 98318 42869";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! 👋 I'm the Evolvix assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
      fetch(`${API_BASE}/api/`).catch(() => {});
    }
  }, [open]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || streaming) return;
    setInput("");
    setShowQuick(false);

    const next = [...messages, { role: "user", content: userText }];
    setMessages(next);
    setStreaming(true);

    const placeholder = { role: "assistant", content: "" };
    setMessages([...next, placeholder]);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok) throw new Error("API error");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const { text } = JSON.parse(raw);
            accumulated += text;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: accumulated };
              return updated;
            });
          } catch {}
        }
      }
      const ctas = getContextualCTAs(accumulated);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], ctas };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I couldn't connect right now. Please reach out directly via WhatsApp or call us.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Launcher button — replaces standalone WA float */}
      <button
        className={`chat-launcher${open ? " chat-launcher--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        data-testid="chat-launcher-button"
      >
        <span className="chat-launcher-icon">
          {open ? <X size={18} /> : <MessageCircle size={20} />}
        </span>
        {!open && <span className="chat-launcher-label">Chat with us</span>}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chat-panel" data-testid="chat-panel" role="dialog" aria-label="Evolvix chat assistant">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">EX</div>
              <div>
                <strong>Evolvix Assistant</strong>
                <span className="chat-status">● Online</span>
              </div>
            </div>
            <button className="chat-close-btn" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button>
          </div>

          {/* Messages */}
          <div className="chat-messages" data-testid="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
                {msg.role === "assistant" && <div className="chat-msg-avatar">EX</div>}
                <div>
                  <div className="chat-msg-bubble">
                    {msg.content
                      ? (msg.role === "assistant" ? <ChatBubbleText content={msg.content} /> : msg.content)
                      : (streaming && i === messages.length - 1 ? <TypingDots /> : "")}
                  </div>
                  {msg.ctas?.length > 0 && i > 0 && (
                    <div className="chat-cta-row">
                      {msg.ctas.map((cta) => (
                        <a key={cta.href} href={cta.href} className="chat-cta-chip" onClick={() => setOpen(false)}>
                          {cta.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Quick reply chips — shown only at start */}
            {showQuick && !streaming && (
              <div className="chat-quick-replies">
                {QUICK_REPLIES.map((q) => (
                  <button key={q} className="chat-quick-chip" onClick={() => sendMessage(q)}>{q}</button>
                ))}
              </div>
            )}

            {/* Handoff buttons — shown after a few exchanges */}
            {messages.length >= 4 && !streaming && (
              <div className="chat-handoff">
                <span>Connect directly:</span>
                <a
                  href={`https://wa.me/${waNumber}?text=Hi!%20I%27d%20like%20to%20know%20more%20about%20Evolvix%20Tech%20Media%27s%20services.`}
                  target="_blank" rel="noopener noreferrer"
                  className="chat-handoff-btn chat-handoff-btn--wa"
                  data-testid="chat-whatsapp-btn"
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
                <a href={`tel:${phoneNumber}`} className="chat-handoff-btn chat-handoff-btn--call" data-testid="chat-call-btn">
                  <Phone size={14} /> Call
                </a>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="chat-input-row">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message…"
              className="chat-input"
              disabled={streaming}
              data-testid="chat-input"
              maxLength={500}
            />
            <button
              onClick={() => sendMessage()}
              className="chat-send-btn"
              disabled={!input.trim() || streaming}
              aria-label="Send message"
              data-testid="chat-send-btn"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
