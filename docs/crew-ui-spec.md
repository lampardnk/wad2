# Trip Crew view

Opened from the 👥 **Crew** tab in the trip nav. Shows everyone on the trip, their flights and food needs, and pending invites. Money owed lives in Expenses, not here.

## Structure
- `TripView.vue` → `CrewView.vue` (props: tripId, city, travellers, members, pendingInvites, crew, role, me, myId, flights; emits `invite`, `go(tab, name)`, `changed`). `go` is still declared and handled by `TripView.goFromCrew`, but no card emits it any more.
- Header: "<City> Crew", "N travellers · X active · Y pending", **Copy invite link** (button turns into "Link copied"), **+ Add member** (opens TripShare).
- Profile cards: avatar + online dot (seen < 5 min, not shown for guests), name + "(you)", status ("Active now", "Active 3 h ago", "Joined", "No account yet"), role badge (Admin / Editor / Guest), crew title ("Chief Foodie").
- Pills: arrival flight + landing time + airport, "Flies home …", "Same flight as …", the group's flights between cities on the itinerary, diet/allergy tags (allergies first), or "No restrictions" / "Food needs not added".
- Card footer: **Message** (WhatsApp link) and **Edit**. Clicking anywhere on a card you can edit opens `CrewDetailsForm.vue` in place.
- Pending invites: ghost cards ("Invited by you · waiting to join") with **Resend invite** / **Revoke** (organiser, or whoever sent it).
- Group snapshot: food-needs counts and the arrival window (earliest–latest).
- Archived (ended) trips: `readOnly` is injected from TripView, so invite buttons and editing are hidden.

## Data
- Profiles live in `trip.crew[name]` = `{ persona, flight, arrival, arriveAt, sameFlightAs, departFlight, departure, departFrom, diet[], phone }`.
  - `arrival` / `departure` are `YYYY-MM-DDTHH:mm`.
  - `sameFlightAs` links to another traveller, so the flight is stored once.
  - `arriveAt`, `departFlight`, `departure`, `departFrom` are set from the first / last day of the itinerary. Leaving them out of a save keeps the stored value.
- Edit: `PUT /api/trips/:id/crew/:name`. You can edit your own card; the organiser can edit guests. Max 8 diet tags.
- Online: `members[].lastSeenAt`, updated by `server/tripAccess.js` when a member loads the trip (at most every 2 min).
- Resend: `POST /api/trips/:id/invites/:userId/resend` (moves it back to the top of their home page). Revoke: `DELETE /api/trips/:id/invites/:userId`.

## Style
Scoped tokens on `.cw`: background `#00283c`, cards `#0a3550`, borders `rgba(255,255,255,0.08)`, accent `#edae49`, 24px radius. One-column summary below 720px; tap targets at least 40px on touch screens.

## Settings (account-wide)
- Food needs and WhatsApp live on the user (`User.diet`, `User.phone`), set at `/settings` (profile menu → Settings).
- `GET /api/auth/me` returns them; `PUT /api/auth/me { diet, phone }` saves them.
- `GET /api/trips/:id` adds `diet`, `phone`, `contactSaved` to each member, and the Crew cards use those.
- The crew edit form only asks for food needs / WhatsApp for people without an account (the organiser fills those in).
- Shared inputs: `DietTagsInput.vue`, `PhoneInput.vue`.
