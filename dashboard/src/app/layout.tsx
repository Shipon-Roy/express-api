import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PocketSchool | Admin dashboard",
  description: "Manage school users and monitor API activity.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
