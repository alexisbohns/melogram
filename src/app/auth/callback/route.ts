import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth redirect target. Exchanges the `?code` from Google (via Supabase)
 * for a session, writing the auth cookies, then returns to `?next` or `/`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Supabase OAuth callback failed", error.message);
      return NextResponse.redirect(`${origin}/?auth_error=1`);
    }
  }

  // `next` is a relative path we control; keep it same-origin.
  const safeNext = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
