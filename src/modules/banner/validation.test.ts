import { describe, expect, it } from "vitest";
import { bannerMessageSchema, canRemoveMessage } from "./validation";
import { bannerTextFor } from "@/modules/tasks/validation";

describe("banner messages", () => {
  it("accepts a short message for one person or everyone", () => {
    expect(bannerMessageSchema.safeParse({ text: "Pizza tonight!", to: null, hours: 24 }).success).toBe(true);
    expect(bannerMessageSchema.safeParse({ text: "Call me", to: 2, hours: 4 }).success).toBe(true);
  });
  it("rejects empty, too long, or odd durations", () => {
    expect(bannerMessageSchema.safeParse({ text: " ", to: null, hours: 24 }).success).toBe(false);
    expect(bannerMessageSchema.safeParse({ text: "x".repeat(141), to: null, hours: 24 }).success).toBe(false);
    expect(bannerMessageSchema.safeParse({ text: "hi", to: null, hours: 5 }).success).toBe(false);
  });
  it("lets the writer and the receiver remove it", () => {
    expect(canRemoveMessage({ fromMember: 1, toMember: 2 }, 1)).toBe(true);
    expect(canRemoveMessage({ fromMember: 1, toMember: 2 }, 2)).toBe(true);
    expect(canRemoveMessage({ fromMember: 1, toMember: 2 }, 3)).toBe(false);
    expect(canRemoveMessage({ fromMember: 1, toMember: null }, 3)).toBe(false);
  });
  it("task banner text defaults to the title", () => {
    expect(bannerTextFor(true, "", "Dentist")).toBe("Dentist");
    expect(bannerTextFor(true, "Bring the folder", "Dentist")).toBe("Bring the folder");
    expect(bannerTextFor(false, "", "Dentist")).toBe(null);
  });
});
