"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { SoftField } from "./SoftField";

/* ─────────────────────────────────────────────────────────────────
   EditableText · inline-edit primitive on top of SoftField.

   Mantiene una draft locale finché l'utente sta digitando; al commit
   (Enter su single-line, blur sempre) chiama `onCommit(next)` con il
   valore canonicalizzato (trim). Su Esc resetta la draft al valore
   esterno. Quando il valore esterno cambia mentre la field NON è in
   focus, la draft si risincronizza (è il caso post-PATCH).

   - Single-line di default; passare `multiline` per textarea.
   - Inline variant (no chrome). Per il chrome pill, usare SoftField
     direttamente.
   - Non emette commit se il valore non è cambiato (evita PATCH no-op
     ad ogni blur).
───────────────────────────────────────────────────────────────── */

type CommonProps = {
  value: string;
  onCommit: (next: string) => void | Promise<void>;
  placeholder?: string;
  /** Eyebrow label (inline variant). */
  label?: string;
  /** Leading icon for the inline variant. */
  icon?: ReactNode;
  /** Visual size of the inline row. */
  size?: "sm" | "md";
  disabled?: boolean;
  maxLength?: number;
  className?: string;
  /** Override del testo input — utile per font/peso custom. */
  inputClassName?: string;
};

type EditableTextProps =
  | (CommonProps & { multiline?: false })
  | (CommonProps & { multiline: true; rows?: number });

function canonicalize(s: string): string {
  return s.trim();
}

export function EditableText(props: EditableTextProps) {
  const { value, onCommit, placeholder, label, icon, size = "md", disabled, maxLength, className, inputClassName } = props;
  const multiline = "multiline" in props && props.multiline === true;
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);

  // Resync della draft al valore esterno quando NON siamo in focus
  // (es.: server snapshot dopo router.refresh, rollback su errore).
  useEffect(() => {
    if (!focusedRef.current) setDraft(value);
  }, [value]);

  const commit = (next: string) => {
    const clean = canonicalize(next);
    if (clean === canonicalize(value)) {
      // No-op: ripristina la draft al canonical (rimuove eventuali spazi).
      setDraft(clean);
      return;
    }
    setDraft(clean);
    void onCommit(clean);
  };

  return (
    <SoftField
      variant="inline"
      value={draft}
      onChange={setDraft}
      onCommit={commit}
      onCancel={() => setDraft(value)}
      placeholder={placeholder}
      label={label}
      icon={icon}
      size={size}
      disabled={disabled}
      maxLength={maxLength}
      hideCounter
      className={className}
      inputProps={{
        onFocus: () => { focusedRef.current = true; },
        onBlur: () => { focusedRef.current = false; },
        className: inputClassName,
      }}
      {...(multiline
        ? { multiline: true, rows: (props as { rows?: number }).rows ?? 2 }
        : { multiline: false })}
    />
  );
}
