"use client";

import { useState } from "react";
import { SoftField } from "@/components/ui/SoftField";
import { Button } from "@/components/ui/Button";
import { IconLink, IconMapPin } from "@/components/ui/icons";
import { StoryFrame, StoryPage } from "../_components/StoryFrame";
import {
  ControlsPanel,
  type ControlGroup,
} from "../_components/ControlsPanel";
import { SandboxRightPanel } from "../_components/SandboxShell";

type PrefixOption = "none" | "map-pin" | "link" | "emoji";
type SuffixOption = "none" | "map-button" | "badge";
type MapButtonVariant = "outline" | "ghost" | "solid";

export default function SoftFieldStories() {
  // Debugger state
  const [value, setValue] = useState("Hoshinoya Tokyo");
  const [label, setLabel] = useState("Lodging name");
  const [placeholder, setPlaceholder] = useState("Lodging name");
  const [multiline, setMultiline] = useState(false);
  const [size, setSize] = useState<"sm" | "md">("md");
  const [useMaxLength, setUseMaxLength] = useState(false);
  const [maxLength, setMaxLength] = useState(80);
  const [prefix, setPrefix] = useState<PrefixOption>("none");
  const [suffix, setSuffix] = useState<SuffixOption>("none");
  const [mapButtonLabel, setMapButtonLabel] = useState("map");
  const [mapButtonVariant, setMapButtonVariant] = useState<MapButtonVariant>("outline");
  const [disabled, setDisabled] = useState(false);
  const [labelAlwaysVisible, setLabelAlwaysVisible] = useState(false);

  const groups: ControlGroup[] = [
    {
      title: "Content",
      controls: [
        {
          kind: "text",
          id: "value",
          label: "Value",
          value,
          onChange: setValue,
        },
        {
          kind: "text",
          id: "label",
          label: "Floating label",
          value: label,
          placeholder: "(empty = no label)",
          onChange: setLabel,
        },
        {
          kind: "text",
          id: "placeholder",
          label: "Placeholder",
          value: placeholder,
          onChange: setPlaceholder,
        },
      ],
    },
    {
      title: "Layout",
      controls: [
        {
          kind: "radio",
          id: "size",
          label: "Size",
          value: size,
          onChange: (v) => setSize(v as "sm" | "md"),
          options: [
            { value: "md", label: "md (default)" },
            { value: "sm", label: "sm" },
          ],
        },
        {
          kind: "toggle",
          id: "multiline",
          label: "Multiline (textarea)",
          value: multiline,
          onChange: setMultiline,
        },
        {
          kind: "radio",
          id: "prefix",
          label: "Prefix slot",
          value: prefix,
          onChange: (v) => setPrefix(v as PrefixOption),
          options: [
            { value: "none", label: "None" },
            { value: "map-pin", label: "Map pin" },
            { value: "link", label: "Link" },
            { value: "emoji", label: "Emoji 🏨" },
          ],
        },
        {
          kind: "radio",
          id: "suffix",
          label: "Suffix slot",
          value: suffix,
          onChange: (v) => setSuffix(v as SuffixOption),
          options: [
            { value: "none", label: "None" },
            { value: "map-button", label: "Map button" },
            { value: "badge", label: "Text badge" },
          ],
        },
        {
          kind: "text",
          id: "map-button-label",
          label: "Map button label",
          value: mapButtonLabel,
          placeholder: "map",
          onChange: setMapButtonLabel,
        },
        {
          kind: "radio",
          id: "map-button-variant",
          label: "Map button variant",
          value: mapButtonVariant,
          onChange: (v) => setMapButtonVariant(v as MapButtonVariant),
          options: [
            { value: "outline", label: "outline" },
            { value: "ghost", label: "ghost" },
            { value: "solid", label: "solid" },
          ],
        },
      ],
    },
    {
      title: "Counter",
      controls: [
        {
          kind: "toggle",
          id: "use-max",
          label: "Use maxLength",
          value: useMaxLength,
          onChange: setUseMaxLength,
        },
        {
          kind: "number",
          id: "max-length",
          label: "maxLength",
          value: maxLength,
          min: 1,
          max: 500,
          onChange: setMaxLength,
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
        {
          kind: "toggle",
          id: "labelAlwaysVisible",
          label: "Label always visible",
          value: labelAlwaysVisible,
          onChange: setLabelAlwaysVisible,
        },
      ],
    },
  ];

  // Build the slot nodes based on the debugger controls
  const prefixNode =
    prefix === "map-pin" ? (
      <SoftField.Prefix>
        <IconMapPin />
      </SoftField.Prefix>
    ) : prefix === "link" ? (
      <SoftField.Prefix>
        <IconLink />
      </SoftField.Prefix>
    ) : prefix === "emoji" ? (
      <SoftField.Prefix>
        <span className="text-base leading-none">🏨</span>
      </SoftField.Prefix>
    ) : null;

  const suffixNode =
    suffix === "map-button" ? (
      <SoftField.Suffix>
        <Button variant={mapButtonVariant}>
          <IconMapPin />
          <span>{mapButtonLabel}</span>
        </Button>
      </SoftField.Suffix>
    ) : suffix === "badge" ? (
      <SoftField.Suffix>
        <span className="text-[10px] uppercase tracking-[0.06em] font-medium text-ink-soft bg-surface-soft px-2 py-0.5 rounded-pill">
          optional
        </span>
      </SoftField.Suffix>
    ) : null;

  return (
    <>
      <SandboxRightPanel>
        <ControlsPanel groups={groups} />
      </SandboxRightPanel>

      <StoryPage
        title="SoftField"
        description="Soft pill text input. Covers the `.soft` (plain) and `.addr-row` (with prefix icon and suffix action) patterns from the design. Prefix and suffix are declarative slots — pass anything you want."
      >
        <StoryFrame
          name="Debugger"
          description="Tweak the controls and focus the field to see the floating label appear. Switch the prefix and suffix slots to see how the layout adapts."
        >
          {multiline ? (
            <SoftField
              multiline
              size={size}
              value={value}
              onChange={setValue}
              label={label || undefined}
              labelAlwaysVisible={labelAlwaysVisible}
              placeholder={placeholder}
              maxLength={useMaxLength ? maxLength : undefined}
              disabled={disabled}
            >
              {prefixNode}
              {suffixNode}
            </SoftField>
          ) : (
            <SoftField
              size={size}
              value={value}
              onChange={setValue}
              label={label || undefined}
              labelAlwaysVisible={labelAlwaysVisible}
              placeholder={placeholder}
              maxLength={useMaxLength ? maxLength : undefined}
              disabled={disabled}
            >
              {prefixNode}
              {suffixNode}
            </SoftField>
          )}
        </StoryFrame>

        <StoryFrame
          name="Size · sm vs md"
          description="`size='sm'` shrinks padding, font and icons for compact / inline contexts. Default is `md`. Slots adapt automatically."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                md (default)
              </div>
              <SoftField value="Hoshinoya Tokyo" onChange={() => {}} label="Lodging name">
                <SoftField.Prefix>
                  <IconMapPin />
                </SoftField.Prefix>
                <SoftField.Suffix>
                  <Button variant="outline">
                    <IconMapPin />
                    <span>map</span>
                  </Button>
                </SoftField.Suffix>
              </SoftField>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                sm
              </div>
              <SoftField size="sm" value="Hoshinoya Tokyo" onChange={() => {}} label="Lodging name">
                <SoftField.Prefix>
                  <IconMapPin />
                </SoftField.Prefix>
                <SoftField.Suffix>
                  <Button variant="outline">
                    <IconMapPin />
                    <span>map</span>
                  </Button>
                </SoftField.Suffix>
              </SoftField>
              <SoftField
                size="sm"
                multiline
                value=""
                onChange={() => {}}
                label="Notes"
                placeholder="A few words…"
              />
            </div>
          </div>
        </StoryFrame>

        <StoryFrame
          name="Inside a 'Modifica alloggio' form"
          description="Recreates the layout from day_edit.html. Each row is a SoftField; the address and link rows use SoftField.Prefix and (for address) a SoftField.Suffix with the map button."
        >
          <LodgingFormDemo />
        </StoryFrame>

        <StoryFrame
          name="Slot API · what you can put inside"
          description="Slots accept any ReactNode. Icons get a sensible default size; everything else is the consumer's responsibility."
        >
          <div className="flex flex-col gap-3.5">
            {/* Icon prefix */}
            <SoftField value="With an icon" onChange={() => {}} label="Demo">
              <SoftField.Prefix>
                <IconMapPin />
              </SoftField.Prefix>
            </SoftField>

            {/* Emoji prefix */}
            <SoftField value="Hoshinoya Tokyo" onChange={() => {}} label="Demo">
              <SoftField.Prefix>
                <span className="text-base leading-none">🏨</span>
              </SoftField.Prefix>
            </SoftField>

            {/* Button suffix */}
            <SoftField
              value="https://hoshinoya.com/tokyo"
              onChange={() => {}}
              label="Booking link"
            >
              <SoftField.Prefix>
                <IconLink />
              </SoftField.Prefix>
              <SoftField.Suffix>
                <Button variant="ghost">
                  <span>open</span>
                </Button>
              </SoftField.Suffix>
            </SoftField>

            {/* Text badge suffix */}
            <SoftField value="" onChange={() => {}} label="Notes">
              <SoftField.Suffix>
                <span className="text-[10px] uppercase tracking-[0.06em] font-medium text-ink-soft bg-surface-soft px-2 py-0.5 rounded-pill">
                  optional
                </span>
              </SoftField.Suffix>
            </SoftField>
          </div>
        </StoryFrame>

        <StoryFrame
          name="Multiline · textarea"
          description="Setting `multiline` turns the field into a textarea with a generous border radius and min-height. Slots still work."
        >
          <SoftField
            multiline
            value=""
            onChange={() => {}}
            label="Notes"
            placeholder="A few words about this stay…"
            maxLength={240}
          />
        </StoryFrame>

        <StoryFrame
          name="Width adapts to container"
          description="No max-width. SoftField fills its container."
        >
          <div className="flex flex-col gap-3">
            <div className="w-[280px] border border-dashed border-border rounded-md p-3">
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint mb-2">
                Container 280px
              </div>
              <SoftField
                value=""
                onChange={() => {}}
                label="Name"
                placeholder="Type here…"
              />
            </div>
            <div className="w-full border border-dashed border-border rounded-md p-3">
              <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint mb-2">
                Full-width container
              </div>
              <SoftField
                value=""
                onChange={() => {}}
                label="Name"
                placeholder="Type here…"
              />
            </div>
          </div>
        </StoryFrame>
      </StoryPage>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Lodging form demo · uses three SoftField instances together
───────────────────────────────────────────────────────────────── */
function LodgingFormDemo() {
  const [name, setName] = useState("Hoshinoya Tokyo");
  const [address, setAddress] = useState("Chiyoda-ku, Otemachi 1-9-1");
  const [url, setUrl] = useState("https://hoshinoya.com/tokyo");

  return (
    <div className="flex flex-col gap-3.5">
      <SoftField
        value={name}
        onChange={setName}
        label="Lodging name"
        placeholder="Name of the lodging"
        maxLength={80}
      />
      <SoftField
        value={address}
        onChange={setAddress}
        label="Address"
        placeholder="Street, city"
        autoComplete="off"
      >
        <SoftField.Prefix>
          <IconMapPin />
        </SoftField.Prefix>
        <SoftField.Suffix>
          <Button variant="outline">
            <IconMapPin />
            <span>map</span>
          </Button>
        </SoftField.Suffix>
      </SoftField>
      <SoftField
        value={url}
        onChange={setUrl}
        label="Booking link"
        placeholder="Booking URL, lodging website"
        type="url"
      >
        <SoftField.Prefix>
          <IconLink />
        </SoftField.Prefix>
      </SoftField>
    </div>
  );
}
