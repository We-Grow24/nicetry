import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes that require an authenticated session.
 * Any path that starts with one of these prefixes will redirect to /signin
 * when the visitor is not logged in.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/create",
  "/builder",
  "/game",
  "/video",
  "/anime",
  "/saas",
  "/admin",
];

/** GEO pricing: inject currency header for client consumption */
function getCurrencyHeader(request: NextRequest): { currency: string; symbol: string; rate: string } {
  // Vercel sets x-vercel-ip-country; fallback to "US"
  const country = request.headers.get("x-vercel-ip-country") ?? "US";
  if (country === "IN") {
    return { currency: "INR", symbol: "₹", rate: "1" };
  }
  return { currency: "USD", symbol: "$", rate: "83" };
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Inject GEO pricing headers for use in API routes / server components
  const geo = getCurrencyHeader(request);
  supabaseResponse.headers.set("x-currency", geo.currency);
  supabaseResponse.headers.set("x-currency-symbol", geo.symbol);
  supabaseResponse.headers.set("x-inr-rate", geo.rate);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session – keeps cookies up-to-date
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthPage =
    pathname.startsWith("/signin") || pathname.startsWith("/signup");

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all routes except Next.js internals and static files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
