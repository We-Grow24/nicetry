import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Handles the Supabase email-confirmation / OAuth callback.
 * Supabase redirects here with ?code=... after the user clicks the
 * confirmation link in their email.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // After confirming email, also ensure the public.users row exists
      // (fallback in case the sign-up trigger hasn't run yet).
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("users").upsert(
          {
            id: user.id,
            email: user.email,
            credits: 100,
          },
          { onConflict: "id", ignoreDuplicates: true }
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to an error page if something went wrong
  return NextResponse.redirect(`${origin}/signin?error=callback_failed`);
}
