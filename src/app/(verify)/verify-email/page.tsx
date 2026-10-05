import type { Metadata } from "next";
import { type ReactElement } from "react";

import VerifyEmail from "@/features/auth/components/VerifyEmail/VerifyEmail";

export const metadata: Metadata = {
  title: "Verifikasi Email",
};

export default function VerifyEmailPage(): ReactElement {
  return <VerifyEmail />;
}
