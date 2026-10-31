# Discover badges (archived)

Small achievements on the Discover page, taken out for now. Everything below was cut from
`src/views/DiscoverView.vue` and can be pasted back.

Badges were kept in the browser (localStorage key `dx-badges-v1`), so anything people earned is still saved there.

## How to put it back
1. **Script**: paste `badges.js` into DiscoverView's `<script setup>` (after the continents/explored section;
   it uses `readList` / `saveList`, which are still there).
2. **Award calls**: put each line from `award-calls.txt` back where it says:
   - `award('globetrotter')`: in `explore()`, after `saveList('dx-explored-v1', ...)` (as `if (explored.value.length >= 5) ...`)
   - `award('quiz')`: in `answer()`, after `quiz.value = null`
   - `award('spin')`: in `spinGlobe()`, after `reveal.value = null`
   - gem / legend / packed: in `toggleLike()`, after `shortlist.value = shortlist.value.concat(c.id)`
     (add `const rarity = c.rarity || rarityOf(c)` first)
3. **Template**: paste `badges-button.html` inside `<div class="dx-scout">` (after Pip's button), and
   `badge-toast.html` under the `dx-pip-fly` line near the end of the template.
4. **Closing the list**: add `badgesOpen.value = false` back to `closeVibes()`, `openQuiz()` and the Escape key in `onKey()`.
5. **Styles**: paste `badges.css` into the scoped `<style>`, and add `.dx-toast :deep(.pg)` and
   `.dx-badges-btn:focus-visible` back to their shared rules if you like.
