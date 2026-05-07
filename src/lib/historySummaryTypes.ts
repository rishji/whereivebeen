import type { PlaceScope } from "./placeState";
import type { CityVisitSummary } from "./cityTypes";
import type { AirportVisitSummary } from "./airportTypes";

export type DateSpan = {
  startDate: string;
  endDate: string;
  dayCount: number;
};

export type VisitedPlaceSummary = {
  key: string;
  scope: PlaceScope;
  id: string | number;
  name: string;
  dayCount: number;
  firstDate: string;
  lastDate: string;
  dateSpans: DateSpan[];
};

export type DailyVisitSummary = {
  date: string;
  sourceCounts: { maps: number; photos: number };
  placeKeys: string[];
  cityKeys: string[];
};

export type LocationHistoryPlaceSummary = {
  schemaVersion: 1;
  generatedAt: string;
  sourcePointCount: number;
  sourcePointCounts?: { maps: number; photos: number };
  places: VisitedPlaceSummary[];
  cities?: CityVisitSummary[];
  airports?: AirportVisitSummary[];
  dailyVisits?: DailyVisitSummary[];
};
