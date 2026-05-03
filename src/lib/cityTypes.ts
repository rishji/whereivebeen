import type { DateSpan } from "./historySummaryTypes";

export type CityRecord = {
  id: string;
  key: string;
  name: string;
  countryCode?: string;
  countryName?: string;
  latitude: number;
  longitude: number;
  population: number;
};

export type CityVisitSummary = {
  key: string;
  id: string;
  name: string;
  countryCode?: string;
  countryName?: string;
  population: number;
  dayCount: number;
  pointCount: number;
  firstDate: string;
  lastDate: string;
  dateSpans: DateSpan[];
};

export type CityHistorySummary = {
  schemaVersion: 1;
  generatedAt: string;
  sourcePointCount: number;
  cityCount: number;
  cities: CityVisitSummary[];
};
