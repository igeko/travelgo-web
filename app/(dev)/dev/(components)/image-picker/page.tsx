"use client";

import { useState } from "react";
import {
  ImagePicker,
  ImagePickerDropZone,
  type ImagePickerApplyResult,
  type UploadPhase,
} from "@/components/ui/ImagePicker";
import {
  StoryPage,
  StoryFrame,
  DocsFrame,
  PropsTable,
  CodeBlock,
} from "../_components/StoryFrame";
import { SandboxRightPanel } from "../_components/SandboxShell";
import { ControlsPanel, type ControlGroup } from "../_components/ControlsPanel";

/* ─────────────────────────────────────────────────────────────────
   Mock data for frozen-state stories
───────────────────────────────────────────────────────────────── */

const MOCK_FILE = new File(
  [new Uint8Array(Math.round(3.2 * 1024 * 1024))],
  "tokyo-tower-sunset.jpg",
  { type: "image/jpeg" },
);

const MOCK_PREVIEW =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const MOCK_RESULT: ImagePickerApplyResult = {
  file: MOCK_FILE,
  previewUrl: MOCK_PREVIEW,
  width: 1200,
  height: 675,
};

const FROZEN_PHASES: { label: string; description: string; phase: UploadPhase }[] = [
  {
    label: "1 · idle",
    description: "Drop zone at rest",
    phase: { kind: "idle" },
  },
  {
    label: "2 · drag-over",
    description: "File dragged over the zone",
    phase: { kind: "drag-over", fileName: "tokyo-tower-sunset.jpg · 3.2 MB" },
  },
  {
    label: "3 · uploading",
    description: "Upload in progress at 62%",
    phase: { kind: "uploading", file: MOCK_FILE, previewUrl: MOCK_PREVIEW, progress: 62 },
  },
  {
    label: "4 · complete",
    description: "Upload done — Apply enabled",
    phase: { kind: "complete", file: MOCK_FILE, previewUrl: MOCK_PREVIEW, result: MOCK_RESULT },
  },
  {
    label: "5 · error · size",
    description: "File exceeds 50 MB",
    phase: { kind: "error", type: "size", fileName: "tokyo-raw.heic", fileSizeMb: 64.3 },
  },
  {
    label: "6 · error · format",
    description: "Unsupported extension",
    phase: { kind: "error", type: "format", fileName: "notes.tiff" },
  },
  {
    label: "7 · error · upload",
    description: "Network / Supabase error",
    phase: { kind: "error", type: "upload", fileName: "photo.jpg" },
  },
];

/* ─────────────────────────────────────────────────────────────────
   Sandbox page
───────────────────────────────────────────────────────────────── */

export default function ImagePickerStories() {
  /* ── Thumbnail controls ── */
  const [showImage, setShowImage] = useState(false);
  const [showReset, setShowReset] = useState(true);
  const [label, setLabel] = useState("custom image");
  const [thumbW, setThumbW] = useState(120);
  const [thumbH, setThumbH] = useState(68);

  /* ── Compression controls ── */
  const [enableCompress, setEnableCompress] = useState(true);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [maxHeight, setMaxHeight] = useState(900);
  const [quality, setQuality] = useState(85); // 0-100 for display, /100 for API

  /* ── Apply result ── */
  const [appliedUrl, setAppliedUrl] = useState<string | undefined>(undefined);
  const [applyResult, setApplyResult] = useState<ImagePickerApplyResult | null>(null);

  const groups: ControlGroup[] = [
    {
      title: "Thumbnail",
      controls: [
        {
          kind: "toggle",
          id: "show-image",
          label: "Background image",
          value: showImage,
          onChange: setShowImage,
        },
        {
          kind: "number",
          id: "thumb-w",
          label: "Width (px)",
          value: thumbW,
          onChange: setThumbW,
        },
        {
          kind: "number",
          id: "thumb-h",
          label: "Height (px)",
          value: thumbH,
          onChange: setThumbH,
        },
        {
          kind: "text",
          id: "label",
          label: "currentLabel",
          value: label,
          onChange: setLabel,
        },
        {
          kind: "toggle",
          id: "show-reset",
          label: "Show onReset",
          value: showReset,
          onChange: setShowReset,
        },
      ],
    },
    {
      title: "Compression",
      controls: [
        {
          kind: "toggle",
          id: "enable-compress",
          label: "Enable compression",
          value: enableCompress,
          onChange: setEnableCompress,
        },
        {
          kind: "number",
          id: "max-width",
          label: "maxWidth (px)",
          value: maxWidth,
          onChange: setMaxWidth,
        },
        {
          kind: "number",
          id: "max-height",
          label: "maxHeight (px)",
          value: maxHeight,
          onChange: setMaxHeight,
        },
        {
          kind: "number",
          id: "quality",
          label: "Quality (1–100)",
          value: quality,
          onChange: setQuality,
        },
      ],
    },
  ];

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="ImagePicker"
        description="Thumbnail + dark popover with Upload / Search / Default tabs. Compresses to WebP client-side before uploading to Supabase Storage."
      >
        {/* ── Interactive ── */}
        <StoryFrame
          name="Interactive"
          description="Drop a file or browse. Compression runs client-side (Canvas → WebP). Upload to Supabase is not configured here — onApply receives a local object URL."
        >
          <div className="flex flex-col gap-4">
            <ImagePicker
              currentImageUrl={
                appliedUrl ??
                (showImage
                  ? "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=240&q=80"
                  : undefined)
              }
              currentLabel={label}
              thumbnailWidth={thumbW}
              thumbnailHeight={thumbH}
              compress={
                enableCompress
                  ? { maxWidth, maxHeight, quality: quality / 100 }
                  : undefined
              }
              // upload not configured in sandbox — wire it in HeroBanner with bucket + path
              onApply={(result) => {
                setAppliedUrl(result.previewUrl);
                setApplyResult(result);
                console.log("[ImagePicker] apply →", result);
              }}
              onReset={
                showReset
                  ? () => {
                      setAppliedUrl(undefined);
                      setApplyResult(null);
                    }
                  : undefined
              }
            />

            {/* Apply result inspector */}
            {applyResult && (
              <div className="rounded-lg border border-border bg-surface px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
                <p className="font-medium text-ink mb-1">onApply result</p>
                <p>file: <span className="text-ink">{applyResult.file.name}</span></p>
                <p>dimensions: <span className="text-ink">{applyResult.width} × {applyResult.height} px</span></p>
                <p>
                  previewUrl:{" "}
                  <span className="text-ink">
                    {applyResult.publicUrl ? "Supabase public URL" : "local object URL"}
                  </span>
                </p>
                {applyResult.storagePath && (
                  <p>storagePath: <span className="text-ink">{applyResult.storagePath}</span></p>
                )}
              </div>
            )}
          </div>
        </StoryFrame>

        {/* ── Frozen states ── */}
        <StoryFrame
          name="Upload zone · all states"
          description="Frozen snapshots of ImagePickerDropZone. Includes the new error · upload state (7)."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {FROZEN_PHASES.map(({ label: stateLabel, description, phase }) => (
              <div key={stateLabel} className="flex flex-col gap-2">
                <div className="rounded-[14px] p-3 bg-ink">
                  <ImagePickerDropZone phase={phase} />
                </div>
                <p className="text-[11px] font-medium text-ink">{stateLabel}</p>
                <p className="text-[11px] leading-snug text-ink-soft">{description}</p>
              </div>
            ))}
          </div>
        </StoryFrame>

        {/* ── Docs ── */}
        <DocsFrame>
          <PropsTable
            rows={[
              {
                prop: "currentImageUrl",
                type: "string",
                defaultValue: "—",
                description: "URL shown as thumbnail background.",
              },
              {
                prop: "currentLabel",
                type: "string",
                defaultValue: '"custom image"',
                description: 'Short label in the footer: "Current: …".',
              },
              {
                prop: "thumbnailWidth",
                type: "number",
                defaultValue: "120",
                description: "Thumbnail width in px.",
              },
              {
                prop: "thumbnailHeight",
                type: "number",
                defaultValue: "68",
                description: "Thumbnail height in px.",
              },
              {
                prop: "compress",
                type: "CompressOptions",
                defaultValue: "—",
                description:
                  "Client-side WebP compression. { maxWidth, maxHeight, quality? }. Omit to skip.",
              },
              {
                prop: "upload",
                type: "UploadOptions",
                defaultValue: "—",
                description:
                  "Supabase Storage config. { bucket, path }. Omit for local-only preview.",
              },
              {
                prop: "onApply",
                type: "(result: ImagePickerApplyResult) => void",
                defaultValue: "—",
                description:
                  "Fired on Apply. Result contains file, previewUrl, width, height and (if upload) storagePath + publicUrl.",
              },
              {
                prop: "onReset",
                type: "() => void",
                defaultValue: "—",
                description: 'Shows "Reset to default" when provided.',
              },
            ]}
          />

          <CodeBlock
            code={`import { ImagePicker } from "@/components/ui/ImagePicker";

// With compression + Supabase upload (HeroBanner usage)
<ImagePicker
  currentImageUrl={day.imageUrl}
  currentLabel="custom photo"
  compress={{ maxWidth: 1600, maxHeight: 900, quality: 0.85 }}
  upload={{
    bucket: "trip-media",
    path: (name) => \`trips/\${tripId}/banner/\${name\`,
  }}
  onApply={({ storagePath, publicUrl, width, height }) => {
    // storagePath → persist on the owning row (e.g. day.storagePath)
    // publicUrl   → update day.imageUrl for immediate display
    updateDayBanner(dayId, { imageUrl: publicUrl, storagePath });
  }}
  onReset={() => resetToTypeDefault(dayId)}
/>`}
          />
        </DocsFrame>
      </StoryPage>
    </>
  );
}
