import { type ReactElement } from "react";

import AuthGuard from "@/features/auth/components/AuthGuard/AuthGuard";

// Login and register are for signed-out users only; signed-in users are sent to /verify-email or the board.
export default function AuthLayout({
  children,
}: LayoutProps<"/">): ReactElement {
  return <AuthGuard access="guest">{children}</AuthGuard>;
}
