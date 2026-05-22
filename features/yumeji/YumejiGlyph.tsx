/**
 * Glifo brand Yumeji · map-pin con sparkle a 4 punte (Dec 12 della spec).
 * Versione piena (fill solido) che eredita `currentColor` — così lo stesso
 * glifo serve sia su surface chiara (ink) sia sopra l'header navy (white),
 * cambiando solo il colore di testo del contenitore.
 *
 * Asset statici equivalenti: public/yumeji-pin.svg · public/yumeji-pin-outline.svg
 */
export function YumejiGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 32"
      width={(size * 24) / 32}
      height={size}
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 20 12 20s12-11.5 12-20C24 5.373 18.627 0 12 0Zm0 4.5c.2 0 .38.12.46.31l1.18 2.93a4 4 0 0 0 2.62 2.62l2.93 1.18a.5.5 0 0 1 0 .92l-2.93 1.18a4 4 0 0 0-2.62 2.62l-1.18 2.93a.5.5 0 0 1-.92 0l-1.18-2.93a4 4 0 0 0-2.62-2.62L4.81 12.46a.5.5 0 0 1 0-.92l2.93-1.18a4 4 0 0 0 2.62-2.62l1.18-2.93A.5.5 0 0 1 12 4.5Z"
      />
    </svg>
  );
}
