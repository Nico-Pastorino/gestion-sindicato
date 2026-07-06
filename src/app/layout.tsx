import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
    default: "Sistema de Gestión Sindical",
    template: "%s | Sistema Sindical",
  },
  description: "Sistema de gestión de beneficios y afiliados sindicales",
  applicationName: "Sistema Sindical",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sistema Sindical",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16181f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full bg-[hsl(220,20%,97%)]">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
