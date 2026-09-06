import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Biology Entelloq — Understand living systems",
    template: "%s · Biology Entelloq",
  },
  description:
    "Investigate biology through guided virtual practicals, interactive anatomy, explanatory feedback, and accessible 2D and 3D learning.",
  keywords: ["biology", "virtual laboratory", "anatomy", "interactive learning", "virtual dissection"],
  openGraph: {
    title: "Biology Entelloq — Understand living systems",
    description: "Guided virtual biology practicals built for observation, explanation, and mastery.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
