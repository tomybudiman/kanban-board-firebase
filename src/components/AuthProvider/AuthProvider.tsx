"use client";

import {
  type Context,
  type ReactElement,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import authService, { type AuthUser } from "@/services/authService";

export interface AuthContextValue {
  user: AuthUser | null;
  // True until Firebase has restored (or ruled out) a session saved in the browser; user is always null until then.
  isLoading: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext: Context<AuthContextValue | null> =
  createContext<AuthContextValue | null>(null);

// Gives any component inside <AuthProvider> the signed-in user.
export function useAuth(): AuthContextValue {
  const auth: AuthContextValue | null = useContext(AuthContext);
  if (!auth) {
    throw new Error("useAuth() must be used inside <AuthProvider>");
  }
  return auth;
}

/**
 * @description Listens to Firebase Auth once for the whole app (it sits in the root layout), so the sign-in state is kept while moving between pages.
 */
export default function AuthProvider({
  children,
}: AuthProviderProps): ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setLoadingState] = useState<boolean>(true);

  useEffect((): (() => void) => {
    return authService.subscribeAuth((nextUser: AuthUser | null): void => {
      setUser(nextUser);
      setLoadingState(false);
    });
  }, []);

  // Main Render
  return <AuthContext value={{ user, isLoading }}>{children}</AuthContext>;
}
