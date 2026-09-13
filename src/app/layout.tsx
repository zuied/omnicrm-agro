import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OmniCRM Agro & Equipment",
  description: "Sistem CRM Agro B2B & B2C - Pipeline, Multi-Gudang, Approval Workflow, Kamera Demplot",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "OmniCRM Agro", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#047857",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-scroll-behavior="smooth" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-slate-100">{children}</body>
    </html>
  );
}