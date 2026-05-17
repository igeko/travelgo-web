"use client";

/**
 * TripViewers — mostra gli avatar degli altri utenti connessi alla trip.
 * Appare solo se c'è almeno un altro utente online.
 */

import type { TripViewer } from "@/hooks/useTripRealtime";

type Props = {
  viewers: TripViewer[];
  isConnected: boolean;
};

export function TripViewers({ viewers, isConnected }: Props) {
  if (!isConnected || viewers.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Dot online */}
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />

      {/* Avatar stack */}
      <div className="flex items-center -space-x-1.5">
        {viewers.slice(0, 4).map((v) => (
          <div
            key={v.userId}
            title={v.fullName}
            className="w-6 h-6 rounded-full ring-2 ring-surface shrink-0 overflow-hidden bg-ink flex items-center justify-center"
          >
            {v.avatarUrl ? (
              <img
                src={v.avatarUrl}
                alt={v.fullName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-white text-[9px] font-semibold select-none">
                {v.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </span>
            )}
          </div>
        ))}
        {viewers.length > 4 && (
          <div className="w-6 h-6 rounded-full ring-2 ring-surface bg-surface-soft flex items-center justify-center">
            <span className="text-[9px] text-ink-soft font-medium">+{viewers.length - 4}</span>
          </div>
        )}
      </div>

      <span className="text-[11px] text-ink-soft whitespace-nowrap">
        {viewers.length === 1
          ? `${viewers[0].fullName.split(" ")[0]} è online`
          : `${viewers.length} online`}
      </span>
    </div>
  );
}
