import { useEffect, useState } from "react";
import { fetchSiteContent } from "../api";
import { fallbackSiteContent } from "../data/siteContent";

export function useSiteContent() {
  const [content, setContent] = useState(fallbackSiteContent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSiteContent()
      .then(({ data }) => {
        if (active) setContent(data);
      })
      .catch(() => {
        if (active) setContent(fallbackSiteContent);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { content, loading };
}