import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./Providers";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "StandupBot — Team workspace",
  description: "Daily progress, blockers, and digests for distributed teams.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
