import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthCookieName, verifyAuthCookieValueEdge } from "@/lib/auth-edge";

const PUBLIC_PATH_PREFIXES = ["/_next", "/favicon", "/images", "/robots.txt", "/sitemap.xml"];

function isPublicPath(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/api/auth")) return true;
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const cookieName = getAuthCookieName();
  const raw = req.cookies.get(cookieName)?.value;
  const session = await verifyAuthCookieValueEdge(raw);

  if (session) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/:path*"]
};
