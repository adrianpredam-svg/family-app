import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getCurrentMember } from "@/lib/auth";
import { json, notFound, unauthorized } from "@/lib/api";
import { canRemoveMessage } from "@/modules/banner/validation";

type Ctx = { params: Promise<{ id: string }> };

/** Remove a banner message (the writer or the receiver may do this). */
export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound();
  const db = getDb();
  const [msg] = await db.select().from(schema.bannerMessages).where(eq(schema.bannerMessages.id, id));
  if (!msg) return notFound();
  if (!canRemoveMessage(msg, me.id)) return json({ error: "Only the writer or the person it is for can remove this message" }, 403);
  await db.delete(schema.bannerMessages).where(eq(schema.bannerMessages.id, id));
  return json({ ok: true });
}
