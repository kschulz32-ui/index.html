import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const heading = Bricolage_Grotesque({ variable: "--font-heading", subsets: ["latin"] });
const body = Instrument_Sans({ variable: "--font-body", subsets: ["latin"] });
const label = DM_Mono({ variable: "--font-label", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Sunday to Monday",
  description: "Turn Sunday's message into one small step each day this week.",
  applicationName: "Sunday to Monday",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1716" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${label.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
