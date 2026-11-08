import { describe, expect, it } from "vitest";
import { safeNext } from "./next";

const app = "https://preda.app";
const domain = ".preda.app";

describe("safeNext", () => {
  it("allows local paths and our sub-domains", () => {
    expect(safeNext("/?task=3", app, domain)).toBe("/?task=3");
    expect(safeNext("https://home.preda.app/preda-home-drawing/plan", app, domain)).toBe(
      "https://home.preda.app/preda-home-drawing/plan",
    );
  });
  it("blocks other sites and tricks", () => {
    expect(safeNext("https://evil.com/", app, domain)).toBe("/");
    expect(safeNext("https://preda.app.evil.com/", app, domain)).toBe("/");
    expect(safeNext("//evil.com", app, domain)).toBe("/");
    expect(safeNext("http://home.preda.app/", app, domain)).toBe("/");
    expect(safeNext("https://home.preda.app/", app, undefined)).toBe("/");
  });
});
