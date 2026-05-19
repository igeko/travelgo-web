/**
 * lib/api/ssrf-guard.ts
 *
 * Protezione SSRF (Server-Side Request Forgery) per qualsiasi route
 * che esegue fetch() su un URL fornito dall'utente.
 *
 * Vettori bloccati:
 *  - Cloud metadata endpoints: 169.254.169.254 (AWS/GCP/Azure IMDSv1/v2)
 *  - Loopback:  127.0.0.0/8,  ::1
 *  - Link-local IPv6: fe80::/10
 *  - RFC 1918 private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
 *  - Loopback hostname: localhost, *.local, *.internal
 *  - Schema non-HTTPS (http://, file://, ftp://, data:, …)
 *  - DNS rebinding: la URL viene risolta e l'IP risultante viene
 *    rivalutato, così un hostname che risolve a 127.0.0.1 viene bloccato
 *    anche se il controllo iniziale sul hostname era passato.
 *
 * Uso:
 *   import { assertSafeUrl } from "@/lib/api/ssrf-guard";
 *
 *   // Lancia SsrfError (extends Error, status 400) se non sicura:
 *   await assertSafeUrl(rawUrl);
 *   const res = await fetch(rawUrl);
 *
 * IMPORTANTE: il DNS rebinding check usa dns.promises.lookup() che
 * richiede il runtime Node.js (non Edge). Assicurarsi che il route
 * handler esporti `export const runtime = "nodejs"`.
 */

import { isIP } from "net";
import { promises as dns } from "dns";

// ─── Errore tipizzato ─────────────────────────────────────────────

export class SsrfError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "SsrfError";
    this.status = status;
  }
}

// ─── Ranges privati (CIDR manuale — no dipendenze esterne) ────────

type IpRange = {
  type: 4 | 6;
  label: string;
  // Per IPv4: [baseNumber, maskBits]
  v4?: [number, number];
  // Per IPv6: [highBigInt, prefixBits]  (solo i 64 bit alti del /10 o /128)
  v6Prefix?: string;
  v6Bits?: number;
};

const BLOCKED_RANGES: IpRange[] = [
  { type: 4, label: "loopback",        v4: [parseIpv4("127.0.0.0"),   8]  },
  { type: 4, label: "link-local IMDS", v4: [parseIpv4("169.254.0.0"), 16] },
  { type: 4, label: "RFC1918 10/8",    v4: [parseIpv4("10.0.0.0"),    8]  },
  { type: 4, label: "RFC1918 172/12",  v4: [parseIpv4("172.16.0.0"),  12] },
  { type: 4, label: "RFC1918 192/16",  v4: [parseIpv4("192.168.0.0"), 16] },
  { type: 4, label: "unspecified",     v4: [0, 32]                        }, // 0.0.0.0
];

// Hostname che sono sempre locali, indipendentemente dal DNS
const BLOCKED_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /\.localhost$/i,
  /^0\.0\.0\.0$/,
];

function parseIpv4(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function isBlockedIpv4(ip: string): boolean {
  const n = parseIpv4(ip) >>> 0;
  for (const range of BLOCKED_RANGES) {
    if (range.type !== 4 || !range.v4) continue;
    const [base, bits] = range.v4;
    const mask = bits === 32 ? 0xffffffff : ~(0xffffffff >>> bits);
    if ((n & mask) >>> 0 === (base & mask) >>> 0) return true;
  }
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  // ::1 loopback
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
  // :: unspecified
  if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
  // fe80::/10 link-local
  if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true;
  // fc00::/7 unique local (ULA) — private equivalente a RFC1918
  if (/^f[cd]/i.test(lower)) return true;
  return false;
}

function isBlockedIp(ip: string): boolean {
  const version = isIP(ip); // returns 4, 6, or 0
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return false; // isIP() restituisce 0 per stringhe non-IP → non blocchiamo qui
}

// ─── Validazione hostname ─────────────────────────────────────────

function isBlockedHostname(hostname: string): boolean {
  return BLOCKED_HOSTNAME_PATTERNS.some((re) => re.test(hostname));
}

// ─── Funzione principale ──────────────────────────────────────────

/**
 * Verifica che `rawUrl` sia sicuro da fetchare dal server.
 *
 * Lancia `SsrfError` se non lo è.
 *
 * @param rawUrl    URL fornito dall'utente (stringa grezza)
 * @param options   Opzioni di configurazione
 */
export async function assertSafeUrl(
  rawUrl: string,
  options: {
    /**
     * Se fornita, solo gli hostname in questa lista sono ammessi
     * (es. ["images.unsplash.com", "upload.wikimedia.org"]).
     * Lasciare undefined per non applicare un allowlist.
     */
    allowedHostnames?: string[];
    /**
     * Numero massimo di redirect da seguire durante il DNS rebinding check.
     * Default: non applicabile (usiamo solo dns.lookup, non fetch chain).
     */
  } = {},
): Promise<void> {
  // 1. Parsing e schema
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfError("URL non valido.");
  }

  if (parsed.protocol !== "https:") {
    throw new SsrfError(
      `Solo URL HTTPS sono accettati (ricevuto: ${parsed.protocol}).`,
    );
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // 2. Hostname bloccati per pattern
  if (isBlockedHostname(hostname)) {
    throw new SsrfError(`Hostname non consentito: ${hostname}`);
  }

  // 3. Se il hostname è già un indirizzo IP, lo validiamo direttamente
  if (isIP(hostname) !== 0) {
    if (isBlockedIp(hostname)) {
      throw new SsrfError(`Indirizzo IP non consentito: ${hostname}`);
    }
  } else {
    // 4. DNS rebinding prevention: risolviamo il hostname e controlliamo l'IP
    //    Questo blocca hostname come evil.attacker.com → 169.254.169.254
    let resolved: string;
    try {
      const result = await dns.lookup(hostname, { verbatim: false });
      resolved = result.address;
    } catch {
      throw new SsrfError(`Impossibile risolvere il hostname: ${hostname}`);
    }

    if (isBlockedIp(resolved)) {
      throw new SsrfError(
        `Il hostname ${hostname} risolve a un indirizzo non consentito (${resolved}).`,
      );
    }
  }

  // 5. Allowlist opzionale
  if (options.allowedHostnames && options.allowedHostnames.length > 0) {
    const allowed = options.allowedHostnames.map((h) => h.toLowerCase());
    if (!allowed.includes(hostname)) {
      throw new SsrfError(
        `Hostname ${hostname} non è nella lista dei domini consentiti.`,
      );
    }
  }
}
