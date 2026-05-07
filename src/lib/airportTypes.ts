import type { DateSpan } from "./historySummaryTypes";

export type AirportRecord = {
  iata: string;
  name: string;
  municipality: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};

export type AirportVisitSummary = {
  key: string;
  iata: string;
  name: string;
  municipality: string;
  countryCode: string;
  dayCount: number;
  pointCount: number;
  visitPointCount: number;
  firstDate: string;
  lastDate: string;
  dateSpans: DateSpan[];
};
