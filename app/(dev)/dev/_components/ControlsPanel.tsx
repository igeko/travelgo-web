"use client";

/**
 * Sandbox controls panel — "Storybook controls" style.
 * Configure it by passing an array of groups with current values.
 */

export type RadioControl<T extends string = string> = {
  kind: "radio";
  id: string;
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
};

export type ToggleControl = {
  kind: "toggle";
  id: string;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
};

export type TextControl = {
  kind: "text";
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
};

export type NumberControl = {
  kind: "number";
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
};

export type DateControl = {
  kind: "date";
  id: string;
  label: string;
  /** ISO yyyy-MM-dd */
  value: string;
  onChange: (v: string) => void;
};

export type Control =
  | RadioControl
  | ToggleControl
  | TextControl
  | NumberControl
  | DateControl;

export type ControlGroup = {
  title: string;
  controls: Control[];
};

export function ControlsPanel({ groups }: { groups: ControlGroup[] }) {
  return (
    <div className="flex flex-col gap-6 p-5">
      <header>
        <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint">
          Sandbox
        </div>
        <h2 className="mt-1 text-sm font-medium text-ink">Controls</h2>
      </header>

      {groups.map((group) => (
        <section key={group.title} className="flex flex-col gap-3">
          <h3 className="text-[10px] font-medium tracking-[0.12em] uppercase text-ink-faint">
            {group.title}
          </h3>
          <div className="flex flex-col gap-3">
            {group.controls.map((c) => {
              switch (c.kind) {
                case "radio":
                  return <RadioField key={c.id} control={c} />;
                case "toggle":
                  return <ToggleField key={c.id} control={c} />;
                case "text":
                  return <TextField key={c.id} control={c} />;
                case "number":
                  return <NumberField key={c.id} control={c} />;
                case "date":
                  return <DateField key={c.id} control={c} />;
              }
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Field components
───────────────────────────────────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium text-ink-soft">{children}</label>
  );
}

const inputClass =
  "w-full h-8 px-2.5 rounded-md border border-border bg-surface text-[12px] text-ink focus:outline-none focus:border-ink transition-colors";

function RadioField({ control }: { control: RadioControl }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{control.label}</FieldLabel>
      <div className="flex flex-wrap gap-1">
        {control.options.map((opt) => {
          const active = opt.value === control.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => control.onChange(opt.value)}
              className={`
                px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border
                ${
                  active
                    ? "bg-ink text-white border-ink"
                    : "bg-surface text-ink border-border hover:border-border-strong"
                }
              `}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleField({ control }: { control: ToggleControl }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <span className="text-[11px] font-medium text-ink-soft">
        {control.label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={control.value}
        onClick={() => control.onChange(!control.value)}
        className={`
          relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors
          ${control.value ? "bg-orange" : "bg-border-strong"}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
            ${control.value ? "translate-x-4" : "translate-x-0.5"}
          `}
        />
      </button>
    </label>
  );
}

function TextField({ control }: { control: TextControl }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{control.label}</FieldLabel>
      <input
        type="text"
        value={control.value}
        placeholder={control.placeholder}
        onChange={(e) => control.onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function NumberField({ control }: { control: NumberControl }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{control.label}</FieldLabel>
      <input
        type="number"
        value={control.value}
        min={control.min}
        max={control.max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) control.onChange(v);
        }}
        className={inputClass}
      />
    </div>
  );
}

function DateField({ control }: { control: DateControl }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{control.label}</FieldLabel>
      <input
        type="date"
        value={control.value}
        onChange={(e) => control.onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}
