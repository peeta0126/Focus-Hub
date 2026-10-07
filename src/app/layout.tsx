import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: { default: "Focus Hub", template: "%s · Focus Hub" },
  description: "일정, 목표, 습관과 학습을 한곳에서 관리하는 개인 생산성 OS",
  applicationName: "Focus Hub",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Focus Hub" },
};

export const viewport: Viewport = { themeColor: "#08111D", colorScheme: "dark", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><AppShell>{children}</AppShell><ServiceWorkerRegister /><Analytics /></body></html>;
}
