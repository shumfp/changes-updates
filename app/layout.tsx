import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Registration Changes",
  description: "Shared registration change tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
