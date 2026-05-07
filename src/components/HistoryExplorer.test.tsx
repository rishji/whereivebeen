import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { HistoryExplorer } from "./HistoryExplorer";
import type { LocationHistoryPlaceSummary } from "../lib/historySummaryTypes";

const visitedCountry = {
  key: "country:840",
  scope: "country" as const,
  id: "840",
  name: "United States",
  dayCount: 1,
  firstDate: "2026-05-03",
  lastDate: "2026-05-03",
  dateSpans: [{ startDate: "2026-05-03", endDate: "2026-05-03", dayCount: 1 }]
};

function createSummary(
  overrides: Partial<LocationHistoryPlaceSummary> = {}
): LocationHistoryPlaceSummary {
  return {
    schemaVersion: 1,
    generatedAt: "2026-05-04T00:00:00.000Z",
    sourcePointCount: 1,
    places: [visitedCountry],
    cities: [],
    ...overrides
  };
}

describe("HistoryExplorer daily calendar", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createStorage()
    });
  });

  it("prompts owners to re-import when daily visit data is missing", () => {
    render(<HistoryExplorer initialSummary={createSummary()} session={null} />);

    expect(screen.getByRole("heading", { name: "Calendar unavailable" })).toBeInTheDocument();
    expect(screen.getByText("Re-import your location history to add day-by-day visit data to this summary."))
      .toBeInTheDocument();
  });

  it("requires a start date when only an end date is entered", async () => {
    const user = userEvent.setup();

    render(<HistoryExplorer initialSummary={createSummary({ dailyVisits: [] })} session={null} />);

    await user.clear(screen.getByLabelText("Start date"));
    await user.type(screen.getByLabelText("End date"), "05-03-2026");

    expect(screen.getByRole("alert")).toHaveTextContent("Start date is required.");
  });

  it("rejects date ranges longer than 7,305 days", async () => {
    const user = userEvent.setup();

    render(<HistoryExplorer initialSummary={createSummary({ dailyVisits: [] })} session={null} />);

    await user.clear(screen.getByLabelText("Start date"));
    await user.type(screen.getByLabelText("Start date"), "01-01-2000");
    await user.type(screen.getByLabelText("End date"), "01-02-2021");

    expect(screen.getByRole("alert")).toHaveTextContent("Select 7,305 days or fewer.");
    expect(screen.getByText("Enter a valid date or choose a day on the calendar.")).toBeInTheDocument();
  });

  it("labels calendar days with full date, data availability, selection, and month state", () => {
    render(
      <HistoryExplorer
        initialSummary={createSummary({
          dailyVisits: [
            {
              date: "2026-05-03",
              placeKeys: ["country:840"],
              cityKeys: [],
              sourceCounts: { maps: 2, photos: 0 }
            }
          ]
        })}
        session={null}
      />
    );

    expect(
      screen.getByRole("button", {
        name: "May 3, 2026, has data, selected"
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "April 26, 2026, missing data, outside May 2026"
      })
    ).toBeInTheDocument();
  });

  it("renders airport summaries", () => {
    render(
      <HistoryExplorer
        initialSummary={createSummary({
          airports: [
            {
              key: "airport:SFO",
              iata: "SFO",
              name: "San Francisco International Airport",
              municipality: "San Francisco",
              countryCode: "US",
              dayCount: 206,
              pointCount: 639,
              visitPointCount: 255,
              firstDate: "2013-01-01",
              lastDate: "2026-01-01",
              dateSpans: [{ startDate: "2026-01-01", endDate: "2026-01-01", dayCount: 1 }]
            }
          ],
          dailyVisits: []
        })}
        session={null}
      />
    );

    expect(screen.getByRole("heading", { name: /Airports 1/ })).toBeInTheDocument();
    expect(screen.getByText("SFO")).toBeInTheDocument();
    expect(screen.getByText("San Francisco International Airport")).toBeInTheDocument();
    expect(screen.getByText("206 days")).toBeInTheDocument();
  });
});

function createStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value)
  };
}
