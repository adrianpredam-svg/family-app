import { pgTable, serial, text, timestamp, boolean, integer, index, pgEnum } from "drizzle-orm/pg-core";

/** A family member. Created by the seed script from FAMILY_MEMBERS (no signup yet). */
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#2563eb"),
  pinHash: text("pin_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Wrong-PIN counter per member, used to lock a member for a while after too many tries. */
export const loginAttempts = pgTable("login_attempts", {
  memberId: integer("member_id")
    .primaryKey()
    .references(() => members.id, { onDelete: "cascade" }),
  failedCount: integer("failed_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});

/** A task in the calendar. created_by = owner, assigned_to = target person. Times stored in UTC. */
export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    notes: text("notes"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    allDay: boolean("all_day").notNull().default(false),
    createdBy: integer("created_by")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    assignedTo: integer("assigned_to")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    done: boolean("done").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tasks_starts_at_idx").on(t.startsAt), index("tasks_assigned_to_idx").on(t.assignedTo)],
);

export const notificationType = pgEnum("notification_type", ["assigned", "updated", "done"]);

/** In-app notifications (the bell). */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    actorId: integer("actor_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    type: notificationType("type").notNull(),
    message: text("message").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_member_idx").on(t.memberId, t.readAt)],
);

/** Browser/phone push subscriptions, one per device. */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Member = typeof members.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
