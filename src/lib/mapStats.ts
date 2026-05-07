import type { PlaceStatuses } from "./placeState";

// ISO numeric country IDs → continent bucket
const continentMap: Record<string, number[]> = {
  europe: [40,56,70,100,191,196,203,208,233,246,250,276,300,348,352,372,380,428,438,440,442,470,498,499,528,578,616,620,642,643,674,688,703,705,724,752,756,762,792,795,800,804,807,826],
  africa: [12,24,72,86,108,120,132,140,148,174,178,180,204,226,231,232,262,266,270,288,324,384,404,426,430,434,450,454,466,478,480,504,508,516,562,566,624,646,654,678,686,690,694,706,710,716,728,729,732,748,768,788,834,854,894],
  asia: [4,31,48,50,51,64,96,104,116,144,156,158,268,275,344,356,360,364,368,376,392,398,400,408,410,414,417,418,422,446,458,462,496,512,524,586,608,626,634,682,702,704,764,784,860,887],
  namerica: [28,44,52,84,124,132,136,188,192,212,214,308,332,340,388,484,531,533,558,591,630,659,662,670,780,840,850],
  samerica: [32,68,76,152,170,218,238,254,328,600,604,740,858,862],
  oceania: [36,90,162,184,242,258,296,316,520,540,548,554,570,583,584,585,598,776,798,882],
};

export type MapStats = {
  countries: number;
  continents: number;
  pctWorld: number;
  usStates: number;
  indiaStates: number;
  lived: number;
  wantToVisit: number;
  totalMarked: number;
};

export function computeMapStats(statuses: PlaceStatuses): MapStats {
  let countries = 0, lived = 0, usStates = 0, indiaStates = 0, wantToVisit = 0;
  const continentSet = new Set<string>();

  for (const [k, v] of Object.entries(statuses)) {
    if (k.startsWith("country:")) {
      const id = parseInt(k.split(":")[1], 10);
      if (v === "visited" || v === "lived") {
        countries++;
        for (const [c, ids] of Object.entries(continentMap)) {
          if (ids.includes(id)) continentSet.add(c);
        }
      }
      if (v === "lived") lived++;
      if (v === "wantToVisit") wantToVisit++;
    } else if (k.startsWith("us-state:")) {
      if (v === "visited" || v === "lived") usStates++;
      if (v === "lived") lived++;
    } else if (k.startsWith("india-state:")) {
      if (v === "visited" || v === "lived") indiaStates++;
      if (v === "lived") lived++;
    }
  }

  return {
    countries,
    continents: continentSet.size,
    pctWorld: Math.round((countries / 195) * 100),
    usStates,
    indiaStates,
    lived,
    wantToVisit,
    totalMarked: Object.keys(statuses).length,
  };
}
