import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getCurrentMember } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Latest 30 notifications for me + unread count. */
export async function GET() {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const db = getDb();
  const n = schema.notifications;
  const items = await db
    .select({ id: n.id, taskId: n.taskId, type: n.type, message: n.message, readAt: n.readAt, createdAt: n.createdAt, actorId: n.actorId })
    .from(n)
    .where(eq(n.memberId, me.id))
    .orderBy(desc(n.createdAt))
    .limit(30);
  const [{ unread }] = await db
    .select({ unread: sql<number>`count(*)::int` })
    .from(n)
    .where(and(eq(n.memberId, me.id), isNull(n.readAt)));
  return json({ unread, items });
}
