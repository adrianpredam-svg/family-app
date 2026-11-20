import { describe, expect, it } from "vitest";
import { changePinSchema } from "./pin";

const ok = (current: string, next: string, confirm = next) => changePinSchema.safeParse({ current, next, confirm }).success;

describe("changing a PIN", () => {
  it("accepts a new 4-6 digit PIN typed twice", () => {
    expect(ok("4321", "2580")).toBe(true);
    expect(ok("4321", "975310")).toBe(true);
  });
  it("rejects mismatches, wrong lengths, letters and the same PIN", () => {
    expect(ok("4321", "2580", "2581")).toBe(false);
    expect(ok("4321", "258")).toBe(false);
    expect(ok("4321", "1234567")).toBe(false);
    expect(ok("4321", "25a0")).toBe(false);
    expect(ok("2580", "2580")).toBe(false);
  });
  it("rejects PINs that are too easy to guess", () => {
    expect(ok("4321", "0000")).toBe(false);
    expect(ok("4321", "1234")).toBe(false);
    expect(ok("4321", "123456")).toBe(false);
  });
});
