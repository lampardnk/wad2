# Photos — "Shared roll" UI specification

A group photo dump for each trip, organised by spot. Mixes Partiful / Luma photo dumps (frictionless drop,
attribution, reactions) with Apple / Google shared albums (albums, contributors, lightbox, download originals).
Dark elevated surface inside the trip page, mint accent `#2FE0A1`, 16px tiles, glass borders `rgba(255,255,255,0.08)`.

## Information architecture

```
┌ Header ───────────────────────────────────────────────────────────────────┐
│ Shared roll                         Adding as [Sarah▾] [⬇ Download all (.zip)] [+ Drop photos] │
│ 34 photos · 3 contributors                                                │
├ Album switcher (horizontal scroll) ──────────────────────────────────────┤
│ (All 34) (✨ Highlights 6) (⛩ Fushimi Inari 14) (🎋 Arashiyama 12) (+ Add spot album) │
├ Contributor filter ───────────────────────────────────────────────────────┤
│ Everyone  (S) My photos 12  (J) John 9  (A) Amy 13      Remove "Arashiyama" album │
├ Upload tray (only while adding) ─────────────────────────────────────────┤
│ [thumb ▂▂▂] [thumb ✓] [thumb !]   Adding 3 photos… to ⛩ Fushimi Inari as Sarah │
├ Masonry grid ─────────────────────────────────────────────────────────────┤
│ ┌──────┐ ┌────┐ ┌──────┐   each tile: avatar chip (top-left, name on hover),│
│ │      │ │    │ │      │   ⤢ expand (top-right, on hover),                │
│ └──────┘ │    │ └──────┘   reactions (bottom: counts always, + more on hover)│
└───────────────────────────────────────────────────────────────────────────┘
Lightbox: photo + ‹ › arrows · side panel: uploader, date, reactions, move to album, ⬇ Original, Delete
```

## Components & files

| Part | Where |
|---|---|
| Whole view (header, albums, filter, tray, grid, drop overlay, lightbox) | `src/components/PhotosView.vue` |
| .zip builder for "Download all" (no library, files stored as-is) | `src/zip.js` |
| Photo records + image bytes (original + 480px thumbnail) | `server/models/Photo.js` |
| Photo API (list, upload, thumbnail, file, move, react, delete) | `server/routes/photos.js` at `/api/trips/:tripId/photos` |
| Spot albums saved on the trip | `PUT /api/trips/:id/albums`, `trip.photoAlbums` |

## Behaviour

- **Adding**: `+ Drop photos` opens the picker; dragging files anywhere on screen (while Photos is open) shows a
  full-screen "Drop to add to ⛩ Fushimi Inari" overlay. Photos go to the open album (or ✨ Highlights from *All*).
- **Staging tray**: each file shows its preview, a progress bar, then ✓ or ! with the reason
  (wrong type, over 10 MB, HEIC). Two upload at a time; the tray clears itself when all succeed.
- **Thumbnails** are made in the browser (max 480px) so the grid loads fast; originals are kept for download.
- **Albums**: `+ Add spot album` suggests places from the wishlist (with their icons) or takes a typed name.
  Removing an album moves its photos back to Highlights.
- **Contributors**: "Adding as" sets who uploads and reacts (one account per trip, several travellers).
  Filter by person; your own shows as "My photos".
- **Reactions**: ❤️ 🔥 😂 😍 👏 — counts stay on the photo, the rest appear on hover/focus; yours are outlined in mint;
  hover a count to see who reacted.
- **Lightbox**: click a photo or ⤢; ← → keys / arrows to move, Esc to close; move to another album, download the original,
  delete (asks first).
- **Download all**: zips the originals of the photos on screen (respects album + person filters), shows "Zipping 3 / 34…".
- **Empty state**: a dashed drop card with a photo stack inviting the first memories.
- **Demo trip**: works with photos kept in the browser only (not saved).

## Accessibility & heuristics

- Every control is a real button with a label; keyboard focus shows a mint ring; tiles have an "Open photo n" button.
- Reaction buttons use `aria-pressed`; albums use tabs; status text (upload progress, zipping) updates live.
- Touch screens (no hover) always show the expand button; motion is reduced when the device asks for it.
- Errors say what to do ("HEIC photos are not supported, export as JPEG").

## Limits

- 10 MB per photo, JPEG / PNG / WebP / GIF. Photos are stored in MongoDB, so a free Atlas cluster (512 MB)
  holds roughly a few hundred phone photos across all trips.
