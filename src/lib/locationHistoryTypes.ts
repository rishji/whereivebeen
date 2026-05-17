// GeoPoint can be a plain "geo:lat,lng" string (iPhone) or {latLng: "lat°, lng°"} (Android)
export type GeoPointValue = string | { latLng: string };

export type LocationHistoryEntry = {
  startTime?: string;
  endTime?: string;
  visit?: {
    topCandidate?: {
      placeID?: string;  // iPhone export
      placeId?: string;  // Android export
      placeLocation?: GeoPointValue;
      probability?: string | number;
      semanticType?: string;
    };
    probability?: string | number;
  };
  activity?: {
    start?: GeoPointValue;
    end?: GeoPointValue;
    distanceMeters?: string | number;
    topCandidate?: {
      type?: string;
      probability?: string | number;
    };
  };
  timelinePath?: Array<{
    point?: string;
    durationMinutesOffsetFromStartTime?: string;  // iPhone: offset from segment start
    time?: string;                                  // Android: absolute timestamp
  }>;
};

export type LocationPointSource = "visit" | "activity-start" | "activity-end" | "timeline-path" | "photo";

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
