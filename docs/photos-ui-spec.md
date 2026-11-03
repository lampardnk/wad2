# Photos — "Shared roll" UI specification

A group photo dump for each trip, organised by spot. Mixes Partiful / Luma photo dumps (frictionless drop,
attribution, reactions) with Apple / Google shared albums (albums, contributors, lightbox, download originals).
Dark surface inside the trip page (gradient `#121b19` → `#022538`), gold accent `#edae49`, 24px panel radius, glass borders `rgba(255,255,255,0.08)`.

## Information architecture

```
┌ Header ───────────────────────────────────────────────────────────────────┐
│ Shared roll                                  [⬇ Download all (.zip)] [+ Drop photos] │
│ 34 photos · 3 contributors                                                │
├ Album switcher (horizontal scroll) ──────────────────────────────────────┤
│ (All 34) (✨ Highlights 6) (Fushimi Inari 14) (Arashiyama 12) (+ Add album)    │
├ Contributor filter ───────────────────────────────────────────────────────┤
│ Everyone  (S) My photos 12  (J) John 9  (A) Amy 13      Remove "Arashiyama" album │
├ Upload tray (only while adding) ─────────────────────────────────────────┤
│ [thumb ▂▂▂] [thumb ✓] [thumb !]   Adding 3 photos… to Fushimi Inari           │
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
| Whole view (header, albums, filter, tray, grid, drop overlay, lightbox) | `src/components/trip/PhotosView.vue` |
| .zip builder for "Download all" (no library, files stored as-is) | `src/lib/ui/zip.js` |
| Photo records + image bytes (original + 480px thumbnail) | `server/models/Photo.js` |
| Photo API: `GET /`, `POST /` (raw image body), `PUT /:photoId/thumb`, `GET /:photoId/file?size=thumb`, `PATCH /:photoId` (move), `POST /:photoId/react`, `DELETE /:photoId` | `server/routes/photos.js` at `/api/trips/:tripId/photos` |
| Spot albums saved on the trip | `PUT /api/trips/:id/albums`, `trip.photoAlbums` |

## Behaviour

- **Adding**: `+ Drop photos` opens the picker; dragging files anywhere on screen (while Photos is open) shows a
  full-screen "Drop to add to …" overlay. Photos go to the open album (or ✨ Highlights from *All*).
- **Staging tray**: each file shows its preview, a progress bar, then ✓ or ! with the reason
  (not JPEG/PNG/WebP/GIF, bigger than 10 MB, HEIC). Two upload at a time; the tray clears itself 2.5 s after all succeed.
- **Thumbnails** are made in the browser (max 480px JPEG, sent with `PUT /:photoId/thumb`) so the grid loads fast; originals are kept for download.
- **Albums**: `+ Add album` suggests places from the wishlist or takes a typed name (max 60 characters).
  Removing an album moves its photos back to Highlights.
- **Contributors**: photos and reactions are always recorded as the logged-in member (the server decides).
  Filter by person ("Everyone" or one person); your own shows as "My photos".
- **Reactions**: ❤️ 🔥 😂 😍 👏 — counts stay on the photo, the rest appear on hover/focus; yours are highlighted;
  hover a count to see who reacted.
- **Lightbox**: click a photo or ⤢; ← → keys / arrows to move, Esc to close; move to another album, download the original,
  delete (asks first).
- **Download all**: zips the originals of the photos on screen (respects album + person filters), shows "Zipping 3 / 34…".
- **Empty state**: a drop card with a photo stack, "Start the shared roll" and "+ Add the first memories".
- **Others' photos**: the view polls every 20 s (new photos, reactions, deletions).
- **Archived trip**: view and download only; "This trip has ended, so no more photos can be added."
- **Demo trip**: works with photos kept in the browser only ("demo trip, photos aren't saved").

## Accessibility & heuristics

- Every control is a real button with a label; keyboard focus shows a visible ring; tiles have an "Open photo n" button.
- Reaction buttons use `aria-pressed`; albums use tabs; status text (upload progress, zipping) updates live.
- Below 768px the expand button is always shown (no hover needed).
- Errors say what to do ("HEIC photos are not supported, export as JPEG").

## Limits

- 10 MB per photo, JPEG / PNG / WebP / GIF. Photos are stored in MongoDB, so a free Atlas cluster (512 MB)
  holds roughly a few hundred phone photos across all trips.
