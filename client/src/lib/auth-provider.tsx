import { createContext, useContext, type ReactNode } from "react";

import { authClient } from "./auth-client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  refetch: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending, refetch } = authClient.useSession();

  const session = data ?? null;
  const user = (session?.user as AuthUser | undefined) ?? null;

  const value: AuthContextValue = {
    user,
    isLoaded: !isPending,
    isSignedIn: !!session,
    refetch: async () => {
      await refetch();
    },
    signOut: async () => {
      await authClient.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}