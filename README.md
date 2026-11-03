# Chui-se Your Trip

Plan a group trip together: itinerary, places and voting, packing, expenses, photos and safety.

## Live sites

| Site | Branch | Address | Database |
|---|---|---|---|
| Production | `main` | https://chuise-your-trip.vercel.app | `tripsync` |
| Preview | `preview` | https://chuise-your-trip-git-preview-lampardnk.vercel.app | `tripsync-preview` |

Preview pages ask for a Vercel login (only project members can open them).

## How a change goes live

1. Push to `preview`. Vercel updates the preview site.
2. Check the preview site.
3. Merge `preview` into `main` and push. Vercel updates the production site.

Any other branch also gets its own preview address: `chuise-your-trip-git-<branch>-lampardnk.vercel.app`.

## Run it on your computer

1. `pnpm install` and `pnpm --dir server install`
2. Put the settings in `server/.env` (`MONGODB_URI`, `JWT_SECRET`, and the API keys)
3. `pnpm dev:api` (server on port 3000) and `pnpm dev` (app on port 5173)

## Tests

Unit, integration and E2E tests live in `tests/<name>/{unit,integration,e2e}/` (Vitest, Vue Test Utils, Playwright).
The integration and E2E tests use the real server and a real account: they create their own trip and delete it afterwards.
Use a test account, not your own.

1. Start the server: `pnpm dev:api`
2. Set the test account: `export TEST_USERNAME=... TEST_PASSWORD=...`
3. `pnpm test` (unit + integration), `pnpm test:e2e` (E2E in a real browser; first time: `pnpm exec playwright install chromium`)

## Folder structure

```
src/                    Vue app (Vite)
  main.js, App.vue      entry point and app shell
  auth.js, friends.js, onboarding.js, preferences.js   app-wide state
  router/               page routes
  views/                one file per page (Home, Trip, Settings, Join, Login, Signup, Forgot password)
  components/           grouped by feature
    common/             shared widgets: icons, CustomDropdown, toast, flag, place / phone / diet inputs
    auth/               login and signup page parts
    home/               home page parts (new-trip notebook, passport)
    account/            profile menu, friends drawer
    trip/               trip page shell: tabs, share, edit, recap, map, packing, photos
    itinerary/          planner, stop / leg sheets, schedule, crowd chart, other journeys
    places/             wishlist and voting
    expenses/           expenses, expense form, exchange rates
    crew/               crew cards and the details form
    safety/             safety tab and radar
  lib/                  plain JavaScript (no Vue), grouped by feature
    itinerary/          day optimizer, crowds, itinerary store, shortlist
    trip/               expenses maths, packing list, trip and crew options, destinations
    ui/                 doodles, icons, stamps, map shapes, notifications, zip
  services/             calls to the server and outside APIs (weather, safety, map)
  data/                 static JSON and catalogs (attractions, cities, avatars)
  assets/               CSS and images
server/                 Express API (MongoDB)
  index.js, app.js      start-up and route wiring
  routes/               one file per API area (/api/trips, /api/auth, ...)
  models/               Mongoose models
  scripts/              admin scripts (reset a password)
  data/                 static data (Discover climate)
  *.js                  helpers: access checks, caching, rate limits, mail, Geoapify
api/index.js            Vercel entry: runs the same Express app
public/                 files served as-is
docs/                   feature specs and the project proposal
tests/                  unit, integration and E2E tests, one folder per team member
```

## Editing at the same time

- Different devices: a save made from an out-of-date copy of the trip is refused (409). The app says so
  and loads the latest version.
- Same browser: one login session at a time. Signing in (or opening the app) in a tab signs out the other tabs.
