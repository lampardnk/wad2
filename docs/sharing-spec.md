# Shared trips — invite, join and safe group editing

Borrowed patterns: Notion / Figma share panel (link + people list + roles), Partiful / Luma invite page
(photo, "X invited you", who's going, one big button), Splitwise "claim a placeholder name".

## Flow
0. **Plan a new trip** only asks for name, destinations and dates. The creator is added as the organiser.
   Setup then opens on **Invite your group** (username search + link + "+ Add someone without an account"),
   with **Skip for now** for solo trips, before Wishlist and Vote.
1. Trip page → **+ Invite** (next to the avatars under the trip title) opens the share panel:
   copy link, WhatsApp / Telegram / Email / native share, everyone on the trip
   (solid avatar = joined, dashed = listed but not joined), Organiser badge.
2. Friend opens `/join/<code>` → logs in or signs up (the link survives both) → invite card:
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
- `POST /api/trips/:id/invite {reset}`, `DELETE /api/trips/:id/members/:userId`
- `GET /api/join/:code` (preview), `POST /api/join/:code {as}` (join)
- Expenses save **one change at a time** with MongoDB `$push` / `$pull` / positional `$set`
  (`/api/trips/:id/expenses/items`, `/settlements`, `/settings`), so two people adding at once never overwrite each other.
- Photos and reactions are always recorded as the logged-in member (the server decides, not the browser).

## Seeing others' changes
- Expenses check the server every 15 s while the tab is open; new items from others pop up as a toast
  ("Mei added Taxi · SGD 12"). A pulsing "Synced with the group" dot shows it's live.
- Photos refresh every 20 s (new photos, reactions, deletions).

## Still last-save-wins (one person usually edits these)
Itinerary stops, wishlist + votes, packing ticks and album list are still saved as a whole.
