# Safety tab — UI specification

Calm when nothing is happening, unmistakable when something is. Patterns from NERV (state banner, zero clutter),
Citizen (hyper-local radius), Red Cross Emergency (one-tap calls, "I'm safe", offline guides) and IQAir (one score, one colour).
Dark slate surface, mint `#2FE0A1`, 16px cards, glass borders `rgba(255,255,255,0.08)`.

## Hierarchy (most urgent first)
```
[📍 Kyoto] [📍 Osaka] [🧭 My location]                                   [🔔 Alerts]
┌ 1 STATUS BANNER (NERV) ─────────────────────────────────────────────────────────┐
│ ● NORMAL · KYOTO, JAPAN                                                  0/100 │
│ All clear                                                                       │
│ No M4+ earthquakes within 300 km in 3 days, no serious disaster alerts for Japan│
│ Synced 14:02 · checks every 5 min                                  [↻ Refresh] │
└─────────────────────────────────────────────────────────────────────────────────┘
  Warning state: colour changes (amber → red → purple) and each alert is one row:
  WHAT (Earthquake M6.2) · WHERE (15 km from Kyoto) · SEVERITY (Strong / Tsunami possible) · WHEN (3 min ago)
┌ 2 EMERGENCY CALLS ───────────┐ ┌ 3 HELP NEARBY (radar) ──────────┐
│ [👮 110 Police] [🚑 119 Amb.] │ │  rings 1/2/3 km around the hotel │
│ [🗾 Visitor Hotline] [🇸🇬 MFA] │ │  H C P F E ★ + your stops        │
│ I'm safe: preview + WhatsApp │ │  nearest hospital … 0.8 km  Go ↗ │
│ SMS · Copy · Share           │ └──────────────────────────────────┘
└──────────────────────────────┘
┌ 4 WHERE WE'RE STAYING (offline taxi card) ┐ ┌ IF SOMETHING HAPPENS (guides) ┐
│ ホテルグレイスリー新宿  (local script, big)  │ │ ▸ Earthquake: drop, cover…     │
│ Hotel Gracery Shinjuku, address (English) │ │ ▸ Tsunami ▸ Typhoon ▸ Fire …    │
│ [⛶ Show big for taxi] [🖨 Print] [✎]       │ └────────────────────────────────┘
└───────────────────────────────────────────┘ ┌ 5 OFFICIAL TRAVEL ADVICE ──────┐
                                              │ Level 1 of 4 · normal caution  │
                                              └────────────────────────────────┘
▸ 🎬 Demo tools (preview a city, simulate a quake)
```

## Components
| Part | File |
|---|---|
| Tab (banner, calls, I'm safe, stay card, guides, advice, demo tools) | `src/components/SafetyLayer.vue` |
| Radar (SVG, bearing + distance, legend filters, tooltips) | `src/components/SafetyRadar.vue` |
| Data + risk score | `src/services/safetyService.js` |
| Server: place lookup, nearby help (cached Overpass), hotel search with local script | `server/routes/safety.js` |
| Saving the stay | `PUT /api/trips/:id/stay`, `trip.stay` |

## States
| State | Score | Colour | Shown as |
|---|---|---|---|
| clear | 0–24 | mint `#2FE0A1` | "All clear" + what was checked |
| advisory | 25–49 | amber `#FFB020` | alert rows |
| warning | 50–74 | red `#FF5A5F` | alert rows, banner on every tab |
| critical | 75–100 | purple `#B37FEB` | alert rows, banner on every tab |
Floors: UK level 3 → ≥ High, level 4 → Critical, GDACS Red → ≥ High, quake ≤100 km in 24 h: M5.5+ → ≥ Moderate, M6.5+/tsunami → ≥ High.

## Behaviour
- Where: before/after the trip the destination (centred on the hotel once added); during the trip live GPS,
  falling back to the destination if location is off (said once, not repeated).
- When: starts when Safety is opened (or immediately during the trip); every 5 min while the page is visible, or after moving 1 km.
- Every request times out after 10 s; GPS is rounded to ~100 m before leaving the device.
- Nearby help comes from our server (3 Overpass servers, 24 h cache), so busy map servers don't show errors in the browser.
- Taxi card is cached in the browser, so it shows offline; guides are built in.
- Emergency numbers for 25+ countries plus tourist hotlines and Singapore MFA's 24h duty office (+65 6379 8800).

## Accessibility
Banner uses `aria-live`; each alert says what/where/severity/when in words (not colour alone); radar points are focusable
with spoken labels; every button has a visible mint focus ring; animations stop with reduced motion; text on tinted
banners stays white on dark for high contrast; the taxi card is dark-on-light for reading in a car.

## Not included (no free data source)
Live tsunami arrival countdowns and official municipal shelter lists: we show "Tsunami possible" from USGS and
OpenStreetMap evacuation points / shelters instead.
