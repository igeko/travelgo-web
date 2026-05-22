import { UserProvider } from "@/features/app/UserContext";
import { YumejiFrame } from "@/features/yumeji/YumejiFrame";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <YumejiFrame>{children}</YumejiFrame>
    </UserProvider>
  );
}
