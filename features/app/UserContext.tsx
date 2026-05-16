"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppUser = {
  id: string;
  email: string | undefined;
  fullName: string;
  avatarUrl: string;
  initials: string;
};

type UserContextValue = {
  user: AppUser | null;
  roles: string[];
  isLoggedIn: boolean;
  isDev: boolean;
  isTester: boolean;
  isAdmin: boolean;
  loading: boolean;
};

const UserContext = createContext<UserContextValue>({
  user: null,
  roles: [],
  isLoggedIn: false,
  isDev: false,
  isTester: false,
  isAdmin: false,
  loading: true,
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<UserContextValue>({
    user: null,
    roles: [],
    isLoggedIn: false,
    isDev: false,
    isTester: false,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(({ user, roles }: { user: AppUser | null; roles: string[] }) => {
        if (!user) {
          setValue({ user: null, roles: [], isLoggedIn: false, isDev: false, isTester: false, isAdmin: false, loading: false });
          return;
        }
        const initials = user.fullName
          .split(/\s+/)
          .map((w: string) => w[0]?.toUpperCase() ?? "")
          .slice(0, 2)
          .join("");
        setValue({
          user: { ...user, initials },
          roles,
          isLoggedIn: true,
          isDev: roles.includes("dev"),
          isTester: roles.some((r) => ["tester", "dev", "admin"].includes(r)),
          isAdmin: roles.some((r) => ["admin", "dev"].includes(r)),
          loading: false,
        });
      })
      .catch(() => {
        setValue((v) => ({ ...v, loading: false }));
      });
  }, []);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
