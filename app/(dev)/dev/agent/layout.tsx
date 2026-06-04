import { AgentShell } from "./_components/AgentShell";

/**
 * GoAgent area shell. Sibling of the component sandbox under /dev — the prod
 * gate is inherited from /dev/layout.tsx, here we only bring the agent shell.
 */
export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgentShell>{children}</AgentShell>;
}
