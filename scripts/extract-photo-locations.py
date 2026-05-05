#!/usr/bin/env python3
"""
Extract GPS location points from Google Photos Takeout zip files.

Reads directly from zips — nothing is extracted to disk.
Output is a single small JSON file (a few MB, not gigabytes).

Usage:
    python3 scripts/extract-photo-locations.py ~/Downloads/takeout-*.zip

Then import the output file (photo-locations.json) into the app
using the "Import photo-locations.json" button in the History tab.
"""

import json
import os
import sys
import zipfile
from datetime import datetime, timezone


def parse_geo(geo):
    if not isinstance(geo, dict):
        return None
    lat = geo.get("latitude", 0)
    lng = geo.get("longitude", 0)
    if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        return None
    if lat == 0 and lng == 0:
        return None
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None
    return lat, lng


def extract_point(data):
    if not isinstance(data, dict):
        return None

    taken = data.get("photoTakenTime")
    if not isinstance(taken, dict):
        return None
    ts_str = taken.get("timestamp")
    if not isinstance(ts_str, str):
        return None

    try:
        unix_secs = int(ts_str)
        if unix_secs <= 0:
            return None
        timestamp = datetime.fromtimestamp(unix_secs, tz=timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
    except (ValueError, OSError, OverflowError):
        return None

    # Prefer EXIF GPS (more precise) over sidecar GPS
    geo = parse_geo(data.get("geoDataExif")) or parse_geo(data.get("geoData"))
    if not geo:
        return None

    return {"timestamp": timestamp, "latitude": geo[0], "longitude": geo[1]}


def process_zip(zip_path, points):
    print(f"\nReading {os.path.basename(zip_path)} ...")
    try:
        with zipfile.ZipFile(zip_path) as zf:
            json_names = [n for n in zf.namelist() if n.endswith(".json")]
            total = len(json_names)
            found = 0
            print(f"  {total:,} JSON files found")

            for i, name in enumerate(json_names):
                if i > 0 and i % 10_000 == 0:
                    print(f"  {i:,} / {total:,} scanned, {found:,} points so far...")
                try:
                    with zf.open(name) as f:
                        data = json.load(f)
                    point = extract_point(data)
                    if point:
                        points.append(point)
                        found += 1
                except Exception:
                    pass

            print(f"  Done — {found:,} location points extracted")
    except zipfile.BadZipFile:
        print(f"  Skipping — not a valid zip file")
    except Exception as e:
        print(f"  Error: {e}")


def main():
    zip_paths = sys.argv[1:]
    if not zip_paths:
        print("Usage: python3 scripts/extract-photo-locations.py takeout-*.zip")
        sys.exit(1)

    points = []
    for path in zip_paths:
        process_zip(path, points)

    output_path = "photo-locations.json"
    with open(output_path, "w") as f:
        json.dump({"source": "google-photos-takeout", "points": points}, f, separators=(",", ":"))

    size_kb = os.path.getsize(output_path) // 1024
    print(f"\n{'='*50}")
    print(f"Done. {len(points):,} location points from {len(zip_paths)} zip file(s).")
    print(f"Output: {output_path} ({size_kb:,} KB)")
    print(f"Import this file using the 'Import photo-locations.json' button in the app.")


if __name__ == "__main__":
    main()
