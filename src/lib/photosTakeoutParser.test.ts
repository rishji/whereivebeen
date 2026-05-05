import { describe, expect, it } from "vitest";
import { parsePhotosSidecar } from "./photosTakeoutParser";

const validSidecar = {
  photoTakenTime: { timestamp: "1690824731" }, // 2023-07-31T18:52:11Z
  geoData: { latitude: 37.7749, longitude: -122.4194, altitude: 10 },
  geoDataExif: { latitude: 37.7750, longitude: -122.4195, altitude: 10 }
};

describe("parsePhotosSidecar", () => {
  it("converts Unix-seconds timestamp to ISO string", () => {
    const point = parsePhotosSidecar(validSidecar);
    expect(point).not.toBeNull();
    expect(point!.timestamp).toBe(new Date(1690824731 * 1000).toISOString());
  });

  it("prefers geoDataExif over geoData when both present and nonzero", () => {
    const point = parsePhotosSidecar(validSidecar);
    expect(point!.latitude).toBe(37.775);
    expect(point!.longitude).toBe(-122.4195);
  });

  it("falls back to geoData when geoDataExif is zero", () => {
    const sidecar = {
      ...validSidecar,
      geoDataExif: { latitude: 0, longitude: 0, altitude: 0 }
    };
    const point = parsePhotosSidecar(sidecar);
    expect(point!.latitude).toBe(37.7749);
    expect(point!.longitude).toBe(-122.4194);
  });

  it("returns null when both geoData and geoDataExif are zero (no location)", () => {
    const sidecar = {
      ...validSidecar,
      geoData: { latitude: 0, longitude: 0, altitude: 0 },
      geoDataExif: { latitude: 0, longitude: 0, altitude: 0 }
    };
    expect(parsePhotosSidecar(sidecar)).toBeNull();
  });

  it("returns null when geoData is missing entirely", () => {
    const sidecar = { photoTakenTime: { timestamp: "1690824731" } };
    expect(parsePhotosSidecar(sidecar)).toBeNull();
  });

  it("returns null when photoTakenTime is missing (album metadata.json)", () => {
    const albumMetadata = {
      title: "My Album",
      description: "",
      access: "anyone with the link",
      date: { timestamp: "1690824731", formatted: "Jul 31, 2023" },
      location: ""
    };
    expect(parsePhotosSidecar(albumMetadata)).toBeNull();
  });

  it("returns null when timestamp is zero or negative", () => {
    const sidecar = { ...validSidecar, photoTakenTime: { timestamp: "0" } };
    expect(parsePhotosSidecar(sidecar)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(parsePhotosSidecar(null)).toBeNull();
    expect(parsePhotosSidecar("string")).toBeNull();
    expect(parsePhotosSidecar(42)).toBeNull();
  });

  it("sets source to 'photo'", () => {
    const point = parsePhotosSidecar(validSidecar);
    expect(point!.source).toBe("photo");
  });

  it("uses geoDataExif alone when geoData is missing", () => {
    const sidecar = {
      photoTakenTime: { timestamp: "1690824731" },
      geoDataExif: { latitude: 48.8566, longitude: 2.3522, altitude: 35 }
    };
    const point = parsePhotosSidecar(sidecar);
    expect(point!.latitude).toBe(48.8566);
    expect(point!.longitude).toBe(2.3522);
  });
});
