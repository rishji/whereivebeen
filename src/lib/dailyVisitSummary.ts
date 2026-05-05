import type { CityVisitSummary } from "./cityTypes";
import type { DailyVisitSummary, DateSpan, VisitedPlaceSummary } from "./historySummaryTypes";

export type DailySourceCounts = { maps: number; photos: number };

type DailyVisitInput = {
  places: VisitedPlaceSummary[];
  cities?: CityVisitSummary[];
  sourceCountsByDate?: Record<string, DailySourceCounts>;
};

export type DailyVisitRangeResult = {
  startDate: string;
  endDate: string;
  totalDays: number;
  daysWithData: number;
  missingDays: number;
  sourceCounts: DailySourceCounts;
  places: Array<{ key: string; dayCount: number }>;
  cities: Array<{ key: string; dayCount: number }>;
};

export function buildDailyVisits({
  places,
  cities = [],
  sourceCountsByDate = {}
}: DailyVisitInput): DailyVisitSummary[] {
  const visitsByDate = new Map<string, { placeKeys: Set<string>; cityKeys: Set<string> }>();

  for (const place of places) {
    for (const date of expandDateSpans(place.dateSpans)) {
      getOrCreateDailyVisitDraft(visitsByDate, date).placeKeys.add(place.key);
    }
  }

  for (const city of cities) {
    for (const date of expandDateSpans(city.dateSpans)) {
      getOrCreateDailyVisitDraft(visitsByDate, date).cityKeys.add(city.key);
    }
  }

  for (const date of Object.keys(sourceCountsByDate)) {
    getOrCreateDailyVisitDraft(visitsByDate, date);
  }

  return Array.from(visitsByDate.entries())
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, visit]) => ({
      date,
      sourceCounts: sourceCountsByDate[date] ?? { maps: 0, photos: 0 },
      placeKeys: Array.from(visit.placeKeys).sort(),
      cityKeys: Array.from(visit.cityKeys).sort()
    }));
}

export function queryDailyVisits(
  dailyVisits: DailyVisitSummary[],
  date: string
): DailyVisitSummary | null {
  return dailyVisits.find((dailyVisit) => dailyVisit.date === date) ?? null;
}

export function queryDailyVisitRange(
  dailyVisits: DailyVisitSummary[],
  startDate: string,
  endDate: string
): DailyVisitRangeResult {
  const dates = expandDateRange(startDate, endDate);
  const dateSet = new Set(dates);
  const matchedVisits = dailyVisits.filter((dailyVisit) => dateSet.has(dailyVisit.date));
  const placeCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  const sourceCounts: DailySourceCounts = { maps: 0, photos: 0 };

  for (const dailyVisit of matchedVisits) {
    sourceCounts.maps += dailyVisit.sourceCounts.maps;
    sourceCounts.photos += dailyVisit.sourceCounts.photos;
    incrementCounts(placeCounts, dailyVisit.placeKeys);
    incrementCounts(cityCounts, dailyVisit.cityKeys);
  }

  return {
    startDate,
    endDate,
    totalDays: dates.length,
    daysWithData: matchedVisits.length,
    missingDays: dates.length - matchedVisits.length,
    sourceCounts,
    places: sortCounts(placeCounts),
    cities: sortCounts(cityCounts)
  };
}

export function expandDateSpans(spans: DateSpan[]): string[] {
  return spans.flatMap((span) => expandDateRange(span.startDate, span.endDate));
}

export function expandDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let currentDate = parseDate(startDate);
  const finalDate = parseDate(endDate);

  while (currentDate <= finalDate) {
    dates.push(formatDate(currentDate));
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

function getOrCreateDailyVisitDraft(
  visitsByDate: Map<string, { placeKeys: Set<string>; cityKeys: Set<string> }>,
  date: string
): { placeKeys: Set<string>; cityKeys: Set<string> } {
  const existingVisit = visitsByDate.get(date);
  if (existingVisit) {
    return existingVisit;
  }

  const visit = { placeKeys: new Set<string>(), cityKeys: new Set<string>() };
  visitsByDate.set(date, visit);
  return visit;
}

function incrementCounts(counts: Map<string, number>, keys: string[]): void {
  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
}

function sortCounts(counts: Map<string, number>): Array<{ key: string; dayCount: number }> {
  return Array.from(counts.entries())
    .map(([key, dayCount]) => ({ key, dayCount }))
    .sort((left, right) => right.dayCount - left.dayCount || left.key.localeCompare(right.key));
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
