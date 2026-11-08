import { and, eq, gt, lt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getCurrentMember } from "@/lib/auth";
import { badRequest, json, unauthorized } from "@/lib/api";
import { createTaskSchema, rangeSchema } from "@/modules/tasks/validation";
import { toDTO } from "@/modules/tasks/repo";
import { notifyTaskEvent } from "@/modules/notifications/service";

export const dynamic = "force-dynamic";

/** Tasks overlapping [start, end). */
export async function GET(req: Request) {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const range = rangeSchema.safeParse(params);
  if (!range.success) return badRequest(range.error);
  const rows = await getDb()
    .select()
    .from(schema.tasks)
    .where(and(lt(schema.tasks.startsAt, range.data.end), gt(schema.tasks.endsAt, range.data.start)))
    .orderBy(schema.tasks.startsAt);
  return json(rows.map(toDTO));
}

export async function POST(req: Request) {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const parsed = createTaskSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const db = getDb();

  const [target] = await db.select({ id: schema.members.id }).from(schema.members).where(eq(schema.members.id, parsed.data.assignedTo));
  if (!target) return badRequest("Unknown family member");

  const [task] = await db
    .insert(schema.tasks)
    .values({ ...parsed.data, notes: parsed.data.notes || null, createdBy: me.id })
    .returning();

  await notifyTaskEvent({ kind: "created", actorId: me.id, task }, task);
  return json(toDTO(task), 201);
}
