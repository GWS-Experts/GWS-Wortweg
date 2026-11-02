import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ProgressProvider } from "@/components/ProgressProvider";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "GWS-Wortweg – Learn German",
  description: "Learn German step by step with a story set in Marzling, Bavaria. Free.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Wortweg", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1c64b0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <ProgressProvider>
          <Header />
          <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">{children}</main>
        </ProgressProvider>
      </body>
    </html>
  );
}
