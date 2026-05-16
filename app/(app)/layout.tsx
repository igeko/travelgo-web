import { UserProvider } from "@/features/app/UserContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="min-h-screen flex flex-col bg-bg">{children}</div>
    </UserProvider>
  );
}
