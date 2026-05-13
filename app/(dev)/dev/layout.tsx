import { notFound } from "next/navigation";
import { SandboxShell } from "./_components/SandboxShell";

/**
 * Component sandbox — only accessible in dev (or with an explicit flag in prod).
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

  return <SandboxShell>{children}</SandboxShell>;
}
