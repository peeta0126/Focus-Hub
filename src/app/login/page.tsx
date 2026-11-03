import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <AuthLayout><AuthForm mode="login" initialError={error === "confirmation" ? "인증 링크가 만료되었거나 유효하지 않습니다. 인증 메일 또는 비밀번호 재설정 메일을 다시 요청해주세요." : ""} /></AuthLayout>;
}
