import { describe, expect, it } from "vitest";
import { airportRecords } from "./airportData";

describe("airport data", () => {
  it("includes known airports used by overrides and reports", () => {
    expect(airportRecords.some((airport) => airport.iata === "SFO")).toBe(true);
    expect(airportRecords.some((airport) => airport.iata === "MEX")).toBe(true);
    expect(airportRecords.some((airport) => airport.iata === "EWR")).toBe(true);
    expect(airportRecords.some((airport) => airport.iata === "FRA")).toBe(true);
    expect(airportRecords.some((airport) => airport.iata === "MUC")).toBe(true);
    expect(airportRecords.some((airport) => airport.iata === "MIA")).toBe(true);
  });
});
