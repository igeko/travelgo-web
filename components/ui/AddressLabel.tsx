import { cn } from "@/lib/cn";
import { compactAddress } from "@/lib/address";
import { IconMapPin } from "./icons";

/**
 * AddressLabel — compact, tidy rendering of a stored Google formatted address.
 *
 * Purely presentational + heuristic (see lib/address.ts): no network call.
 * Pass the raw `activities.location` string; it shows a pin + the meaningful
 * geographic tail, truncated. Styling (size/color) is driven by `className`.
 */
export function AddressLabel({
  address,
  max = 3,
  showIcon = true,
  className,
}: {
  address?: string | null;
  /** Max trailing segments to keep (city · region · country). Default 3. */
  max?: number;
  /** Show the leading pin icon. Default true. */
  showIcon?: boolean;
  className?: string;
}) {
  const text = compactAddress(address, max);
  if (!text) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 min-w-0", className)}>
      {showIcon && <IconMapPin className="size-3 shrink-0 text-ink-faint" />}
      <span className="truncate">{text}</span>
    </span>
  );
}
