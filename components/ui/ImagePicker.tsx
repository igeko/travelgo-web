"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconAlertCircle,
  IconCategory,
  IconCheck,
  IconCloudUpload,
  IconFileAlert,
  IconPhotoDown,
  IconPhotoEdit,
  IconRefresh,
  IconRotate,
  IconSearch,
  IconUpload,
  IconWifiOff,
  IconX,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { storage } from "@/lib/client/storage";

/* ─────────────────────────────────────────────────────────────────
   ImagePicker · TravelGo atom
   Thumbnail → dark popover → Upload / Search / Default tabs.
   Upload tab: states 1-7 + compression + Supabase Storage upload.

   NOTE ON COLORS: inline styles use hex values instead of var(--*)
   because in Next.js + Tailwind v4 theme tokens are --color-* not --.
   Tailwind classes (bg-ink, text-orange, …) are used where possible.
     ink    #0d2c3d
     bg     #f1efe8
     orange #f47b3a

   Exports:
   - ImagePicker            — full component
   - ImagePickerDropZone    — zone only, phase-controlled (sandbox)
   - UploadPhase            — discriminated union
   - ImagePickerApplyResult — onApply payload
   - CompressOptions        — compress prop shape
   - UploadOptions          — upload prop shape
───────────────────────────────────────────────────────────────── */

// ── Design-system constants ───────────────────────────────────────

const INK    = "#0d2c3d";
const ORANGE = "#f47b3a";
const BG     = "#f1efe8";

// ── File validation constants ─────────────────────────────────────

const ACCEPTED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
]);
const ACCEPTED_EXT = new Set([".jpg", ".jpeg", ".png", ".heic", ".webp"]);
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

// ── Public types ──────────────────────────────────────────────────

/** Settings for client-side compression (Canvas API → WebP). */
export type CompressOptions = {
  /** Output image will be scaled to fit within maxWidth × maxHeight, preserving aspect ratio. Never upscales. */
  maxWidth: number;
  maxHeight: number;
  /** WebP quality, 0–1. Default 0.85. */
  quality?: number;
};

/** Settings for Supabase Storage upload. */
export type UploadOptions = {
  bucket: string;
  /**
   * Storage path for the file (without leading slash).
   * Pass a string or a function that receives the sanitized filename.
   * Example: `(name) => \`trips/${tripId}/banner/${name}\``
   */
  path: string | ((fileName: string) => string);
};

/** Payload passed to onApply. */
export type ImagePickerApplyResult = {
  /** Original File object (useful for filename / EXIF metadata). */
  file: File;
  /**
   * URL safe to use as <img src>.
   * - Without upload: local object URL of the compressed WebP blob.
   * - With upload: Supabase public URL.
   * Revoke local object URLs (URL.revokeObjectURL) after you no longer need them.
   */
  previewUrl: string;
  /** Supabase storage path — present only when upload is configured. */
  storagePath?: string;
  /** Supabase public URL — same as previewUrl when upload is configured. */
  publicUrl?: string;
  /** Dimensions of the compressed image in px. */
  width: number;
  height: number;
};

export type UploadPhase =
  | { kind: "idle" }
  | { kind: "drag-over"; fileName?: string }
  | { kind: "uploading"; file: File; previewUrl: string; progress: number }
  | { kind: "complete"; file: File; previewUrl: string; result: ImagePickerApplyResult }
  | { kind: "error"; type: "size" | "format" | "upload"; fileName: string; fileSizeMb?: number };

type Tab = "upload" | "search" | "default";

// ── Compression utility ───────────────────────────────────────────

function calcDimensions(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1); // never upscale
  return { width: Math.round(srcW * ratio), height: Math.round(srcH * ratio) };
}

async function compressToWebP(
  file: File,
  opts: CompressOptions,
): Promise<{ blob: Blob; width: number; height: number }> {
  const { maxWidth, maxHeight, quality = 0.85 } = opts;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { width, height } = calcDimensions(
        img.naturalWidth,
        img.naturalHeight,
        maxWidth,
        maxHeight,
      );

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve({ blob, width, height });
          else reject(new Error("canvas.toBlob returned null"));
        },
        "image/webp",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to decode image"));
    };

    img.src = objectUrl;
  });
}

// ── Storage upload utility ───────────────────────────────────────

async function uploadToStorage(
  blob: Blob,
  opts: UploadOptions,
  fileName: string,
): Promise<{ storagePath: string; publicUrl: string }> {
  const path =
    typeof opts.path === "function" ? opts.path(fileName) : opts.path;

  return storage.uploadImage(opts.bucket, path, blob);
}

// ── Formatting helpers ────────────────────────────────────────────

function fmtMb(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}
function fmtExt(file: File) {
  return (
    file.type.split("/")[1]?.toUpperCase() ??
    file.name.split(".").pop()?.toUpperCase() ??
    "IMG"
  );
}
function validateFile(file: File): UploadPhase | null {
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  if (!ACCEPTED_MIME.has(file.type) && !ACCEPTED_EXT.has(ext))
    return { kind: "error", type: "format", fileName: file.name };
  if (file.size > MAX_BYTES)
    return {
      kind: "error",
      type: "size",
      fileName: file.name,
      fileSizeMb: +(file.size / 1024 / 1024).toFixed(1),
    };
  return null;
}

/* ─────────────────────────────────────────────────────────────────
   ImagePickerDropZone — phase-controlled upload zone.
   Exported for isolated sandbox testing.
───────────────────────────────────────────────────────────────── */

export type ImagePickerDropZoneProps = {
  phase: UploadPhase;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onBrowse?: () => void;
  onCancelUpload?: () => void;
};

export function ImagePickerDropZone({
  phase,
  onDragOver,
  onDragLeave,
  onDrop,
  onBrowse,
  onCancelUpload,
}: ImagePickerDropZoneProps) {
  /* ── Idle / Drag-over ── */
  if (phase.kind === "idle" || phase.kind === "drag-over") {
    const isActive = phase.kind === "drag-over";
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className="select-none rounded-[10px] px-3.5 py-6 text-center transition-colors"
        style={{
          border: `1.5px ${isActive ? "solid" : "dashed"} ${
            isActive ? ORANGE : "rgba(232,226,213,0.32)"
          }`,
          background: isActive ? "rgba(244,123,58,0.12)" : "rgba(255,255,255,0.03)",
        }}
      >
        {isActive ? (
          <>
            <IconPhotoDown size={26} className="mx-auto text-orange" />
            <p className="mt-2 text-meta font-medium text-orange">Drop to upload</p>
            {phase.fileName && (
              <p className="mt-[3px] text-tiny" style={{ color: "#9a9382" }}>
                {phase.fileName}
              </p>
            )}
          </>
        ) : (
          <>
            <IconCloudUpload size={26} className="mx-auto" style={{ color: "#d8d1c1" }} />
            <p className="mt-2 text-meta font-medium" style={{ color: "#e8e2d5" }}>
              Drop a photo here
            </p>
            <p className="mt-[3px] text-tiny" style={{ color: "#9a9382" }}>
              JPG · PNG · HEIC · WebP — up to 50 MB
            </p>
            <button
              type="button"
              onClick={onBrowse}
              className="mt-3 cursor-pointer rounded-[6px] px-3.5 py-[6px] text-mini font-medium"
              style={{ background: BG, color: INK, border: 0, fontFamily: "inherit" }}
            >
              Browse files
            </button>
          </>
        )}
      </div>
    );
  }

  /* ── Uploading / Complete ── */
  if (phase.kind === "uploading" || phase.kind === "complete") {
    const isUploading = phase.kind === "uploading";
    const progress = isUploading
      ? (phase as Extract<UploadPhase, { kind: "uploading" }>).progress
      : 100;

    return (
      <div
        className="flex items-center gap-[10px] rounded-[10px] p-[10px]"
        style={{ border: "0.5px solid rgba(255,255,255,0.10)" }}
      >
        <div
          className="h-[50px] w-[78px] shrink-0 rounded-[6px]"
          style={{
            backgroundImage: `url(${phase.previewUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "rgba(255,255,255,0.08)",
            opacity: isUploading ? 0.7 : 1,
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-meta font-medium text-white">{phase.file.name}</p>
          <p className="mt-[2px] text-tiny" style={{ color: "#9a9382" }}>
            {fmtMb(phase.file.size)}
            {isUploading
              ? ` · uploading ${Math.round(progress)}%`
              : ` · ${fmtExt(phase.file)} · ready`}
          </p>
          {isUploading && (
            <div
              className="mt-[6px] h-[3px] overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.10)" }}
            >
              <div
                className="h-full rounded-full bg-orange transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        {isUploading ? (
          <button
            type="button"
            onClick={onCancelUpload}
            className="cursor-pointer"
            style={{ background: "none", border: 0, padding: 0, lineHeight: 0 }}
            aria-label="Cancel upload"
          >
            <IconX size={16} style={{ color: "#9a9382" }} />
          </button>
        ) : (
          <IconCheck size={16} style={{ color: "#7cd49b" }} />
        )}
      </div>
    );
  }

  /* ── Error ── */
  if (phase.kind === "error") {
    const isUploadErr = phase.type === "upload";
    return (
      <div
        className="rounded-[10px] px-3.5 py-6 text-center"
        style={{
          border: "1.5px dashed rgba(255,180,180,0.55)",
          background: "rgba(154,48,21,0.12)",
        }}
      >
        {phase.type === "size" && (
          <>
            <IconAlertCircle size={26} className="mx-auto" style={{ color: "#faafaf" }} />
            <p className="mt-2 text-meta font-medium" style={{ color: "#faafaf" }}>
              File too large
            </p>
            <p className="mt-[3px] text-tiny" style={{ color: "#9a9382" }}>
              {phase.fileName}
              {phase.fileSizeMb !== undefined ? ` · ${phase.fileSizeMb} MB` : ""} — max 50 MB
            </p>
          </>
        )}
        {phase.type === "format" && (
          <>
            <IconFileAlert size={26} className="mx-auto" style={{ color: "#faafaf" }} />
            <p className="mt-2 text-meta font-medium" style={{ color: "#faafaf" }}>
              Unsupported format
            </p>
            <p className="mt-[3px] text-tiny" style={{ color: "#9a9382" }}>
              {phase.fileName} — use JPG, PNG, HEIC or WebP
            </p>
          </>
        )}
        {isUploadErr && (
          <>
            <IconWifiOff size={26} className="mx-auto" style={{ color: "#faafaf" }} />
            <p className="mt-2 text-meta font-medium" style={{ color: "#faafaf" }}>
              Upload failed
            </p>
            <p className="mt-[3px] text-tiny" style={{ color: "#9a9382" }}>
              {phase.fileName} — check your connection and try again
            </p>
          </>
        )}
      </div>
    );
  }

  return null;
}

/* ─────────────────────────────────────────────────────────────────
   ImagePicker — full component
───────────────────────────────────────────────────────────────── */

export type ImagePickerProps = {
  /** URL shown as thumbnail background. */
  currentImageUrl?: string;
  /** Short label in the popover footer ("Current: …"). */
  currentLabel?: string;
  /** Thumbnail width in px — default 120. */
  thumbnailWidth?: number;
  /** Thumbnail height in px — default 68. */
  thumbnailHeight?: number;
  /**
   * Client-side compression settings.
   * The file is resized to fit maxWidth × maxHeight and exported as WebP
   * before the upload (or before passing to onApply if upload is not set).
   * Omit to skip compression and pass the original file as-is.
   */
  compress?: CompressOptions;
  /**
   * Supabase Storage upload settings.
   * When provided, the compressed blob is uploaded automatically
   * and onApply receives the public URL + storage path.
   * Omit to keep the flow purely client-side (onApply gets a local object URL).
   */
  upload?: UploadOptions;
  /** Called when the user clicks Apply. */
  onApply: (result: ImagePickerApplyResult) => void;
  /** When provided, shows "Reset to default" in the footer. */
  onReset?: () => void;
  className?: string;
};

export function ImagePicker({
  currentImageUrl,
  currentLabel = "custom image",
  thumbnailWidth = 120,
  thumbnailHeight = 68,
  compress,
  upload,
  onApply,
  onReset,
  className,
}: ImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("upload");
  const [phase, setPhase] = useState<UploadPhase>({ kind: "idle" });
  const [hovered, setHovered] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Keep a ref to abort an in-flight upload if the user cancels
  const cancelRef = useRef(false);

  /* ── Close on outside click ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* ── Fake progress ticker ──
     Runs while phase === "uploading".
     - No upload config  → ticks up to 100% and auto-completes (not used, see startUpload)
     - With upload config → caps at 85% and waits for the real upload to resolve
  ── */
  useEffect(() => {
    if (phase.kind !== "uploading") return;
    const cap = upload ? 85 : 100;

    const id = setInterval(() => {
      setPhase((prev) => {
        if (prev.kind !== "uploading") return prev;
        const next = Math.min(prev.progress + Math.random() * 14 + 6, cap);
        return { ...prev, progress: next };
      });
    }, 160);

    return () => clearInterval(id);
  }, [phase.kind, !!upload]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Core upload function ── */
  const startUpload = useCallback(
    async (file: File) => {
      const err = validateFile(file);
      if (err) { setPhase(err); return; }

      cancelRef.current = false;

      // Local preview for immediate thumbnail display during compression
      const localPreviewUrl = URL.createObjectURL(file);
      setPhase({ kind: "uploading", file, previewUrl: localPreviewUrl, progress: 0 });

      try {
        // 1. Compress (if configured), otherwise keep original
        let blob: Blob = file;
        let width = 0;
        let height = 0;

        if (compress) {
          const result = await compressToWebP(file, compress);
          blob = result.blob;
          width = result.width;
          height = result.height;
        } else {
          // Read dimensions without compression
          await new Promise<void>((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
              width = img.naturalWidth;
              height = img.naturalHeight;
              URL.revokeObjectURL(url);
              resolve();
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
            img.src = url;
          });
        }

        if (cancelRef.current) return;

        // 2. Upload (if configured)
        if (upload) {
          const sanitizedName = file.name
            .replace(/\.[^.]+$/, "") // strip extension
            .replace(/[^a-z0-9_-]/gi, "-")
            .toLowerCase()
            .slice(0, 60) + ".webp";

          const { storagePath, publicUrl } = await uploadToStorage(
            blob,
            upload,
            sanitizedName,
          );

          if (cancelRef.current) return;

          // Revoke the temporary local preview (public URL takes over)
          URL.revokeObjectURL(localPreviewUrl);

          const applyResult: ImagePickerApplyResult = {
            file,
            previewUrl: publicUrl,
            storagePath,
            publicUrl,
            width,
            height,
          };
          setPhase({ kind: "complete", file, previewUrl: publicUrl, result: applyResult });

        } else {
          // No upload — preview from compressed blob
          const compressedPreviewUrl = compress
            ? URL.createObjectURL(blob)
            : localPreviewUrl;

          if (compress) URL.revokeObjectURL(localPreviewUrl);

          const applyResult: ImagePickerApplyResult = {
            file,
            previewUrl: compressedPreviewUrl,
            width,
            height,
          };
          setPhase({ kind: "complete", file, previewUrl: compressedPreviewUrl, result: applyResult });
        }
      } catch (e) {
        console.error("[ImagePicker] upload error", e);
        URL.revokeObjectURL(localPreviewUrl);
        if (!cancelRef.current) {
          setPhase({ kind: "error", type: "upload", fileName: file.name });
        }
      }
    },
    [compress, upload],
  );

  /* ── Drag handlers ── */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (phase.kind !== "idle") return;
    const entry = (
      e.dataTransfer.items[0] as DataTransferItem & {
        webkitGetAsEntry?: () => { name?: string } | null;
      }
    )?.webkitGetAsEntry?.();
    setPhase({ kind: "drag-over", fileName: entry?.name });
  };

  const handleDragLeave = () => {
    if (phase.kind === "drag-over") setPhase({ kind: "idle" });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) startUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) startUpload(file);
    e.target.value = "";
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setPhase({ kind: "idle" });
  };

  const handleApply = () => {
    if (phase.kind !== "complete") return;
    onApply(phase.result);
    setOpen(false);
    setPhase({ kind: "idle" });
  };

  const handleReset = () => {
    onReset?.();
    setOpen(false);
    setPhase({ kind: "idle" });
  };

  /* ── Footer ── */
  const renderFooter = () => {
    if (phase.kind === "complete") {
      return (
        <div className="mt-3 flex items-center justify-between text-tiny" style={{ color: "#9a9382" }}>
          <button
            type="button"
            onClick={handleCancel}
            className="flex cursor-pointer items-center gap-1 text-orange"
            style={{ background: "none", border: 0, padding: 0, fontFamily: "inherit", fontSize: "11px" }}
          >
            <IconRefresh size={11} />Replace
          </button>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleCancel}
              className="cursor-pointer"
              style={{
                background: "transparent",
                border: "0.5px solid rgba(255,255,255,0.10)",
                borderRadius: 999,
                padding: "5px 14px",
                fontSize: 12,
                color: "#9a9382",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="cursor-pointer bg-orange text-white"
              style={{ border: 0, borderRadius: 999, padding: "5px 16px", fontSize: 12, fontWeight: 500, fontFamily: "inherit" }}
            >
              Apply
            </button>
          </div>
        </div>
      );
    }

    if (phase.kind === "error") {
      return (
        <div className="mt-3 flex items-center justify-between text-tiny" style={{ color: "#9a9382" }}>
          <span />
          <button
            type="button"
            onClick={() => setPhase({ kind: "idle" })}
            className="cursor-pointer text-orange"
            style={{ background: "none", border: 0, padding: 0, fontFamily: "inherit", fontSize: "11px" }}
          >
            Try another file
          </button>
        </div>
      );
    }

    if (!onReset && !currentLabel) return null;
    return (
      <div className="mt-3 flex items-center justify-between text-tiny" style={{ color: "#9a9382" }}>
        <span>{currentLabel ? `Current: ${currentLabel}` : ""}</span>
        {onReset && (
          <button
            type="button"
            onClick={handleReset}
            className="flex cursor-pointer items-center gap-1 text-orange"
            style={{ background: "none", border: 0, padding: 0, fontFamily: "inherit", fontSize: "11px" }}
          >
            <IconRotate size={11} />Reset to default
          </button>
        )}
      </div>
    );
  };

  /* ── Render ── */
  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={[...ACCEPTED_EXT].join(",")}
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Thumbnail */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Change image"
        aria-expanded={open}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((o) => !o)}
        className="relative cursor-pointer select-none overflow-hidden rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
        style={{
          width: thumbnailWidth,
          height: thumbnailHeight,
          backgroundColor: "#a8b5c4",
          backgroundImage: currentImageUrl ? `url(${currentImageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {(hovered || open) && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white"
            style={{ background: "rgba(13,44,61,0.55)" }}
          >
            <IconPhotoEdit size={18} />
            <span className="text-tiny font-medium">Change image</span>
          </div>
        )}
      </div>

      {/* Popover */}
      {open && (
        <div
          className="absolute left-0 z-50 w-[380px] rounded-lg p-[14px] bg-ink"
          style={{ top: "calc(100% + 10px)", color: "#d8d1c1" }}
        >
          {/* Arrow */}
          <div
            className="absolute -top-[7px] left-12 h-0 w-0"
            style={{
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom: `8px solid ${INK}`,
            }}
          />

          {/* Tab bar */}
          <div
            className="mb-3 flex gap-[3px] rounded-[9px] p-[3px]"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {(["upload", "search", "default"] as Tab[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-1.5 py-[7px] text-mini font-medium transition-colors",
                  tab === t ? "text-ink" : "text-[#b8b0a0]",
                )}
                style={{
                  background: tab === t ? BG : "transparent",
                  border: 0,
                  fontFamily: "inherit",
                }}
              >
                {t === "upload" && <IconUpload size={13} />}
                {t === "search" && <IconSearch size={13} />}
                {t === "default" && <IconCategory size={13} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab body */}
          {tab === "upload" && (
            <ImagePickerDropZone
              phase={phase}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onBrowse={() => fileInputRef.current?.click()}
              onCancelUpload={handleCancel}
            />
          )}
          {tab === "search" && (
            <div
              className="rounded-[10px] px-4 py-8 text-center text-meta"
              style={{ border: "1.5px dashed rgba(232,226,213,0.20)", color: "#9a9382" }}
            >
              Search — coming soon
            </div>
          )}
          {tab === "default" && (
            <div
              className="rounded-[10px] px-4 py-8 text-center text-meta"
              style={{ border: "1.5px dashed rgba(232,226,213,0.20)", color: "#9a9382" }}
            >
              Default — coming soon
            </div>
          )}

          {tab === "upload" && renderFooter()}
        </div>
      )}
    </div>
  );
}
