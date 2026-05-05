import { describe, expect, it } from "vitest";
import {
  assistDateInput,
  formatIsoDateForInput,
  isDateRangeValid,
  parseDateInput
} from "./dateInput";

describe("date input helpers", () => {
  it("formats compact date input with month, day, and year dashes", () => {
    expect(assistDateInput("05122024")).toBe("05-12-2024");
  });

  it("normalizes separated date input to dash separators", () => {
    expect(assistDateInput("05/12/2024")).toBe("05-12-2024");
  });

  it("formats partial compact date input with month and day dash", () => {
    expect(assistDateInput("0512")).toBe("05-12");
  });

  it("parses mm-dd-yyyy input to an ISO date", () => {
    expect(parseDateInput("05-12-2024")).toEqual({ isoDate: "2024-05-12" });
  });

  it("rejects impossible calendar dates", () => {
    expect(parseDateInput("02-31-2024")).toEqual({
      error: "Enter a real date in mm-dd-yyyy format."
    });
  });

  it("formats ISO dates for input display", () => {
    expect(formatIsoDateForInput("2024-05-12")).toBe("05-12-2024");
  });

  it("validates ordered ISO date ranges", () => {
    expect(isDateRangeValid("2024-05-12", "2024-05-14")).toBe(true);
    expect(isDateRangeValid("2024-05-14", "2024-05-12")).toBe(false);
  });
});
