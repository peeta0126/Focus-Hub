"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { authErrorMessage } from "@/lib/auth";

type Mode = "login" | "signup" | "forgot" | "reset" | "resend";
type Field = "email" | "password" | "confirmPassword";
const copy: Record<Mode, { title: string; description: string; button: string }> = {
  login: { title: "다시 만나서 반가워요", description: "개인 작업 공간에 로그인하세요.", button: "로그인" },
  signup: { title: "나만의 작업 공간 만들기", description: "이메일 인증 후 빈 개인 작업 공간에서 시작하세요.", button: "회원가입" },
  forgot: { title: "비밀번호를 잊으셨나요?", description: "가입한 이메일로 비밀번호 재설정 링크를 보내드립니다.", button: "재설정 메일 보내기" },
  reset: { title: "새 비밀번호 설정", description: "계정에 사용할 새 비밀번호를 입력해주세요.", button: "비밀번호 변경" },
  resend: { title: "이메일 인증 안내", description: "가입한 이메일을 입력하면 인증 메일을 다시 보내드립니다. 스팸함도 확인해주세요.", button: "인증 메일 재전송" },
};

export function AuthForm({ mode, initialError = "" }: { mode: Mode; initialError?: string }) {
  const router = useRouter();
  const busy = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [completed, setCompleted] = useState(false);
  const hasPassword = mode === "login" || mode === "signup" || mode === "reset";
  const needsConfirmation = mode === "signup" || mode === "reset";
  const content = copy[mode];

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || cooldown > 0 || completed) return;
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");
    const confirmPassword = String(values.get("confirmPassword") ?? "");
    const nextErrors: Partial<Record<Field, string>> = {};
    if (mode !== "reset" && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) nextErrors.email = "올바른 이메일을 입력해주세요.";
    const minLength = mode === "login" ? 6 : 8;
    if (hasPassword && password.length < minLength) nextErrors.password = `비밀번호는 ${minLength}자 이상이어야 합니다.`;
    if (needsConfirmation && password !== confirmPassword) nextErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      form.querySelector<HTMLInputElement>(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus();
      return;
    }

    busy.current = true;
    setIsSubmitting(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) { setError("인증 서비스 연결 설정을 확인해주세요. 관리자에게 문의해주세요."); return; }
      const confirmationUrl = `${window.location.origin}/auth/confirm`;
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) { setError(authErrorMessage(authError)); return; }
        // Discard the previous account's in-memory UI and router cache.
        window.location.replace("/");
        return;
      }
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: confirmationUrl } });
        if (authError) { setError(authErrorMessage(authError)); return; }
        if (data.session) { window.location.replace("/"); return; }
        form.reset();
        setCompleted(true);
        setMessage("가입 요청을 접수했습니다. 새로 가입한 이메일로 보낸 인증 링크를 열면 작업 공간으로 이동합니다. 이미 가입했다면 로그인하거나 비밀번호를 재설정해주세요.");
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${confirmationUrl}?type=recovery` });
        if (authError) { setError(authErrorMessage(authError)); return; }
        setCooldown(60);
        setMessage("가입된 이메일이면 비밀번호 재설정 메일을 발송했습니다. 받은편지함과 스팸함을 확인해주세요.");
      } else if (mode === "resend") {
        const { error: authError } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: confirmationUrl } });
        if (authError) { setError(authErrorMessage(authError)); return; }
        setCooldown(60);
        setMessage("인증 대기 중인 계정이면 새 인증 메일을 발송했습니다. 가장 최근 메일의 링크를 이용해주세요.");
      } else {
        const { data: { user }, error: sessionError } = await supabase.auth.getUser();
        if (sessionError || !user) { setError("재설정 세션이 만료되었습니다. 비밀번호 재설정 메일을 다시 요청해주세요."); return; }
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) { setError(authErrorMessage(authError)); return; }
        form.reset();
        setCompleted(true);
        setMessage("비밀번호를 변경했습니다. 새 비밀번호로 다음 로그인부터 이용할 수 있습니다.");
        router.refresh();
      }
    } catch {
      setError("인증 서비스에 연결하지 못했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.");
    } finally {
      busy.current = false;
      setIsSubmitting(false);
    }
  }

  function field(name: Field, label: string, type: string, autoComplete: string) {
    return <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} className="input" autoComplete={autoComplete} required disabled={isSubmitting || completed}
        aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : name === "password" && needsConfirmation ? "password-hint" : undefined}
        minLength={name === "password" ? mode === "login" ? 6 : 8 : undefined} placeholder={name === "email" ? "you@example.com" : "••••••••"} />
      {name === "password" && needsConfirmation && <small id="password-hint" className="auth-hint">8자 이상 입력해주세요.</small>}
      {errors[name] && <small id={`${name}-error`} className="field-error">{errors[name]}</small>}
    </div>;
  }

  return <form className="login-form" method="post" onSubmit={submit} noValidate aria-busy={isSubmitting}>
    <div className="brand-title"><span className="brand-mark" aria-hidden="true">☾</span><span>Focus Hub</span></div>
    <div><h2>{content.title}</h2><p>{content.description}</p></div>
    {mode !== "reset" && field("email", "이메일", "email", "email")}
    {hasPassword && field("password", mode === "reset" ? "새 비밀번호" : "비밀번호", "password", mode === "login" ? "current-password" : "new-password")}
    {needsConfirmation && field("confirmPassword", "비밀번호 확인", "password", "new-password")}
    {error && <p className="login-error" role="alert">{error}</p>}
    {message && <p className="auth-success" role="status">{message}</p>}
    {!completed && <button type="submit" className="button primary login-button" disabled={isSubmitting || cooldown > 0}>{isSubmitting ? "처리 중…" : cooldown > 0 ? `${cooldown}초 후 다시 전송` : content.button}</button>}
    <nav className="auth-links" aria-label="계정 메뉴">
      {mode === "login" ? <><Link href="/signup">회원가입</Link><Link href="/forgot-password">비밀번호 찾기</Link></> : mode === "reset" ? <><Link href="/">대시보드로 이동</Link><Link href="/forgot-password">재설정 메일 다시 요청</Link></> : <Link href="/login">로그인으로 돌아가기</Link>}
      {mode !== "reset" && mode !== "resend" && <Link href="/auth/resend">인증 메일 재전송</Link>}
      {mode === "signup" && <Link href="/forgot-password">비밀번호 찾기</Link>}
    </nav>
  </form>;
}
