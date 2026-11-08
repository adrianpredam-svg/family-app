import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { getCurrentMember } from "@/lib/auth";
import { badRequest, json, unauthorized } from "@/lib/api";

const subscription = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Saves this device's push subscription for the logged-in member. */
export async function POST(req: Request) {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const parsed = subscription.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const { endpoint, keys } = parsed.data;
  const values = { memberId: me.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: req.headers.get("user-agent") };
  await getDb()
    .insert(schema.pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: values });
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const parsed = z.object({ endpoint: z.string().url() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const s = schema.pushSubscriptions;
  await getDb().delete(s).where(and(eq(s.endpoint, parsed.data.endpoint), eq(s.memberId, me.id)));
  return json({ ok: true });
}
