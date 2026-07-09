import { useEffect, useState } from "react";
import { fetchSiteContent } from "../api";
import { fallbackSiteContent } from "../data/siteContent";

// Module-level cache — survives page navigation within the same session.
// Once the API responds, every subsequent useSiteContent() call gets the
// cached value immediately with loading=false (no sphere, no skeleton).
let cachedContent = null;
let fetchPromise = null;

export function useSiteContent() {
  const [content, setContent] = useState(() => cachedContent || fallbackSiteContent);
  const [loading, setLoading] = useState(() => !cachedContent);

  useEffect(() => {
    // Cache already populated — nothing to fetch.
    if (cachedContent) return;

    // Kick off one shared fetch regardless of how many components mount.
    if (!fetchPromise) {
      fetchPromise = fetchSiteContent();
    }

    let active = true;
    fetchPromise
      .then(({ data }) => {
        cachedContent = data;
        if (active) { setContent(data); setLoading(false); }
      })
      .catch(() => {
        cachedContent = fallbackSiteContent;
        if (active) { setContent(fallbackSiteContent); setLoading(false); }
      });

    return () => { active = false; };
  }, []);

  return { content, loading };
}
