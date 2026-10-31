import { describe, expect, it } from "vitest";
import { isValidStorageKey } from "./storage-key";

describe("isValidStorageKey", () => {
  it("accepts server generated keys", () => {
    expect(isValidStorageKey("products/0192f0aa-1b2c/0192f0aa-ffff.webp")).toBe(true);
  });

  it("rejects traversal, absolute paths and hidden files", () => {
    for (const key of [
      "../etc/passwd",
      "/etc/passwd",
      "products/../../x.webp",
      ".env",
      "products/.hidden.webp",
      "a//b.webp",
      "a\\b.webp",
      "image",
    ]) {
      expect(isValidStorageKey(key), key).toBe(false);
    }
  });
});
