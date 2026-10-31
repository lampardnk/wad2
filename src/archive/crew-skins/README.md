# Archived: Crew skins (Travel Twin)

Nine pirate crew skins (our own characters: Marlo Brine, Kestrel Vane, Bo Tallow, Isla Corrigan, Fen Okoro,
Rook Halloway, Odessa Thorn, Wren Sallow, Tamsin Gale). Tapping one dressed the 3D twin in that whole outfit.
Removed from the app for now; nothing here is imported, so it isn't in the build.

## Files
- `CrewPortrait.vue`: the flat SVG portrait drawn on each skin's card
- `crewSkins.js`: the nine skins (`CREW`), with tiers, portrait colours and the 3D look each one puts on
- `CrewSkinCard.vue` + `crewSkinsStandalone.js`: the stand-alone hero card version (made for a portfolio)

## Putting them back into the studio
1. Move `CrewPortrait.vue` back to `src/components/` and `crewSkins.js` to `src/`
   (fix its import to `'../shared/avatarCatalog.js'`).
2. In `shared/avatarCatalog.js`, add `{ key: 'crew', label: 'Crew skins', icon: 'users' }` as the first entry of `TABS`.
3. In `AvatarStudio.vue`:
   - `import CrewPortrait from './CrewPortrait.vue'` and `import { CREW, isCrewLook } from '../crewSkins.js'`
   - add `crew: 'full'` to `TAB_FOCUS`
   - paste the template block below as the first thing inside `<div ... class="as-panel">`
   - paste the function and the CSS below
   - note: the unlock helpers changed after this was archived. Swap `isUnlocked(c, avatar.trips)` for
     `isUnlocked(c)` and `lockText(c, avatar.trips)` for `lockText(c)`, and `isNew(c)` for `isNew('crew', c)`.
     Skin tiers are tiers 1-3 (0 / 40 / 120 XP now).
4. Every item a skin uses must be in the catalogue (hats, facial hair, glasses, goggles, earring, headband,
   eyepatch are all still there).

### Template (inside the wardrobe panel)
```html
                <!-- Crew skins: a whole outfit in one tap (you can still change any part after) -->
                <section v-if="tab === 'crew'" class="as-slot" aria-labelledby="as-slot-crew">
                  <h3 id="as-slot-crew" class="as-slot-title">
                    Crew skins
                    <span class="as-slot-pick">One tap dresses your twin</span>
                  </h3>
                  <div class="as-grid">
                    <button v-for="c in CREW" :key="c.id" type="button" class="as-card as-crew"
                      :class="{ on: isCrewLook(draft, c), locked: !isUnlocked(c, avatar.trips) }" :style="{ '--crew': c.accent }"
                      :aria-pressed="isCrewLook(draft, c)" :aria-disabled="!isUnlocked(c, avatar.trips)"
                      :aria-label="c.name + ', ' + c.role + (isUnlocked(c, avatar.trips) ? '' : '. ' + lockText(c, avatar.trips))"
                      :data-tip="isUnlocked(c, avatar.trips) ? null : lockText(c, avatar.trips)"
                      @click="pickCrew(c)">
                      <span class="as-portrait"><CrewPortrait :c="c" /></span>
                      <span class="as-card-name">{{ c.name }}</span>
                      <span class="as-role">{{ c.role }}</span>
                      <span v-if="!isUnlocked(c, avatar.trips)" class="as-lock">
                        <AppIcon name="lock" :size="11" :stroke="2.6" /> {{ TIERS[c.tier - 1].min }} trips
                      </span>
                      <span v-else-if="isNew(c)" class="as-new">New</span>
                      <span v-if="isCrewLook(draft, c)" class="as-check" aria-hidden="true"><AppIcon name="check" :size="12" :stroke="3" /></span>
                    </button>
                  </div>
                  <p v-if="lockNote && lockNote.slot === 'crew'" class="as-locknote" role="status">
                    <AppIcon name="lock" :size="13" /> <strong>{{ lockNote.name }}</strong>: {{ lockNote.text }}
                  </p>
                  <p class="as-crew-tip">Picked one? Open Appearance, Outfit or Travel gear to change any part of it.</p>
                </section>
```

### Script
```js
// A crew skin replaces the whole look
function pickCrew(c) {
  if (!isUnlocked(c, avatar.trips)) {
    lockNote.value = { slot: 'crew', name: c.name, text: lockText(c, avatar.trips) }
    return
  }
  lockNote.value = null
  error.value = ''
  draft.value = cleanLook(c.look)
  focus.value = 'full'
}
```

### CSS
```css
/* crew skin cards */
.as-crew.on {
  border-color: var(--crew);
  background: color-mix(in srgb, var(--crew) 14%, transparent);
}
.as-crew.on .as-check {
  background: var(--crew);
}
.as-portrait {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--crew) 60%, transparent), 0 6px 16px -6px var(--crew);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.as-crew:hover:not(.locked) .as-portrait {
  transform: scale(1.06) rotate(-3deg);
}
.as-crew.locked .as-portrait {
  opacity: 0.38;
  filter: grayscale(0.7);
}
.as-role {
  margin-top: -3px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--crew);
}
.as-crew.locked .as-role {
  color: var(--muted);
}
.as-crew-tip {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: var(--muted);
}

```
