import { useEffect, useState } from "react";
import { fetchSiteContent } from "../api";
import { fallbackSiteContent } from "../data/siteContent";

// Module-level cache — one fetch per browser session.
// All useSiteContent() calls after the first get cached data instantly (loading=false).
let cachedContent = null;
let fetchPromise = null;

const TIMEOUT_MS = 8000;

export function useSiteContent() {
  const [content, setContent] = useState(() => cachedContent || fallbackSiteContent);
  const [loading, setLoading] = useState(() => !cachedContent);

  useEffect(() => {
    if (cachedContent) return;

    if (!fetchPromise) {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
      );
      fetchPromise = Promise.race([fetchSiteContent(), timeout]);
    }

    let active = true;
    fetchPromise
      .then(({ data }) => {
        cachedContent = data;
        if (active) { setContent(data); setLoading(false); }
      })
      .catch(() => {
        // Timeout or network error — fall back to static content so the
        // page never stays blank (critical for mobile on slow connections).
        cachedContent = fallbackSiteContent;
        if (active) { setContent(fallbackSiteContent); setLoading(false); }
      });

    return () => { active = false; };
  }, []);

  return { content, loading };
}
