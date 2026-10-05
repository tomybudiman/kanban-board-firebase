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

import authService, {
  type AuthUser,
} from "@/features/auth/services/authService";
import usersService from "@/features/auth/services/usersService";

export interface AuthContextValue {
  user: AuthUser | null;
  // Kept apart from user because Firebase updates the same user object when the email gets verified, which alone would not re-render anything.
  isEmailVerified: boolean;
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
 * @description Listens to Firebase Auth once for the whole app (it sits in the root layout), so the sign-in state is kept while moving between pages. Every time the signed-in user or their token changes, it works out whether the email counts as verified and brings /users/{uid} up to date.
 */
export default function AuthProvider({
  children,
}: AuthProviderProps): ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isEmailVerified, setEmailVerifiedState] = useState<boolean>(false);
  const [isLoading, setLoadingState] = useState<boolean>(true);

  useEffect((): (() => void) => {
    // Checking the token takes a moment, and Firebase can report a newer change meanwhile (e.g. a sign-out); only the newest change may update the state.
    let latestChange: number = 0;

    /**
     * @description Applies one change reported by Firebase Auth.
     */
    const onChangeUser: (nextUser: AuthUser | null) => Promise<void> = async (
      nextUser: AuthUser | null,
    ): Promise<void> => {
      latestChange += 1;
      const change: number = latestChange;
      let isVerified: boolean = false;
      if (nextUser) {
        try {
          isVerified = await authService.hasVerifiedEmail(nextUser);
        } catch (error: unknown) {
          console.error("Gagal memeriksa status verifikasi email:", error);
        }
      }
      if (change !== latestChange) {
        return;
      }
      setUser(nextUser);
      setEmailVerifiedState(isVerified);
      setLoadingState(false);
      if (nextUser) {
        usersService.syncUserProfile(nextUser).catch((error: unknown): void => {
          console.error("Gagal menyimpan data user ke Firebase:", error);
        });
      }
    };

    return authService.subscribeAuth((nextUser: AuthUser | null): void => {
      void onChangeUser(nextUser);
    });
  }, []);

  // Main Render
  return (
    <AuthContext value={{ user, isEmailVerified, isLoading }}>
      {children}
    </AuthContext>
  );
}
