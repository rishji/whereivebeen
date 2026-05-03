import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import {
  parseGoogleLocationHistory,
  summarizeLocationPoints
} from "../src/lib/locationHistoryParser";
import type { PrivateLocationHistoryExport } from "../src/lib/locationHistoryTypes";

const inputPath = resolve(process.argv[2] ?? "/Users/rishi/Downloads/location-history.json");
const outputPath = resolve(process.argv[3] ?? "data/private/location-history-points.json");

async function main() {
  const rawJson = await readFile(inputPath, "utf8");
  const points = parseGoogleLocationHistory(JSON.parse(rawJson));
  const pointSummary = summarizeLocationPoints(points);
  const exportPayload: PrivateLocationHistoryExport = {
    schemaVersion: 1,
    summary: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      sourceFile: basename(inputPath),
      ...pointSummary
    },
    points
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(exportPayload, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        outputPath,
        pointCount: pointSummary.pointCount,
        firstTimestamp: pointSummary.firstTimestamp,
        lastTimestamp: pointSummary.lastTimestamp
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
