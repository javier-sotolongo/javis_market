import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, slugify } from "./slug";

describe("slugify", () => {
  it("produces URL-safe slugs", () => {
    expect(slugify("Café Molido 500 g")).toBe("cafe-molido-500-g");
    expect(slugify("  Salt & Pepper!! ")).toBe("salt-and-pepper");
    expect(slugify("---")).toBe("");
    expect(SLUG_PATTERN.test(slugify("Ñandú Premium 2x"))).toBe(true);
  });
});
