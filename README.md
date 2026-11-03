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

## Editing at the same time

- Different devices: a save made from an out-of-date copy of the trip is refused (409). The app says so
  and loads the latest version.
- Same browser: one login session at a time. Signing in (or opening the app) in a tab signs out the other tabs.
