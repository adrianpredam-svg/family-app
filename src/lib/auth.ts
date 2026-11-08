import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken, readSessionToken } from "@/lib/session";

export type PublicMember = { id: number; name: string; color: string };

/** The logged-in member, or null. Use in server components and route handlers. */
export async function getCurrentMember(): Promise<PublicMember | null> {
  const store = await cookies();
  const id = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const [m] = await getDb()
    .select({ id: schema.members.id, name: schema.members.name, color: schema.members.color })
    .from(schema.members)
    .where(eq(schema.members.id, id));
  return m ?? null;
}

export async function startSession(memberId: number) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(memberId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function listMembers(): Promise<PublicMember[]> {
  return getDb()
    .select({ id: schema.members.id, name: schema.members.name, color: schema.members.color })
    .from(schema.members)
    .orderBy(schema.members.name);
}
