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
// SRI hash for marked@12.0.0/marked.min.js (sha384). If marked is bumped this
// must be regenerated:  curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A
const MARKED_SRI = "sha384-LX52WlGjxnvIVqEUEvbf3LR0qaHTKK+sWBQuRZBPnsW1RM0WtIuU6sV2dQTaPLCa";

const IS_DEV =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEV_SANDBOX === "1";

/**
 * Renderer markdown client-side · carica `marked` da CDN con SRI.
 * Disponibile solo in dev/sandbox: in produzione si rifiuta di renderizzare
 * per ridurre la attack surface del CDN.
 */
export function Markdown({ content }: { content: string }) {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!IS_DEV) return;
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
    script.crossOrigin = "anonymous";
    script.integrity = MARKED_SRI;
    script.onload = render;
    document.head.appendChild(script);
  }, [content]);

  if (!IS_DEV) {
    return (
      <div className="text-ink-faint text-sm italic py-8">
        Markdown renderer disabled in production.
      </div>
    );
  }

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
