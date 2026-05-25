import { UserProvider } from "@/features/app/UserContext";
import { YumejiFrame } from "@/features/yumeji/YumejiFrame";
import { LlmDebugPanel } from "@/features/debug/LlmDebugPanel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <YumejiFrame>{children}</YumejiFrame>
      <LlmDebugPanel />
    </UserProvider>
  );
}
