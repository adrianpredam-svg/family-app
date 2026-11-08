import type { NotificationKind } from "./rules";

export function notificationText(kind: NotificationKind, actorName: string, title: string, when: string): string {
  switch (kind) {
    case "assigned":
      return `${actorName} added “${title}” for you · ${when}`;
    case "updated":
      return `${actorName} changed “${title}” · ${when}`;
    case "done":
      return `${actorName} finished “${title}” ✓`;
  }
}
