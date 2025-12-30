import { NextResponse, type NextRequest } from "next/server";
import { parseSessionStringEdge } from "@/lib/auth/session-edge";

const PUBLIC_PATHS = ["/", "/login"];
const ADMIN_ONLY = ["/admin"];
const RECIPIENT_ONLY = ["/inbox", "/letter"];

const pathMatches = (pathname: string, prefixes: string[]) =>
  prefixes.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(.*)$/);

  if (isPublic) {
    return NextResponse.next();
  }

  const session = await parseSessionStringEdge(req.cookies.get("session")?.value);

  if (pathMatches(pathname, ADMIN_ONLY)) {
    if (!session || session.role !== "admin") {
      const url = new URL("/login", req.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (pathMatches(pathname, RECIPIENT_ONLY)) {
    if (!session || session.role !== "recipient") {
      const url = new URL("/login", req.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
