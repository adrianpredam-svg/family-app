import { inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { sendPushToMember } from "@/lib/push";
import { shortWhen } from "@/lib/time";
import { recipientsFor, type TaskEvent } from "./rules";
import { notificationText } from "./messages";

type TaskInfo = { id: number; title: string; startsAt: Date; allDay: boolean };

/** Stores in-app notifications for a task event and sends phone pushes. Never throws. */
export async function notifyTaskEvent(event: TaskEvent, task: TaskInfo) {
  try {
    const recipients = recipientsFor(event);
    if (recipients.length === 0) return;
    const db = getDb();
    const [actor] = await db
      .select({ name: schema.members.name })
      .from(schema.members)
      .where(inArray(schema.members.id, [event.actorId]));
    const actorName = actor?.name ?? "Someone";
    const when = shortWhen(task.startsAt, task.allDay);

    const rows = recipients.map((r) => ({
      memberId: r.memberId,
      actorId: event.actorId,
      taskId: task.id,
      type: r.type,
      message: notificationText(r.type, actorName, task.title, when),
    }));
    await db.insert(schema.notifications).values(rows);

    await Promise.all(
      rows.map((r) =>
        sendPushToMember(r.memberId, {
          title: "Preda Family",
          body: r.message,
          url: `/?task=${task.id}`,
          tag: `task-${task.id}`,
        }),
      ),
    );
  } catch (err) {
    console.error("Notification failed", err);
  }
}
