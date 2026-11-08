import webpush from "web-push";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

let configured: boolean | null = null;

/** True when VAPID keys are set. Without them the app still works, just without phone push. */
export function pushEnabled(): boolean {
  if (configured === null) {
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
    configured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
    if (configured) {
      webpush.setVapidDetails(VAPID_SUBJECT || "mailto:admin@example.com", VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
    }
  }
  return configured;
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Sends a push to every device of a member. Removes subscriptions the browser has revoked. */
export async function sendPushToMember(memberId: number, payload: PushPayload) {
  if (!pushEnabled()) return;
  const db = getDb();
  const subs = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.memberId, memberId));
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 },
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, s.id));
        } else {
          console.error("Push failed", status, (err as Error).message);
        }
      }
    }),
  );
}
