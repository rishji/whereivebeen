import type { LocationPoint } from "./locationHistoryTypes";

type GeoData = {
  latitude?: unknown;
  longitude?: unknown;
  altitude?: unknown;
};

type PhotoSidecar = {
  photoTakenTime?: { timestamp?: unknown };
  geoData?: GeoData;
  geoDataExif?: GeoData;
};

function isNonzeroGeo(geo: GeoData): boolean {
  const lat = Number(geo.latitude);
  const lng = Number(geo.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
}

export function parsePhotosSidecar(json: unknown): LocationPoint | null {
  if (!json || typeof json !== "object") {
    return null;
  }

  const sidecar = json as PhotoSidecar;

  if (!sidecar.photoTakenTime || typeof sidecar.photoTakenTime.timestamp !== "string") {
    return null;
  }

  // Unix seconds as string → ISO 8601
  const unixSeconds = Number(sidecar.photoTakenTime.timestamp);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return null;
  }
  const timestamp = new Date(unixSeconds * 1000).toISOString();

  // Prefer EXIF GPS over sidecar GPS; skip if both are zero/missing
  const exif = sidecar.geoDataExif;
  const base = sidecar.geoData;

  const geo = exif && isNonzeroGeo(exif) ? exif : base && isNonzeroGeo(base) ? base : null;
  if (!geo) {
    return null;
  }

  const latitude = Number(geo.latitude);
  const longitude = Number(geo.longitude);

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return { timestamp, latitude, longitude, source: "photo" };
}

export async function parsePhotosSidecars(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<LocationPoint[]> {
  const jsonFiles = files.filter((f) => f.name.endsWith(".json"));
  const total = jsonFiles.length;
  const points: LocationPoint[] = [];
  const concurrency = 8;
  let index = 0;
  let done = 0;

  async function worker() {
    while (index < total) {
      const file = jsonFiles[index++];

      try {
        const text = await file.text();
        const json = JSON.parse(text) as unknown;
        const point = parsePhotosSidecar(json);
        if (point) {
          points.push(point);
        }
      } catch {
        // Malformed JSON or unreadable file — skip silently
      }

      done++;
      onProgress?.(done, total);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  return points;
}

type PreExtractedPoint = {
  timestamp?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

type PreExtractedFile = {
  source?: unknown;
  points?: unknown;
};

export function parsePreExtractedPhotoPoints(json: unknown): LocationPoint[] {
  if (!json || typeof json !== "object") {
    throw new Error("Invalid photo-locations.json format.");
  }

  const file = json as PreExtractedFile;
  const raw = Array.isArray(file.points) ? file.points : Array.isArray(json) ? json : null;

  if (!raw) {
    throw new Error("Expected a photo-locations.json file produced by the extract script.");
  }

  const points: LocationPoint[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const p = item as PreExtractedPoint;
    const timestamp = typeof p.timestamp === "string" ? p.timestamp : null;
    const latitude = typeof p.latitude === "number" ? p.latitude : null;
    const longitude = typeof p.longitude === "number" ? p.longitude : null;

    if (!timestamp || latitude === null || longitude === null) {
      continue;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      continue;
    }

    points.push({ timestamp, latitude, longitude, source: "photo" });
  }

  return points;
}
