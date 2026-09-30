import type { Metadata } from "next";
import { type ReactElement } from "react";

import AuthForm from "@/features/auth/components/AuthForm/AuthForm";

export const metadata: Metadata = {
  title: "Daftar",
};

export default function RegisterPage(): ReactElement {
  return <AuthForm mode="register" />;
}
