import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: { default: "Focus Hub", template: "%s · Focus Hub" },
  description: "일정, 목표, 습관과 학습을 한곳에서 관리하는 개인 생산성 OS",
  applicationName: "Focus Hub",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Focus Hub" },
};

export const viewport: Viewport = { themeColor: "#08111D", colorScheme: "dark light", width: "device-width", initialScale: 1, viewportFit: "cover" };

const themeScript = `(function(){try{var p=localStorage.getItem('focus-hub-theme')||'dark';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme='dark'}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" data-theme="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><AppShell>{children}</AppShell><ServiceWorkerRegister /></body></html>;
}
