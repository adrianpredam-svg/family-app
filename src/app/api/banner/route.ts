import { and, eq, gt, isNull, lt, ne, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getCurrentMember } from "@/lib/auth";
import { badRequest, json, unauthorized } from "@/lib/api";
import { sendPushToMember } from "@/lib/push";
import { bannerTaskItems } from "@/modules/banner/schedule";
import { bannerMessageSchema, canRemoveMessage } from "@/modules/banner/validation";

export const dynamic = "force-dynamic";

/** Everything the banner should show for me right now. */
export async function GET() {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const db = getDb();
  const now = new Date();
  const m = schema.bannerMessages;
  const messages = await db
    .select()
    .from(m)
    .where(and(gt(m.expiresAt, now), or(isNull(m.toMember), eq(m.toMember, me.id), eq(m.fromMember, me.id))))
    .orderBy(m.createdAt);
  const t = schema.tasks;
  const tasks = await db
    .select()
    .from(t)
    .where(and(eq(t.banner, true), eq(t.done, false), gt(t.endsAt, now), lt(t.startsAt, new Date(now.getTime() + 50 * 3600_000))));
  return json({
    items: [
      ...bannerTaskItems(tasks, now),
      ...messages.map((x) => ({
        kind: "message" as const,
        id: x.id,
        text: x.text,
        from: x.fromMember,
        to: x.toMember,
        expiresAt: x.expiresAt.toISOString(),
        canRemove: canRemoveMessage(x, me.id),
      })),
    ],
  });
}

/** Write a banner message for one person (to) or everyone (to = null). They get a notification. */
export async function POST(req: Request) {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const parsed = bannerMessageSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const { text, to, hours } = parsed.data;
  const db = getDb();
  if (to !== null) {
    const [target] = await db.select({ id: schema.members.id }).from(schema.members).where(eq(schema.members.id, to));
    if (!target) return badRequest("Unknown family member");
  }
  const [msg] = await db
    .insert(schema.bannerMessages)
    .values({ fromMember: me.id, toMember: to, text, expiresAt: new Date(Date.now() + hours * 3600_000) })
    .returning();

  // Notify the receiver(s), never the writer.
  try {
    const recipients = to !== null
      ? [to].filter((id) => id !== me.id)
      : (await db.select({ id: schema.members.id }).from(schema.members).where(ne(schema.members.id, me.id))).map((r) => r.id);
    if (recipients.length) {
      const message = `📣 ${me.name}: ${text}`;
      await db.insert(schema.notifications).values(recipients.map((memberId) => ({ memberId, actorId: me.id, taskId: null, type: "banner" as const, message })));
      await Promise.all(recipients.map((id) => sendPushToMember(id, { title: "Preda Family", body: message, url: "/?banner=1", tag: `banner-${msg.id}` })));
    }
  } catch (err) {
    console.error("Banner notification failed", err);
  }
  return json({ id: msg.id }, 201);
}
