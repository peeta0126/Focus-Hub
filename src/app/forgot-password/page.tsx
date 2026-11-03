import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <AuthLayout><AuthForm mode="forgot" initialError={error === "session" ? "유효한 재설정 세션이 없습니다. 새 비밀번호 재설정 메일을 요청해주세요." : ""} /></AuthLayout>;
}
