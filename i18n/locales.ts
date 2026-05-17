export const SUPPORTED_LOCALES = ["en", "it"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_COOKIE = "travelgo-locale";

export const LOCALE_LABELS: Record<SupportedLocale, { name: string; flag: string }> = {
  en: { name: "English", flag: "🇬🇧" },
  it: { name: "Italiano", flag: "🇮🇹" },
};
