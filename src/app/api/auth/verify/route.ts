import { NextResponse } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Used by the proxy (Traefik forwardAuth) in front of home.preda.app:
 * 200 = logged in with the family PIN, otherwise redirect to the login page and come back afterwards.
 * Only checks the signed cookie (no database call), because the proxy asks for every request.
 */
export async function GET(req: Request) {
  const cookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  const memberId = await readSessionToken(cookie);
  if (memberId) return new NextResponse(null, { status: 200, headers: { "X-Family-Member-Id": String(memberId) } });

  const h = req.headers;
  const original =
    h.get("x-forwarded-host") && `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host")}${h.get("x-forwarded-uri") ?? "/"}`;
  const appUrl = process.env.APP_URL || "https://preda.app";
  const login = new URL("/login", appUrl);
  if (original) login.searchParams.set("next", original);
  return NextResponse.redirect(login, 302);
}
