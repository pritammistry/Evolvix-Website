import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackAnalyticsEvent } from "../api";

const sessionKey = "evolvix_analytics_session";
let memorySessionId = "";

function getSessionId() {
  const existing = sessionStorage.getItem(sessionKey) || memorySessionId;
  if (existing) {
    memorySessionId = existing;
    return existing;
  }
  const next = `evx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  memorySessionId = next;
  sessionStorage.setItem(sessionKey, next);
  return next;
}

function sendEvent(payload) {
  const session_id = getSessionId();
  trackAnalyticsEvent({ session_id, ...payload }).catch(() => {});
}

function inferProductId(path) {
  if (!path.startsWith("/products/")) return null;
  return path.split("/products/")[1]?.split("/")[0] || null;
}

export function AnalyticsTracker() {
  const location = useLocation();
  const observerRef = useRef(null);
  const seenSectionsRef = useRef(new Set());

  useEffect(() => {
    if (location.pathname.startsWith("/admin")) return undefined;
    sendEvent({ event_type: "page_view", path: location.pathname, product_id: inferProductId(location.pathname), metadata: { search: location.search } });
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", { page_path: location.pathname + location.search, page_title: document.title });
    }
    seenSectionsRef.current = new Set();
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const testId = entry.target.getAttribute("data-testid");
        if (!entry.isIntersecting || !testId || seenSectionsRef.current.has(testId)) return;
        seenSectionsRef.current.add(testId);
        sendEvent({ event_type: "section_view", path: location.pathname, section_id: testId, product_id: inferProductId(location.pathname) });
      });
    }, { threshold: 0.42 });
    document.querySelectorAll("main section[data-testid], main article[data-testid]").forEach((element) => observerRef.current.observe(element));
    return () => observerRef.current?.disconnect();
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleClick = (event) => {
      if (location.pathname.startsWith("/admin")) return;
      const target = event.target.closest("a,button");
      if (!target) return;
      sendEvent({
        event_type: "click",
        path: location.pathname,
        label: target.getAttribute("data-testid") || target.textContent?.trim()?.slice(0, 120) || "click",
        product_id: inferProductId(location.pathname),
      });
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [location.pathname]);

  return null;
}

export function trackFormSubmit(label, path = window.location.pathname, metadata = {}) {
  sendEvent({ event_type: "form_submit", path, label, metadata });
}

export function trackNewsletterSubmit(path = window.location.pathname) {
  sendEvent({ event_type: "newsletter_submit", path, label: "newsletter-form" });
}