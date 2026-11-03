import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/forgot-password?error=session");
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/forgot-password?error=session");
  return <AuthLayout><AuthForm mode="reset" /></AuthLayout>;
}
