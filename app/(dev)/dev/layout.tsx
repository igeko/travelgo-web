import { notFound } from "next/navigation";

/**
 * /dev — dev-only area. The prod gate lives here so it protects every
 * sub-segment (the component sandbox in (components)/ and the GoAgent area
 * in agent/), each of which brings its own shell via a nested layout.
 */
export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_DEV_SANDBOX !== "1"
  ) {
    notFound();
  }

  return <>{children}</>;
}
