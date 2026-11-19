import { z } from "zod";

/** How long a banner message stays, in hours. */
export const MESSAGE_HOURS = [4, 24, 72, 168] as const;

export const bannerMessageSchema = z.object({
  text: z.string().trim().min(1, "Please write a message").max(140, "Keep it short (140 letters)"),
  to: z.number().int().positive().nullable(), // null = everyone
  hours: z.number().refine((h) => (MESSAGE_HOURS as readonly number[]).includes(h)).default(24),
});

/** Who may remove a banner message: the person who wrote it and the person it is for. */
export function canRemoveMessage(m: { fromMember: number; toMember: number | null }, memberId: number) {
  return m.fromMember === memberId || m.toMember === memberId;
}
