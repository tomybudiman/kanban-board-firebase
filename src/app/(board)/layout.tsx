import { type ReactElement } from "react";

import AuthGuard from "@/features/auth/components/AuthGuard/AuthGuard";

// Every page in (board) is for signed-in users with a verified email; others are sent to /login or /verify-email.
export default function BoardLayout({
  children,
}: LayoutProps<"/">): ReactElement {
  return <AuthGuard access="verified">{children}</AuthGuard>;
}
