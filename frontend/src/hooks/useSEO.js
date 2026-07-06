import { useEffect } from "react";

export function useSEO({ title, description, path = "" }) {
  useEffect(() => {
    const fullTitle = `${title} | Evolvix Tech Media`;
    document.title = fullTitle;
    const setMeta = (selector, attr, value) => {
      if (!value) return;
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", description);
    if (path) setMeta('meta[property="og:url"]', "content", `https://evolvixtech.in${path}`);
  }, [title, description, path]);
}
