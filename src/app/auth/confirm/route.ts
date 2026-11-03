import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");
  // Fixed destinations prevent open redirects from email links.
  const destination = type === "recovery" ? "/reset-password" : "/";
  const failure = type === "recovery" ? "/forgot-password?error=session" : "/login?error=confirmation";
  const redirect = (path: string) => {
    // Relative Location preserves the browser's origin behind reverse proxies too.
    const response = new NextResponse(null, { status: 303, headers: { Location: path } });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };

  try {
    const supabase = await createClient();
    if (!supabase || params.has("error")) return redirect(failure);
    if (tokenHash && (type === "email" || type === "signup" || type === "recovery")) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (!error) return redirect(destination);
    } else if (code && (!type || type === "recovery")) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return redirect(destination);
    }
  } catch {
    // Never include tokens or provider errors in URLs or logs.
  }
  return redirect(failure);
}
