# Location History Accuracy Research

Date: 2026-05-06

## Context

The daily history calendar showed Oakland on both 2026-02-28 and 2026-03-01, while Google Maps Timeline screenshots showed Oakland on 2026-02-28 but not 2026-03-01.

The investigation used the local raw point export at `data/private/location-history-points.json` and compared:

- Persisted summary before regeneration: `data/private/location-history-summary.json`
- Recomputed summary using current code
- Candidate city rules that may be worth applying later

No app code change was made as part of this research.

## Findings

There are two distinct accuracy issues:

1. Stale or off-by-one date data: the persisted summary had dates that no longer match a recomputation from raw points. The current `timestampToDate(timestamp, latitude, longitude)` logic resolves UTC timestamps using the GPS-local timezone, which fixes the Oakland 2026-03-01 case when the summary is regenerated.
2. Nearby-city false positives: the city summarizer currently counts all point sources, including `timeline-path`. Route samples can pass within the 50 km city match radius and create days for cities the user only passed near.

## Oakland Example

| Dataset / Rule | Oakland days | 2026-02-28 | 2026-03-01 |
| --- | ---: | --- | --- |
| Persisted summary before regeneration | 300 | yes | yes |
| Recomputed from raw points with current code | 207 | yes | no |
| Candidate: exclude `timeline-path` for cities | 157 | yes | no |
| Candidate: `visit` points only for cities | 138 | yes | no |

The raw Oakland-matched points include local timestamps such as `2026-02-28T16:41:14.179-08:00`, which is locally 2026-02-28 but UTC 2026-03-01. The old persisted summary appears to have counted this kind of point as the UTC date. Recomputing with the current code removes 2026-03-01 from Oakland.

## Aggregate City-Day Comparison

| Rule | Cities | City-days |
| --- | ---: | ---: |
| Persisted summary before regeneration | 181 | 6,396 |
| Recomputed with current code | 181 | 5,872 |
| Candidate: exclude `timeline-path` for cities | 151 | 4,955 |
| Candidate: `visit` points only for cities | 145 | 4,622 |

Selected city comparison:

| City | Persisted | Recomputed | No `timeline-path` | `visit` only |
| --- | ---: | ---: | ---: | ---: |
| San Francisco | 2,822 | 2,673 | 2,415 | 2,333 |
| Oakland | 300 | 207 | 157 | 138 |
| San Mateo | 499 | 371 | 300 | 272 |
| Pittsburgh | 375 | 370 | 242 | 191 |
| New York | 288 | 267 | 210 | 192 |
| London | 385 | 385 | 378 | 367 |
| San Jose | 118 | 88 | 63 | 57 |
| Dayton | 58 | 59 | 34 | 9 |
| Cleveland | 23 | 22 | 5 | 4 |
| Mesa | 33 | 34 | 19 | 17 |

```text
Total city-days
Persisted summary   6396 | #########################
Current recompute   5872 | #######################
No route points     4955 | ####################
Visits only         4622 | ##################
```

## Recommendation For Now

Use the recomputed summary with the current code. This fixes the observed Oakland date problem without changing city attribution behavior.

After regeneration, the app still uses the existing city matching rule:

- Countries/states: all point sources
- Cities: all point sources
- City match radius: 50 km

## Deferred Options

If city false positives remain a problem, evaluate these options:

1. Exclude `timeline-path` for cities only.
   - Pros: removes many route-only city matches while preserving visit and activity endpoint evidence.
   - Cons: still counts activity endpoints near cities, which can still be travel-adjacent.
2. Use `visit` points only for cities.
   - Pros: most conservative and best aligned with "I was at this place" semantics.
   - Cons: may undercount days where Google Timeline recorded only activity endpoints.
3. Lower city match radius or make radius population-aware.
   - Pros: reduces nearby-city bleed.
   - Cons: Natural Earth city points are coarse; too small a radius can miss real metro visits.

Any future change should include a before/after report and an `algorithmVersion` or equivalent marker so stale summaries can be detected and users can be prompted to re-import.

## 2026-05-06 Follow-up: Flight Paths And Airport Overrides

A 2023-12-31 London-to-San Francisco flight exposed another issue: `timeline-path` route samples caused flyover locations to be counted as visited. Raw points showed the false locations were route-only:

| Place | Source causing false day |
| --- | --- |
| Canada | `timeline-path` only |
| Idaho | `timeline-path` only |
| Montana | `timeline-path` only |
| Nottingham | `timeline-path` only |
| Sheffield | `timeline-path` only |
| Manchester | `timeline-path` only |
| Glasgow | `timeline-path` only |

The production rule was changed to treat only `visit`, `activity-start`, and `activity-end` as presence for country/state/city summaries. `timeline-path` is movement context, not visited-place evidence.

Airport-adjacent false positives were handled with three explicit city overrides:

| Airport | City summary target |
| --- | --- |
| SFO | San Francisco |
| MEX | Mexico City |
| EWR | New York |

These overrides are intentionally narrow. A generic "largest nearby metro" rule fixed SFO/MEX but collapsed real nearby-city visits, including Oakland, so it was rejected.

Regenerating the private summary after this change produced:

| Metric | Recomputed before change | After timeline filter + overrides |
| --- | ---: | ---: |
| Places | 96 | 94 |
| Countries | 40 | 39 |
| US states | 41 | 40 |
| India states | 15 | 15 |
| Cities | 181 | 151 |
