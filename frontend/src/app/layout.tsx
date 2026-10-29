import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";
export const dynamic = "force-dynamic";
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});
export const metadata: Metadata = {
  title: { default: "Daybrief", template: "%s · Daybrief" },
  description:
    "Keep your team in the loop with short daily check-ins, a shared feed, and blockers everyone can see.",
  applicationName: "Daybrief",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable + " " + newsreader.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
