import type { ReactNode } from "react";
import { Icon } from "@/components/common/Icon";
import "@/app/login/login.css";

export function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="login-page">
    <section className="login-art" aria-label="Focus Hub 소개">
      <div className="auth-brand"><span className="brand-mark"><Icon name="target" /></span>Focus Hub</div>
      <div className="login-copy"><span className="eyebrow">A LITTLE MORE FOCUSED, EVERY DAY</span><h1>머릿속은 가볍게.<br />하루는 선명하게.</h1><p>일정과 할 일, 목표와 기록.<br />흩어져 있던 하루를 하나의 공간에 모으세요.</p><div className="auth-features"><span><Icon name="calendar" /> 하루의 흐름을 한눈에</span><span><Icon name="tasks" /> 중요한 일부터 차근차근</span><span><Icon name="habit" /> 작은 습관을 꾸준하게</span></div></div>
      <span className="auth-art-footer">작은 진전이 쌓이는 나만의 워크스페이스.</span>
    </section>
    <section className="login-panel">{children}</section>
  </main>;
}
