import { useEffect, useState } from "react";
import { fetchSiteContent } from "../api";
import { fallbackSiteContent } from "../data/siteContent";

// Module-level cache — one fetch per page load.
// All useSiteContent() calls after the first get cached data instantly (loading=false).
let cachedContent = null;
let fetchPromise = null;

const TIMEOUT_MS = 8000;
const STORAGE_KEY = "evolvix_site_content_v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// The last good response is kept in localStorage and used to paint immediately
// on a return visit, while a fresh copy is fetched in the background. Without
// it, a visitor arriving while the backend is cold-starting waits on the
// network before seeing real content.
function readStoredContent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { savedAt, content } = JSON.parse(raw);
    if (!content || !savedAt || Date.now() - savedAt > MAX_AGE_MS) return null;
    return content;
  } catch {
    return null;
  }
}

function storeContent(content) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), content }));
  } catch {
    // Quota exceeded or storage disabled — caching is an optimisation, not a
    // requirement, so failing here must never break the page.
  }
}

export function useSiteContent() {
  const [content, setContent] = useState(() => cachedContent || readStoredContent() || fallbackSiteContent);
  // Only "loading" when there is nothing real to show yet. With stored content
  // present the page renders actual content immediately and revalidates behind it.
  const [loading, setLoading] = useState(() => !cachedContent && !readStoredContent());

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
        storeContent(data);
        if (active) { setContent(data); setLoading(false); }
      })
      .catch(() => {
        // Timeout or network error — keep whatever is already on screen (stored
        // content if we have it) rather than replacing it with static defaults.
        const stored = readStoredContent();
        cachedContent = stored || fallbackSiteContent;
        if (active) { setContent(cachedContent); setLoading(false); }
      });

    return () => { active = false; };
  }, []);

  return { content, loading };
}
