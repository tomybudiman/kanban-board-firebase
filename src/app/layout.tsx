import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { type ReactElement } from "react";

import AuthProvider from "@/components/AuthProvider/AuthProvider";

import "./globals.scss";

// Font Awesome's CSS is imported above, so stop it from injecting the same CSS again at runtime (avoids huge icons on first load).
config.autoAddCss = false;

const inter = localFont({
  src: [
    { path: "./fonts/Inter-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Inter-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Inter-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Inter-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  // Pages set only their own name (e.g. "Masuk"); the template adds the app name after it.
  title: { default: "Kanban Board", template: "%s · Kanban Board" },
  description:
    "Kanban board sederhana berbasis Firebase Realtime Database dan Firebase Authentication.",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">): ReactElement {
  return (
    <html lang="id" className={inter.variable}>
      {/* Browser extensions such as Grammarly add attributes to <body> before React hydrates. suppressHydrationWarning ignores mismatches in <body>'s own attributes only; everything inside it is still checked. */}
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
