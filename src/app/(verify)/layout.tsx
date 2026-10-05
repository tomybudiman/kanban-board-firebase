import { type ReactElement } from "react";

import AuthGuard from "@/features/auth/components/AuthGuard/AuthGuard";

// Pages in (verify) are for signed-in users who haven't verified their email yet; others are sent to /login or the board.
export default function VerifyLayout({
  children,
}: LayoutProps<"/">): ReactElement {
  return <AuthGuard access="unverified">{children}</AuthGuard>;
}
