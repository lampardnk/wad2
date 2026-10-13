# Trip Crew view

Opened from the **Travellers** summary card or the 👥 Crew tab in the trip nav.

## Structure
- `TripView.vue` → `CrewView.vue` (props: tripId, city, travellers, members, pendingInvites, crew, expenses, role, me, myId; emits `invite`, `go(tab, name)`, `changed`)
- Header: "<City> Crew • N Travelers (X Active, Y Pending)", Copy invite link (toast), + Add member (opens TripShare)
- Profile cards: avatar + online dot (seen < 5 min), name, role badge (Admin / Editor / Guest), persona, flight + arrival pill, diet/allergy flags, quick actions (WhatsApp, balance → Expenses, photos → Photos filtered to that person)
- Pending invites: dashed ghost cards with Resend / Revoke (organiser or the person who invited)
- Summary bar: diet counts, arrival window (earliest–latest)

## Data
- Profiles live in `trip.crew[name]` = `{ persona, flight, arrival, sameFlightAs, diet[], phone }`. `diet` holds preset keys or custom tags; `sameFlightAs` links to another traveller so the flight is only stored once. The edit form is `CrewDetailsForm.vue`.
- Edit: `PUT /api/trips/:id/crew/:name` (your own card; the organiser can edit guests)
- Online: `members[].lastSeenAt`, updated when a member loads the trip (at most every 2 min)
- Resend invite: `POST /api/trips/:id/invites/:userId/resend`
- Balances: `balances()` from `src/expenses.js`
- Demo trip (`/trip/seoul`) uses mock data: 3 travellers + 1 pending invite

## Style
Dark #0D1117 / #161B22 cards, borders rgba(255,255,255,0.08), mint #2FE0A1 accent, 16px radius, blur(12px), hover lift, one column on mobile.

## Settings (account-wide)
- Food needs and WhatsApp live on the user (`User.diet`, `User.phone`), set once at `/settings` (profile menu → Settings).
- `GET /api/auth/me` returns them; `PUT /api/auth/me { diet, phone }` saves them.
- `GET /api/trips/:id` adds `diet`, `phone`, `contactSaved` to each member, and the Crew cards use those.
- The crew edit form only asks for food needs / WhatsApp for people without an account (the organiser fills those in).
- Shared inputs: `DietTagsInput.vue`, `PhoneInput.vue`.
