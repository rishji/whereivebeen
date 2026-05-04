import { describe, expect, it } from "vitest";
import {
  defaultUserProfile,
  normalizeDisplayName,
  parsePublicGalleryEntries,
  type PublicGalleryEntry
} from "./publicGallery";

describe("public gallery model", () => {
  it("keeps new profiles private by default", () => {
    expect(defaultUserProfile).toEqual({
      displayName: "Anonymous traveler",
      isPublic: false
    });
  });

  it("normalizes blank display names to the default label", () => {
    expect(normalizeDisplayName("   ")).toBe(defaultUserProfile.displayName);
    expect(normalizeDisplayName("  Rishi Mohnot  ")).toBe("Rishi Mohnot");
  });

  it("parses valid public gallery entries", () => {
    const entries: PublicGalleryEntry[] = [
      {
        userId: "user-1",
        displayName: "Rishi",
        mapStatuses: {
          "country:356": "visited"
        },
        historySummary: null,
        updatedAt: "2026-05-04T12:00:00.000Z"
      }
    ];

    expect(
      parsePublicGalleryEntries([
        {
          user_id: "user-1",
          display_name: "Rishi",
          map_payload: {
            "country:356": "visited"
          },
          history_payload: null,
          updated_at: "2026-05-04T12:00:00.000Z"
        }
      ])
    ).toEqual(entries);
  });

  it("filters malformed public gallery entries", () => {
    expect(
      parsePublicGalleryEntries([
        {
          user_id: "user-1",
          display_name: "Rishi",
          map_payload: {
            "country:356": "visited"
          },
          history_payload: null,
          updated_at: "2026-05-04T12:00:00.000Z"
        },
        {
          user_id: "user-2",
          display_name: "Broken",
          map_payload: {
            "country:840": "maybe"
          },
          history_payload: null,
          updated_at: "2026-05-04T12:00:00.000Z"
        }
      ])
    ).toHaveLength(1);
  });
});
