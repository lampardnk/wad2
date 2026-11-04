# Day optimizer (Itinerary tab)

Files: `src/lib/itinerary/dayOptimizer.js` (algorithm, no Vue), `src/components/itinerary/ItineraryPlanner.vue` (UI: Optimize Route, preview, lock, drag), `src/services/weatherService.js` (forecast from `GET /api/weather`, OpenWeather; needs `OPENWEATHER_API_KEY` on the server).

## Algorithm (`optimizeDay(stops, rainByHour, { dayStart, dayEnd, buffer, travel, from, end })`)
1. Try every order of the flexible stops (up to 8 = 40,320 orders; longer days use 2-opt with the same rule). Locked stops keep their time.
2. `scheduleInOrder` times each order: a stop starts when you arrive (rounded up to 15 min), or when it opens. A flexible stop only goes before a locked one if it fits (travel + buffer included).
3. Pick the order by one rule:
   - **fewer warnings** (`warningsFor`, the same ⚠ list the planner shows: closed / closed all day, outside your day, late for a fixed time, outdoors in ≥50% rain, crowds: never / 80%+ / 55%+ for "Avoid peak crowds" Relaxed / Balanced / Strict), then
   - **shorter distance** (`routeKm`): road km of every leg, hotel/airport → stops → hotel/airport. A leg's km is the driving route's length (`legKm`), or the straight line if there's no route. It doesn't depend on walk / transit / taxi, so the travel mode can't change which order wins.
4. The current plan is judged by the same rule. Only a plan that beats it is offered: "Route optimized: 1 fewer warning, 15.0 → 10.5 km."
5. `reasonsFor` writes the pills (rain, quieter time, walk time…).

Crowd data comes from the stop's BestTime forecast (`src/lib/itinerary/crowd.js`, `server/routes/crowd.js`) when available, else a typical curve (outdoor sights peak 11 AM–3 PM). Rain comes from the 3-hour forecast blocks (`rainFromBlocks`). Day start/end, travel buffer and "Avoid peak crowds" come from the user's preferences (Settings); they guide Optimize and the warnings but never re-time saved stops by themselves. Flight days are the exception: stops are re-timed around the flight.

## UI
**Optimize Route** (Analyzing route… → Checking forecast… → Reordering…) → preview with the summary + **Apply** / **Dismiss**. If nothing better is found: "Your day is already in a good order." (or a note that warnings remain) + **OK**. Lock per stop; drag (or arrow keys on the handle) re-times the day in the new order.

## What if: simulated weather and crowds
At the bottom of a stop's **Crowds** and **Weather** tabs (`StopSheet.vue` → `sheetSimulate` in the planner). They change what the planner *assumes* about that stop on the day you're looking at, so you can see how Optimize Route would react. Only you see them, nothing is saved, tapping the same choice again goes back to the real data, and opening another day clears them all.

- **Weather**: "What if it Rains / Stays dry". The forecast blocks that overlap that stop's planned time are replaced (`weatherOverrides` → `effectiveWeatherBlocks` → `rain`); with no forecast yet for that day, the what-if adds its own blocks. Everything that reads `rain` uses it: Optimize Route, the 🌧️ warnings, the timeline icons and "dry times".
- **Crowds**: "What if it's Quiet (25%) / Busy (65%) / Peak (90%)". The stop's crowd curve for the day is scaled so its planned hour has that level (`crowdOverrides` → `assumedCurve`; the other hours keep their shape). It goes into the stops the optimizer gets (`work`), so Optimize Route, the 👥 warnings, the crowd badge ("Simulated") and "quieter times" all use it.

## Getting around (travel between stops)
Files: `src/lib/itinerary/dayOptimizer.js` (travel model), `src/components/itinerary/LegSheet.vue` (panel), `TravelChoices.vue` (option list),
`OtherJourneys.vue` (Transport tab), `server/routes/travel.js` (live routes, Geoapify), Settings → Transport.

1. `travelOptions(a, b, tp)`: walk / transit / taxi / bike times (`TRAVEL_MODES`). Live routes from `GET /api/travel/leg?from=lat,lon&to=lat,lon` when the server has `GEOAPIFY_KEY` (walk, bicycle, drive, approximated transit; transit is always labelled an estimate). Otherwise straight-line estimates. Transit is skipped under 0.6 km. Answers are kept in MongoDB for 90 days (`sharedCache('travel-legs')`, `server/sharedCache.js`).
2. `recommendTravel(options, tp)`: follows the user's preferences (allowed modes, longest walk, balanced / fastest / cheapest) and explains why ("walking is 32 min, over your 20-min limit"). Balanced: walk within the limit, else transit, a taxi only if it saves at least 20 min.
3. A leg chosen by the group is saved on the destination stop as `travel: { mode, from, by }` (only valid while that stop follows `from`). `travelBetween` uses it, so the timeline, the re-timing after a choice and Optimize Route all agree.
4. Other journeys (airport → hotel, day trips) are saved on the trip as `journeys` (`PUT /api/trips/:id/journeys`).
