import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";

export default function ResendPage() {
  return <AuthLayout><AuthForm mode="resend" /></AuthLayout>;
}
