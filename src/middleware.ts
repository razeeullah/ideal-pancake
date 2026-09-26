import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAMES = ["pos_session", "__Host-pos_session"] as const;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and internal routes are excluded by matcher, but guard here too
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) =>
    request.cookies.has(name),
  );

  // Unauthenticated user attempting to access protected app routes
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  if (!hasSessionCookie && !isAuthRoute && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated user visiting login page
  if (hasSessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
