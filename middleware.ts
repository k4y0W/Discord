import { NextResponse } from "@/node_modules/next/server";
import type { NextRequest } from "@/node_modules/next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  const isLoggedIn = !!token;

  // If trying to access auth pages while logged in, redirect to home
  if (
    isLoggedIn &&
    (pathname.startsWith("/login") || pathname.startsWith("/register"))
  ) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // If trying to access protected pages (e.g., /home) without a token, redirect to login
  if (!isLoggedIn && pathname.startsWith("/home")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If trying to access root, redirect based on auth status
  if (pathname === "/") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/home/:path*"],
};
