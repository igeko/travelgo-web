"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconDeviceFloppy,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@/components/ui/icons";
import { StoryFrame, StoryPage } from "../_components/StoryFrame";
import {
  ControlsPanel,
  type ControlGroup,
} from "../_components/ControlsPanel";
import { SandboxRightPanel } from "../_components/SandboxShell";

type Size = "sm" | "md" | "lg";
type Variant = "outline" | "solid" | "ghost" | "over-media" | "text-only";
type Tone = "neutral" | "danger" | "warning" | "success";

const SIZES: Size[] = ["sm", "md", "lg"];
const VARIANTS: Variant[] = [
  "outline",
  "solid",
  "ghost",
  "over-media",
  "text-only",
];
const TONES: Tone[] = ["neutral", "danger", "warning", "success"];

export default function ButtonStories() {
  // Debugger state
  const [size, setSize] = useState<Size>("md");
  const [variant, setVariant] = useState<Variant>("outline");
  const [tone, setTone] = useState<Tone>("neutral");
  const [withLabel, setWithLabel] = useState(true);
  const [withIcon, setWithIcon] = useState(true);
  const [disabled, setDisabled] = useState(false);

  // text-only forces icon removal (the CSS handles it too, but we
  // mirror it in the debugger for clarity)
  const effectiveWithIcon = variant === "text-only" ? false : withIcon;
  const iconOnly = !withLabel && effectiveWithIcon;

  const groups: ControlGroup[] = [
    {
      title: "Layout",
      controls: [
        {
          kind: "radio",
          id: "size",
          label: "Size",
          value: size,
          onChange: (v) => setSize(v as Size),
          options: SIZES.map((s) => ({ value: s, label: s.toUpperCase() })),
        },
      ],
    },
    {
      title: "Appearance",
      controls: [
        {
          kind: "radio",
          id: "variant",
          label: "Variant",
          value: variant,
          onChange: (v) => setVariant(v as Variant),
          options: VARIANTS.map((v) => ({ value: v, label: v })),
        },
        {
          kind: "radio",
          id: "tone",
          label: "Tone",
          value: tone,
          onChange: (v) => setTone(v as Tone),
          options: TONES.map((t) => ({ value: t, label: t })),
        },
      ],
    },
    {
      title: "Content",
      controls: [
        {
          kind: "toggle",
          id: "label",
          label: "With label",
          value: withLabel,
          onChange: setWithLabel,
        },
        {
          kind: "toggle",
          id: "icon",
          label: "With icon",
          value: withIcon,
          onChange: setWithIcon,
        },
      ],
    },
    {
      title: "State",
      controls: [
        {
          kind: "toggle",
          id: "disabled",
          label: "Disabled",
          value: disabled,
          onChange: setDisabled,
        },
      ],
    },
  ];

  // Dark background for over-media so you can actually see it
  const debuggerBg =
    variant === "over-media"
      ? "bg-[url('/design/imgs/day-banner-nature.png')] bg-cover bg-center"
      : "bg-surface-soft";

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="Button"
        description="TravelGo button system. Three sizes, five visual variants (outline/solid/ghost/over-media/text-only), four semantic tones (neutral/danger/warning/success). Icons are passed as children and auto-scale with the font-size."
      >
        <StoryFrame
          name="Debugger"
          description="Tweak the controls on the right to see the button react. The `over-media` variant is shown over an image because it's designed for dark backgrounds."
        >
          <div
            className={`flex items-center justify-center rounded-md py-10 ${debuggerBg}`}
          >
            <Button
              size={size}
              variant={variant}
              tone={tone}
              iconOnly={iconOnly}
              disabled={disabled}
            >
              {effectiveWithIcon && <IconDeviceFloppy />}
              {withLabel && <span>Save</span>}
            </Button>
          </div>
        </StoryFrame>

        <StoryFrame
          name="Matrix · variant × tone (size md, with label)"
          description="All useful combinations at a glance. Hover the buttons to test the states."
        >
          <Matrix>
            <Cell label=""></Cell>
            {TONES.map((t) => (
              <Cell key={t} label={t} header />
            ))}
            {VARIANTS.map((v) => (
              <Row key={v}>
                <Cell label={v} header />
                {TONES.map((t) => {
                  // over-media must be shown on a dark background
                  const cellClass =
                    v === "over-media"
                      ? "bg-ink/80 rounded-md p-3 flex justify-center"
                      : "flex justify-center";
                  return (
                    <div key={t} className={cellClass}>
                      <Button variant={v} tone={t} size="md">
                        <IconCheck />
                        <span>OK</span>
                      </Button>
                    </div>
                  );
                })}
              </Row>
            ))}
          </Matrix>
        </StoryFrame>

        <StoryFrame
          name="Sizes · icon-only"
          description="The three sizes with icon only, outline variant."
        >
          <div className="flex items-center gap-4">
            <Button size="sm" iconOnly>
              <IconPlus />
            </Button>
            <Button size="md" iconOnly>
              <IconPlus />
            </Button>
            <Button size="lg" iconOnly>
              <IconPlus />
            </Button>
          </div>
        </StoryFrame>

        <StoryFrame
          name="Sizes · with label"
          description="The three sizes with icon + label."
        >
          <div className="flex items-center gap-4">
            <Button size="sm">
              <IconPencil />
              <span>Edit</span>
            </Button>
            <Button size="md">
              <IconPencil />
              <span>Edit</span>
            </Button>
            <Button size="lg">
              <IconPencil />
              <span>Edit</span>
            </Button>
          </div>
        </StoryFrame>

        <StoryFrame
          name="Action cluster · example"
          description='Realistic example: "edit" + "delete" action cluster in ghost.'
        >
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" iconOnly>
              <IconPencil />
            </Button>
            <Button size="sm" variant="ghost" tone="danger" iconOnly>
              <IconTrash />
            </Button>
          </div>
        </StoryFrame>

        <StoryFrame
          name="Over-media · on a dark image"
          description="The over-media variant is designed to sit on top of heroes/thumbnails. Soft white border with backdrop-blur."
        >
          <div className="rounded-lg overflow-hidden bg-[url('/design/imgs/day-banner-nature.png')] bg-cover bg-center p-6 flex items-center gap-3">
            <Button variant="over-media" iconOnly>
              <IconChevronLeft />
            </Button>
            <Button variant="over-media" iconOnly>
              <IconChevronRight />
            </Button>
            <Button variant="over-media">
              <IconX />
              <span>Close</span>
            </Button>
          </div>
        </StoryFrame>

        <StoryFrame
          name="State · disabled"
          description="Reduced opacity, not-allowed cursor, no scale on click."
        >
          <div className="flex items-center gap-3">
            <Button variant="solid" disabled>
              <IconCheck />
              <span>OK</span>
            </Button>
            <Button variant="outline" disabled>
              <IconCheck />
              <span>OK</span>
            </Button>
            <Button variant="ghost" disabled iconOnly>
              <IconTrash />
            </Button>
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Helper · matrix grid
───────────────────────────────────────────────────────────────── */

function Matrix({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_repeat(4,1fr)] gap-y-4 gap-x-3 items-center">
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
function Cell({
  label,
  header,
}: {
  label: string;
  header?: boolean;
}) {
  return (
    <div
      className={`text-[10px] font-medium tracking-[0.12em] uppercase ${
        header ? "text-ink-soft" : "text-ink"
      }`}
    >
      {label}
    </div>
  );
}
