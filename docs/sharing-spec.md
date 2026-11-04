# Shared trips — invite, join and safe group editing

Borrowed patterns: Notion / Figma share panel (link + people list + roles), Partiful / Luma invite page
(photo, "X invited you", who's going, one big button), Splitwise "claim a placeholder name".

## Flow
0. **Plan a new trip** (the notebook pop-up on Home) asks for name, destinations (in travel order), dates and trip vibe.
   The creator is added as the organiser and lands straight on the new trip page.
1. Trip page → **+ Invite** (next to the avatars under the trip title) opens the share panel:
   your friends (one tap to invite, with a filter when the list is long), invite by username,
   copy link, WhatsApp / Telegram / Email / native share, everyone on the trip
   (solid avatar = joined, dashed = listed but not joined), Organiser badge.
   The **+ Add member** button on the Crew tab opens the same panel.
2. Friend opens `/join/<code>` → a short preview works before signing in → logs in or signs up (the link survives both) → invite card:
   destination photo, "Kay invited you", route, dates, who's going.
3. **Which one is you?** If the organiser typed their name as a traveller, they pick it, so earlier expenses,
   votes and photos are already theirs. Otherwise "Not listed, join as <name>".
4. Joined trips appear on the home page with "👥 Shared with you"; only the organiser sees 🗑.

## Invite by username
- Share panel → **Invite by username**: type `@mei` (3+ letters) → up to 5 matching accounts (name + @username),
  each with **Invite**, or "On this trip" / "Invited ✓". Only usernames are searched, never emails.
- The invitee sees a card at the top of their home page:
  "📨 **Kay** invited you to **Japan Highlights** · 🇯🇵 Tokyo → 🇯🇵 Kyoto · 20 Dec – 27 Dec · 2 going" with **Decline** / **Join →**.
  Join opens the normal invite page (pick "Which one is you?").
- Waiting invites show in the share panel ("Invited by you · waiting for them to join") with **Cancel invite**
  (organiser, or whoever sent it).
- Server: `trip.pendingInvites [{ user, invitedBy, invitedById, at }]`;
  `GET /api/invites/users?q=&trip=`, `POST /api/trips/:id/invites {userId}`, `DELETE /api/trips/:id/invites/:userId`,
  `GET /api/invites` (mine), `POST /api/invites/:tripId/decline`. Joining clears your pending invite.

## Friends and family groups
- Friends (`server/routes/friends.js`, `FriendsDrawer.vue` from the profile menu) show at the top of the share panel.
- A trip can be shared with a family group (`trip.group`, `server/routes/groups.js`): everyone in the group can open it,
  and is added as a member the first time they do.

## People without an account
"+ Add someone without an account" (kids, parents) adds a name to the trip so they can be in expenses and votes
(dashed avatar). `POST /api/trips/:id/guests {name}`, `DELETE /api/trips/:id/guests/:name`
(refused if they appear in any expense). If they sign up later, they pick that name on the invite page.

## Roles
| | Organiser | Member |
|---|---|---|
| Open and edit the trip, add expenses, photos | ✓ | ✓ |
| Share the invite link, invite by username | ✓ | ✓ |
| Cancel an invite | ✓ (any) | ✓ (ones they sent) |
| Reset the link, remove people, delete the trip | ✓ | — |
| Leave the trip | — | ✓ |
Removed or leaving people stay on the trip as a (dashed) traveller name so balances still add up.

## Server
- `trip.members [{ user, name, role }]`, `trip.inviteCode`; older trips get the owner added automatically.
- `server/tripAccess.js` → `findTripFor(userId, tripId, ownerOnly)` used by every trip, photo and expense route.
  A trip is visible to its owner, its members, and anyone in its family group.
- `POST /api/trips/:id/invite {reset}`, `DELETE /api/trips/:id/members/:userId`
- `GET /api/join/:code/preview` (no login), `GET /api/join/:code` (preview), `POST /api/join/:code {as}` (join)
- Ended trips are archived: `server/archived.js` blocks every change except deleting the trip or leaving it.
- Expenses save **one change at a time** with MongoDB `$push` / `$pull` / `$set`
  (`/api/trips/:id/expenses/items`, `/settlements`, `/rates`, `/settings`), so two people adding at once never overwrite each other.
- Itinerary saves (`PUT /api/trips/:id/itinerary`) send the trip `version`. If someone else saved first, the server answers
  409 with their latest trip, and the page shows it instead of overwriting.
- Packing sends the list as this person last saw it (`base`); only their own changes are applied on top of the latest.
- Votes: you can only change your own (the organiser also for people without an account).
- Comments (`/api/trips/:id/place-comments`) are one thread per place, shared by the Places tab and the itinerary stop with the same name. They are kept apart from the stops; saving the itinerary only moves them when a stop is renamed, and removes them when no stop or saved place has that name any more.
- Photos and reactions are always recorded as the logged-in member (the server decides, not the browser).

## Seeing others' changes
- Expenses check the server every 15 s while the tab is open; new items from others pop up as a toast
  ("Mei added Taxi · SGD 12"). A pulsing "Synced with the group" dot shows it's live.
- Photos refresh every 20 s (new photos, reactions, deletions).

## Still last-save-wins (one person usually edits these)
The photo album list, crew cards, the stay and other journeys are still saved as a whole.
