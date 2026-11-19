import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getCurrentMember } from "@/lib/auth";
import { badRequest, forbidden, json, notFound, unauthorized } from "@/lib/api";
import { MIN_TASK_MS, bannerTextFor, updateTaskSchema } from "@/modules/tasks/validation";
import { toDTO } from "@/modules/tasks/repo";
import { canDeleteTask, canEditTask } from "@/modules/tasks/permissions";
import { notifyTaskEvent } from "@/modules/notifications/service";

type Ctx = { params: Promise<{ id: string }> };

async function load(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) return null;
  const [task] = await getDb().select().from(schema.tasks).where(eq(schema.tasks.id, id));
  return task ?? null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const task = await load((await params).id);
  return task ? json(toDTO(task)) : notFound();
}

export async function PATCH(req: Request, { params }: Ctx) {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const before = await load((await params).id);
  if (!before) return notFound();
  if (!canEditTask(before, me.id)) return forbidden();

  const parsed = updateTaskSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error);
  const changes = parsed.data;
  const startsAt = changes.startsAt ?? before.startsAt;
  const endsAt = changes.endsAt ?? before.endsAt;
  if (endsAt <= startsAt) return badRequest("End must be after start");
  const allDay = changes.allDay ?? before.allDay;
  if (!allDay && +endsAt - +startsAt < MIN_TASK_MS) return badRequest("A task needs at least 15 minutes");

  const db = getDb();
  if (changes.assignedTo) {
    const [target] = await db.select({ id: schema.members.id }).from(schema.members).where(eq(schema.members.id, changes.assignedTo));
    if (!target) return badRequest("Unknown family member");
  }

  const [after] = await db
    .update(schema.tasks)
    .set({
      ...changes,
      notes: changes.notes === undefined ? undefined : changes.notes || null,
      bannerText:
        changes.banner === undefined && changes.bannerText === undefined
          ? undefined
          : bannerTextFor(changes.banner ?? before.banner, changes.bannerText !== undefined ? changes.bannerText : before.bannerText, changes.title ?? before.title),
      updatedAt: new Date(),
    })
    .where(eq(schema.tasks.id, before.id))
    .returning();

  // Ticking "done" is its own kind of news; any other change is an update.
  const onlyDoneChanged = Object.keys(changes).every((k) => k === "done");
  const onlyBannerChanged = Object.keys(changes).every((k) => k === "banner" || k === "bannerText");
  if (changes.done === true && !before.done && onlyDoneChanged) {
    await notifyTaskEvent({ kind: "done", actorId: me.id, task: after }, after);
  } else if (!onlyDoneChanged && !onlyBannerChanged) {
    await notifyTaskEvent({ kind: "updated", actorId: me.id, before, after }, after);
  }
  return json(toDTO(after));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await getCurrentMember();
  if (!me) return unauthorized();
  const task = await load((await params).id);
  if (!task) return notFound();
  if (!canDeleteTask(task, me.id)) return forbidden();
  await getDb().delete(schema.tasks).where(eq(schema.tasks.id, task.id));
  return json({ ok: true });
}
