import { z } from "zod";

const PIN = z.string().regex(/^\d{4,6}$/, "A PIN has 4 to 6 numbers");

/** Changing your own PIN: the current one, the new one, and the new one again. */
export const changePinSchema = z
  .object({ current: PIN, next: PIN, confirm: z.string() })
  .refine((v) => v.next === v.confirm, { message: "The two new PINs are not the same", path: ["confirm"] })
  .refine((v) => v.next !== v.current, { message: "Choose a different PIN than the current one", path: ["next"] })
  .refine((v) => !/^(\d)\1+$/.test(v.next), { message: "Too easy to guess — don't use the same number everywhere", path: ["next"] })
  .refine((v) => !["1234", "12345", "123456", "4321", "654321"].includes(v.next), { message: "Too easy to guess — try another PIN", path: ["next"] });
