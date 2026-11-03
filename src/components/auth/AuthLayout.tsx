import type { ReactNode } from "react";
import { AssetImage } from "@/components/common/AssetImage";
import { DASHBOARD_ASSETS } from "@/lib/assets";
import "@/app/login/login.css";

export function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="login-page">
    <section className="login-art" aria-label="Focus Hub 소개">
      <div className="login-image"><AssetImage src={DASHBOARD_ASSETS.hero} alt="달빛 아래 야간 작업실" priority sizes="55vw" /></div>
      <div className="login-copy"><span className="eyebrow">YOUR QUIET WORKSPACE</span><h1>하루의 흐름을<br />나답게 정리하세요.</h1><p>할 일부터 배운 것까지, 매일의 작은 진전을 한곳에.</p></div>
    </section>
    <section className="login-panel">{children}</section>
  </main>;
}
