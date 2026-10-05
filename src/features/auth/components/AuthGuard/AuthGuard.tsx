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

// Who may see a page: "guest" = signed out (login, register), "unverified" = signed in but the email is not verified yet (verify-email), "verified" = signed in with a verified email (the board).
export type AuthGuardAccess = "guest" | "unverified" | "verified";

interface AuthGuardProps {
  access: AuthGuardAccess;
  children: ReactNode;
}

// The page each kind of user belongs on; anyone on a page meant for someone else is sent here.
const homePaths: Record<AuthGuardAccess, string> = {
  guest: "/login",
  unverified: "/verify-email",
  verified: "/",
};

/**
 * @description Shows its pages only to the users allowed by access, and moves everyone else to the page for their state: signed-out users to /login, users who haven't verified their email to /verify-email, and verified users to the board. While Firebase is still checking the saved session, a loading screen is shown instead, so the wrong page never flashes. This only decides what is shown; the data itself is protected by the database rules.
 */
export default function AuthGuard({
  access,
  children,
}: AuthGuardProps): ReactElement {
  const { user, isEmailVerified, isLoading }: AuthContextValue = useAuth();
  const router: ReturnType<typeof useRouter> = useRouter();
  let userState: AuthGuardAccess = "guest";
  if (user) {
    userState = isEmailVerified ? "verified" : "unverified";
  }
  const isAllowed: boolean = !isLoading && userState === access;
  const redirectPath: string = homePaths[userState];

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
