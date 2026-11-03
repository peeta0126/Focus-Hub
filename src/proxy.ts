import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PUBLIC_AUTH_PATHS } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const authStartedAt = performance.now();
  const { data: { user } } = await supabase.auth.getUser();
  if (request.nextUrl.pathname === "/") {
    console.info(`[home-performance] proxy-auth: ${(performance.now() - authStartedAt).toFixed(1)} ms`);
  }
  const pathname = request.nextUrl.pathname;
  let destination: string | null = null;
  if (!user && !PUBLIC_AUTH_PATHS.includes(pathname)) destination = pathname === "/reset-password" ? "/forgot-password?error=session" : "/login";
  if (user && (pathname === "/login" || pathname === "/signup")) destination = "/";
  if (destination) {
    const redirect = NextResponse.redirect(new URL(destination, request.url));
    // Preserve refreshed or cleared session cookies on redirects as well.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|assets/).*)"],
};
