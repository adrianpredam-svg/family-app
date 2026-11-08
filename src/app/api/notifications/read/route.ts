import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { getCurrentMember } from "@/lib/auth";
import { badRequest, json, unauthorized } from "@/lib/api";

const body = z.union([z.object({ all: z.literal(true) }), z.object({ ids: z.array(z.number().int()).min(1).max(100) })]);

export async function POST(req: Request) {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const n = schema.notifications;
  const mine = and(eq(n.memberId, me.id), isNull(n.readAt));
  await getDb()
    .update(n)
    .set({ readAt: new Date() })
    .where("ids" in parsed.data ? and(mine, inArray(n.id, parsed.data.ids)) : mine);
  return json({ ok: true });
}
