import { describe, expect, it } from "vitest";
import {
  addMoney,
  centsToDecimalString,
  formatMoney,
  money,
  multiplyMoney,
  parseDecimalToCents,
  sumMoney,
} from "./money";

describe("money", () => {
  it("rejects non-integer cents", () => {
    expect(() => money(10.5)).toThrow(RangeError);
  });

  it("adds, multiplies and sums in cents", () => {
    expect(addMoney(money(199), money(1))).toEqual(money(200));
    expect(multiplyMoney(money(333), 3)).toEqual(money(999));
    expect(sumMoney([money(10), money(20), money(30)])).toEqual(money(60));
  });

  it("parses decimal input without floating point errors", () => {
    expect(parseDecimalToCents("0.1")).toBe(10);
    expect(parseDecimalToCents("19.99")).toBe(1999);
    expect(parseDecimalToCents("$1,234.5")).toBe(123450);
    expect(parseDecimalToCents("12")).toBe(1200);
    expect(parseDecimalToCents("1.999")).toBeNull();
    expect(parseDecimalToCents("-1")).toBeNull();
    expect(parseDecimalToCents("abc")).toBeNull();
  });

  it("formats for display and for forms", () => {
    expect(formatMoney(money(123456))).toBe("$1,234.56");
    expect(centsToDecimalString(5)).toBe("0.05");
    expect(centsToDecimalString(1999)).toBe("19.99");
  });
});
