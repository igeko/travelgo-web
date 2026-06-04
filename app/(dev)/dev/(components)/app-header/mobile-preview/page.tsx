"use client";

import { useState } from "react";
import { AppHeader, type AppHeaderTab } from "@/features/app/AppHeader";

/**
 * Minimal page rendered inside an <iframe> at 390px width.
 * No sandbox chrome — just the header on the body background.
 */
export default function AppHeaderMobilePreview() {
  const [activeTab, setActiveTab] = useState<AppHeaderTab>("day-by-day");
  const [editMode, setEditMode]   = useState(false);

  return (
    <AppHeader
      activeNav="trips"
      tripName="Japan 2026"
      tripProgress="Day 4 of 21"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      editMode={editMode}
      onToggleEditMode={() => setEditMode((v) => !v)}
      initials="ED"
    />
  );
}
