import { SignJWT, jwtVerify } from "jose";

// Kept free of Next.js imports so it can run in middleware (edge) and in tests.
export const SESSION_COOKIE = "family_session";
export const SESSION_DAYS = 90;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET must be set (at least 16 characters)");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(memberId: number) {
  return new SignJWT({ sub: String(memberId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

/** Returns the member id from a valid token, or null. */
export async function readSessionToken(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
