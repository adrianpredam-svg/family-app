import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

// Everything needs a login except the login page/API, health check and PWA files.
const PUBLIC = [/^\/login/, /^\/api\/auth\/login/, /^\/api\/health/, /^\/manifest\.webmanifest$/, /^\/sw\.js$/, /^\/icons\//];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  const id = await readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (id) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png).*)"],
};
