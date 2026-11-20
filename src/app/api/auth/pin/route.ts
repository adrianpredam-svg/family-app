import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getCurrentMember } from "@/lib/auth";
import { badRequest, json, unauthorized } from "@/lib/api";
import { afterFailure, isLocked, minutesLeft } from "@/modules/auth/lockout";
import { changePinSchema } from "@/modules/auth/pin";

/** A logged-in member changes their own PIN. The current PIN must be right (wrong tries count towards the lock). */
export async function POST(req: Request) {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const parsed = changePinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const db = getDb();
  const now = new Date();

  const [attempt] = await db.select().from(schema.loginAttempts).where(eq(schema.loginAttempts.memberId, me.id));
  if (isLocked(attempt, now)) return json({ error: `Too many wrong PINs. Try again in ${minutesLeft(attempt!, now)} min.` }, 429);

  const [member] = await db.select({ pinHash: schema.members.pinHash }).from(schema.members).where(eq(schema.members.id, me.id));
  if (!member || !(await bcrypt.compare(parsed.data.current, member.pinHash))) {
    const next = afterFailure(attempt, now);
    await db.insert(schema.loginAttempts).values({ memberId: me.id, ...next }).onConflictDoUpdate({ target: schema.loginAttempts.memberId, set: next });
    return json({ error: next.lockedUntil ? "Too many wrong PINs. Locked for 10 minutes." : "Your current PIN is not right" }, next.lockedUntil ? 429 : 400);
  }

  await db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.memberId, me.id));
  await db
    .update(schema.members)
    .set({ pinHash: await bcrypt.hash(parsed.data.next, 10), pinSetByMember: true })
    .where(eq(schema.members.id, me.id));
  return json({ ok: true });
}
