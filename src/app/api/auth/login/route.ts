import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { badRequest, json } from "@/lib/api";
import { afterFailure, isLocked, minutesLeft } from "@/modules/auth/lockout";

const body = z.object({ memberId: z.number().int().positive(), pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits") });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const { memberId, pin } = parsed.data;
  const db = getDb();
  const now = new Date();

  const [member] = await db.select().from(schema.members).where(eq(schema.members.id, memberId));
  if (!member) return json({ error: "Unknown family member" }, 404);

  const [attempt] = await db.select().from(schema.loginAttempts).where(eq(schema.loginAttempts.memberId, memberId));
  if (isLocked(attempt, now)) {
    return json({ error: `Too many wrong PINs. Try again in ${minutesLeft(attempt!, now)} min.` }, 429);
  }

  if (!(await bcrypt.compare(pin, member.pinHash))) {
    const next = afterFailure(attempt, now);
    await db
      .insert(schema.loginAttempts)
      .values({ memberId, ...next })
      .onConflictDoUpdate({ target: schema.loginAttempts.memberId, set: next });
    const msg = next.lockedUntil ? "Too many wrong PINs. Locked for 10 minutes." : "Wrong PIN, try again";
    return json({ error: msg }, next.lockedUntil ? 429 : 401);
  }

  await db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.memberId, memberId));
  await startSession(memberId);
  return json({ ok: true });
}
