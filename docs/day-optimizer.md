# Day optimizer (Itinerary tab)

Files: `src/lib/itinerary/dayOptimizer.js` (algorithm, no Vue), `src/components/itinerary/ItineraryPlanner.vue` (UI: Optimize Route, preview, lock, drag), `src/services/weatherService.js` (forecast from `GET /api/weather`, OpenWeather; needs `OPENWEATHER_API_KEY` on the server).

## Algorithm (`optimizeDay(stops, rainByHour, { dayStart, dayEnd, buffer, crowdWeight, travel, from, end })`)
1. Travel matrix (`travelMatrix`): every pair of stops, using `travelBetween` (see Getting around). Without travel preferences: walk up to 1.3 km, otherwise transit. No location → 15 min.
2. `scheduleInOrder`: flexible stops in a given order, each starting when you arrive (rounded up to 15 min), waiting for opening time if early. Locked stops keep their time; a flexible stop only goes before a locked one if it fits (travel + buffer included). Lunch / dinner breaks are slotted in when the day has no meal planned (`mealsNeeded`, `MEALS`).
3. `measure` cost (lower = better), weights in `WEIGHTS`:
   - travel min ×1 + waiting ×0.3 + minutes late for a locked stop ×5
   - crowd % ×0.5 × `crowdWeight` (outdoor ×1, indoor ×0.5; locked stops not counted)
   - +90 × rain chance on outdoor stops, −8 × rain on indoor stops
   - +300 per stop outside opening hours
   - ×2 per minute past the end of the day or before it starts (e.g. before your flight lands)
   - meals: named meals ×2 per minute outside their window; food places ×1 per minute away from lunch or dinner
   - the legs from the hotel / airport (`from`) and back to it (`end`) count as travel
4. Search: every order for ≤7 flexible stops (5040), otherwise nearest-neighbour + 2-opt.
5. `reasonsFor` writes the pills (morning slot, rain, walk time…); `warningsFor` flags problems in the current plan.

Crowd data comes from the stop's BestTime forecast (`src/lib/itinerary/crowd.js`, `server/routes/crowd.js`) when available, else a typical curve (outdoor sights peak 11 AM–3 PM). Rain comes from the 3-hour forecast blocks (`rainFromBlocks`). Day start/end, travel buffer and crowd sensitivity come from the user's preferences (Settings); they guide Optimize and the warnings but never re-time saved stops by themselves. Flight days are the exception: stops are re-timed around the flight.

## UI
**Optimize Route** (Analyzing route… → Checking forecast… → Reordering…) → preview with the summary + **Apply** / **Dismiss**. If nothing better is found: "Your day is already in a good order." (or a note that warnings remain) + **OK**. Lock per stop; drag (or arrow keys on the handle) re-times the day in the new order.

## What if: simulated weather and crowds
Two panels under the day's timeline ("Simulate weather conditions", "Simulate crowd conditions"). They change what the planner *assumes* for the day you're looking at, so you can see how Optimize Route would react. Only you see them, nothing is saved, and opening another day (or Reset) goes back to the real data.

- **Weather**: pick a stop and Rainy / Sunny. The forecast blocks that overlap that stop's planned time are replaced (`effectiveWeatherBlocks` → `rain`). Everything that reads `rain` uses it: Optimize Route, the 🌧️ warnings, the timeline icons and "dry times". With rain assumed, "Try a clearer time" lists dry slots; **Preview → Apply changes** moves the stop (and anything in the way) for real.
- **Crowds**: pick a stop and Quiet (25%) / Busy (65%) / Peak (90%). The stop's crowd curve for the day is scaled so its planned hour has that level (`assumedCurve`; the other hours keep their shape). It goes into the stops the optimizer gets (`work`), so Optimize Route, the 👥 warnings, the crowd badge ("Simulated") and "quieter times" all use it.
- **Optimize Route with this** runs Optimize Route straight away and scrolls to its suggestion; **Apply** saves it as usual.

## Getting around (travel between stops)
Files: `src/lib/itinerary/dayOptimizer.js` (travel model), `src/components/itinerary/LegSheet.vue` (panel), `TravelChoices.vue` (option list),
`OtherJourneys.vue` (Transport tab), `server/routes/travel.js` (live routes, Geoapify), Settings → Transport.

1. `travelOptions(a, b, tp)`: walk / transit / taxi / bike times (`TRAVEL_MODES`). Live routes from `GET /api/travel/leg?from=lat,lon&to=lat,lon` when the server has `GEOAPIFY_KEY` (walk, bicycle, drive, approximated transit; transit is always labelled an estimate). Otherwise straight-line estimates. Transit is skipped under 0.6 km. Answers are kept in MongoDB for 90 days (`sharedCache('travel-legs')`, `server/sharedCache.js`).
2. `recommendTravel(options, tp)`: follows the user's preferences (allowed modes, longest walk, balanced / fastest / cheapest) and explains why ("walking is 32 min, over your 20-min limit"). Balanced: walk within the limit, else transit, a taxi only if it saves at least 20 min.
3. A leg chosen by the group is saved on the destination stop as `travel: { mode, from, by }` (only valid while that stop follows `from`). `travelBetween` uses it, so the timeline, the re-timing after a choice and Optimize Route all agree.
4. Other journeys (airport → hotel, day trips) are saved on the trip as `journeys` (`PUT /api/trips/:id/journeys`).
