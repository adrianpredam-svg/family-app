import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/modules/pwa/RegisterServiceWorker";

export const metadata: Metadata = {
  title: "Preda Family",
  description: "Our family calendar and tasks",
  appleWebApp: { capable: true, title: "Family", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased font-sans">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
