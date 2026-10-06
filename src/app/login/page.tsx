"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import "./login.css";
import { AssetImage } from "@/components/common/AssetImage";
import { DASHBOARD_ASSETS } from "@/lib/assets";

const schema = z.object({ email: z.email("올바른 이메일을 입력해주세요."), password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다.") });
type LoginValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(schema) });
  const login = async (values: LoginValues) => {
    setError("");
    const supabase = createClient();
    if (!supabase) { setError("Supabase 환경 변수를 설정하면 로그인을 사용할 수 있습니다."); return; }
    const { error: authError } = await supabase.auth.signInWithPassword(values);
    if (authError) { setError("이메일 또는 비밀번호를 확인해주세요."); return; }
    router.replace("/"); router.refresh();
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSubmit(login)(event);
  };
  return <main className="login-page"><section className="login-art"><div className="login-image"><AssetImage src={DASHBOARD_ASSETS.hero} alt="달빛 아래 야간 작업실" priority sizes="55vw" /></div><div className="login-copy"><span className="eyebrow">YOUR QUIET WORKSPACE</span><h1>하루의 흐름을<br />나답게 정리하세요.</h1><p>할 일부터 배운 것까지, 매일의 작은 진전을 한곳에.</p></div></section><section className="login-panel"><form className="login-form" method="post" onSubmit={submit}><div className="brand-title"><span className="brand-mark">☾</span><span>Focus Hub</span></div><div><h2>다시 만나서 반가워요</h2><p>개인 작업 공간에 로그인하세요.</p></div><div className="field"><label htmlFor="email">이메일</label><input id="email" type="email" className="input" autoComplete="email" placeholder="you@example.com" {...register("email")} />{errors.email && <small className="field-error">{errors.email.message}</small>}</div><div className="field"><label htmlFor="password">비밀번호</label><input id="password" type="password" className="input" autoComplete="current-password" placeholder="••••••••" {...register("password")} />{errors.password && <small className="field-error">{errors.password.message}</small>}</div>{error && <p className="login-error" role="alert">{error}</p>}<button type="submit" className="button primary login-button" disabled={isSubmitting}>{isSubmitting ? "로그인 중…" : "로그인"}</button><small className="login-note">개인용 계정은 Supabase Dashboard에서 생성할 수 있어요.</small></form></section></main>;
}
