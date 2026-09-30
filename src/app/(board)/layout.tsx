import { type ReactElement } from "react";

import AuthGuard from "@/features/auth/components/AuthGuard/AuthGuard";

// Every page in (board) is for signed-in users only; signed-out users are sent to /login.
export default function BoardLayout({
  children,
}: LayoutProps<"/">): ReactElement {
  return <AuthGuard access="user">{children}</AuthGuard>;
}
