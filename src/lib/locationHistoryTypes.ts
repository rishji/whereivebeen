export type LocationHistoryEntry = {
  startTime?: string;
  endTime?: string;
  visit?: {
    topCandidate?: {
      placeID?: string;
      placeLocation?: string;
      probability?: string;
      semanticType?: string;
    };
    probability?: string;
  };
  activity?: {
    start?: string;
    end?: string;
    distanceMeters?: string;
    topCandidate?: {
      type?: string;
      probability?: string;
    };
  };
  timelinePath?: Array<{
    point?: string;
    durationMinutesOffsetFromStartTime?: string;
  }>;
};

export type LocationPointSource = "visit" | "activity-start" | "activity-end" | "timeline-path";

export type LocationPoint = {
  timestamp: string;
  latitude: number;
  longitude: number;
  source: LocationPointSource;
  placeId?: string;
};

export type LocationHistorySummary = {
  schemaVersion: 1;
  generatedAt: string;
  sourceFile: string;
  pointCount: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
};

export type PrivateLocationHistoryExport = {
  schemaVersion: 1;
  summary: LocationHistorySummary;
  points: LocationPoint[];
};
