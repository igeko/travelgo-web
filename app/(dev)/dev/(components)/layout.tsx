import { SandboxShell } from "./_components/SandboxShell";

/**
 * Component sandbox shell — wraps every component page under /dev with the
 * left (nav) + right (controls) sidebars. The GoAgent area (/dev/agent) lives
 * in a sibling segment with its own shell, so it is NOT wrapped by this.
 */
export default function ComponentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SandboxShell>{children}</SandboxShell>;
}
