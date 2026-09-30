import type { Metadata } from "next";
import { type ReactElement } from "react";

import AuthForm from "@/features/auth/components/AuthForm/AuthForm";

export const metadata: Metadata = {
  title: "Masuk",
};

export default function LoginPage(): ReactElement {
  return <AuthForm mode="login" />;
}
