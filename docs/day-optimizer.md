# Day optimizer (Itinerary tab)

Files: `src/dayOptimizer.js` (algorithm, no Vue), `src/components/DayOptimizer.vue` (UI), `src/dayOptimizerSample.js` (Kyoto sample day).

## Algorithm (`optimizeDay(stops, rainByHour, { dayStart, dayEnd })`)
1. Travel matrix: straight-line distance between every pair → walk (≤1.3 km, 4.8 km/h ×1.25) or transit (8 min wait + 22 km/h ×1.3). No address → 15 min.
2. `scheduleInOrder`: flexible stops in a given order, each starting when you arrive (rounded up to 15 min). Locked stops keep their time; a flexible stop only goes before a locked one if it fits (including travel).
3. `measure` cost (lower = better): travel min + 0.3×waiting + 0.5×crowd% (outdoor ×1, indoor ×0.5) + 90×rain chance on outdoor stops − 8×rain on indoor stops + 300 per stop outside opening hours + 5×minutes late for a locked stop + 2×minutes past the end of the day.
4. Search: every order for ≤7 flexible stops (5040), otherwise nearest-neighbour + 2-opt.
5. `reasonsFor` writes the pills (morning slot, rain, walk time…); `warningsFor` flags problems in the current plan.

Crowd data comes from the itinerary's BestTime forecasts when available (else a typical curve: outdoor sights peak 11 AM–3 PM). Rain comes from the 3-hour forecast blocks (`rainFromBlocks`).

## UI
✨ Optimize Day (Analyzing route → Checking forecast → Reordering) → preview with summary + Apply / Dismiss. 🔒/🔓 per stop, ⋮⋮ drag (or arrow keys on the handle) re-times the day in the new order. "Try a sample Kyoto day" shows the before/after on mock data (not saved).
