"use client";

import { faSpinnerThird } from "@fortawesome/pro-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRouter } from "next/navigation";
import { type ReactElement, type ReactNode, useEffect } from "react";

import {
  type AuthContextValue,
  useAuth,
} from "@/features/auth/components/AuthProvider/AuthProvider";

import styles from "./AuthGuard.module.scss";

// "user": only signed-in users may see the pages (the board). "guest": only signed-out users (login and register).
export type AuthGuardAccess = "user" | "guest";

interface AuthGuardProps {
  access: AuthGuardAccess;
  children: ReactNode;
}

/**
 * @description Shows its pages only to the users allowed by access, and moves everyone else away: signed-out users to /login, signed-in users to /. While Firebase is still checking the saved session, a loading screen is shown instead, so the wrong page never flashes. This only decides what is shown; the data itself is protected by the database rules.
 */
export default function AuthGuard({
  access,
  children,
}: AuthGuardProps): ReactElement {
  const { user, isLoading }: AuthContextValue = useAuth();
  const router: ReturnType<typeof useRouter> = useRouter();
  const isSignedIn: boolean = user !== null;
  const isAllowed: boolean = !isLoading && isSignedIn === (access === "user");
  const redirectPath: string = access === "user" ? "/login" : "/";

  useEffect((): void => {
    // replace() instead of push(), so the Back button doesn't return to a page that redirects again.
    if (!isLoading && !isAllowed) {
      router.replace(redirectPath);
    }
  }, [isLoading, isAllowed, redirectPath, router]);

  if (!isAllowed) {
    return (
      <div role="status" className={styles.AuthGuard}>
        <FontAwesomeIcon icon={faSpinnerThird} spin />
        <p>Memuat...</p>
      </div>
    );
  }

  // Main Render
  return <>{children}</>;
}
