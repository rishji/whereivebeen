import type { PlaceScope } from "./placeState";

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

export type LocationHistoryPlaceSummary = {
  schemaVersion: 1;
  generatedAt: string;
  sourcePointCount: number;
  places: VisitedPlaceSummary[];
};
