import { TripGoProvider } from "@/features/go/TripGoContext";
import type { ReactNode } from "react";

export default function TripLayout({ children }: { children: ReactNode }) {
  return (
    <TripGoProvider>
      {children}
    </TripGoProvider>
  );
}
