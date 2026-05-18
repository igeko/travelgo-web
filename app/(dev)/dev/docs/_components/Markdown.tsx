"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    marked?: {
      parse: (md: string, opts?: { gfm?: boolean; breaks?: boolean }) => string;
    };
  }
}

const MARKED_CDN = "https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js";

/**
 * Renderer markdown client-side · carica `marked` da CDN, parsa con GFM
 * (tables, task lists, strikethrough). HTML inserito via innerHTML —
 * sicuro perché i doc sono nostri, dentro `docs/design/`.
 */
export function Markdown({ content }: { content: string }) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    function render() {
      if (window.marked) {
        setHtml(window.marked.parse(content, { gfm: true, breaks: false }));
        setLoading(false);
      }
    }

    if (window.marked) {
      render();
      return;
    }

    // Evita doppi script se già in caricamento
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${MARKED_CDN}"]`
    );
    if (existing) {
      existing.addEventListener("load", render);
      return () => existing.removeEventListener("load", render);
    }

    const script = document.createElement("script");
    script.src = MARKED_CDN;
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [content]);

  if (loading) {
    return (
      <div className="text-ink-faint text-sm italic py-8">
        Caricamento del renderer markdown…
      </div>
    );
  }

  return (
    <article
      className="md-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
