export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Each sub-route (trips/[id], trips/, etc.) handles its own header
  // via nested layouts, so we just provide the shell here.
  return <div className="min-h-screen flex flex-col bg-bg">{children}</div>;
}
