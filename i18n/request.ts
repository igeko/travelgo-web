import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { SUPPORTED_LOCALES, LOCALE_COOKIE } from "./locales";

function detectFromAcceptLanguage(acceptLanguage: string): string {
  // "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7" → ["it", "it", "en", "en"]
  const tags = acceptLanguage
    .split(",")
    .map((s) => s.trim().split(";")[0].split("-")[0].toLowerCase());
  return tags.find((tag) => SUPPORTED_LOCALES.includes(tag as SupportedLocale)) ?? "en";
}

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: string =
    fromCookie && SUPPORTED_LOCALES.includes(fromCookie as SupportedLocale)
      ? fromCookie
      : detectFromAcceptLanguage(headerStore.get("accept-language") ?? "");

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
