# CustomDropdown: the app's one dropdown

`src/components/CustomDropdown.vue` replaces every native `<select>`. Dark navy trigger (`#0a3550` → `#00283c`), frosted menu (blur 16px), gold `#edae49` focus ring and checkmark, chevron rotates 180°, spring scale+fade entrance, hover nudge. Opens upwards when there is no room below. Closes on click outside, Esc, Tab, page scroll or resize. Arrow keys, Home and End move through the options.

## Props
| Prop | Default | Notes |
|---|---|---|
| `v-model` | `null` | Any value (string, number, null). Numbers stay numbers, so no `.number` needed. |
| `options` | `[]` | Plain values (`['SGD', 'JPY']`) or objects `{ value, label, icon, flag, description, short, disabled }`. `icon` is a line icon name or an emoji (drawn as its line icon); `flag` is a country code like `'JP'` |
| `placeholder` | `'Select…'` | Shown when nothing matches `v-model` |
| `header-text` | `''` | Small caps title at the top of the menu |
| `disabled` | `false` | |
| `searchable` | auto | On when there are more than 8 options |
| `size` | `'md'` | `'sm'` 32px · `'md'` 40px · `'lg'` 44px pill |
| `block` | `false` | Full width |
| `id`, `aria-label`, `testid` | | `id` goes on the trigger button so `<label for>` still works |

Events: `update:modelValue`, `change(value)`. Slots: `#selected="{ option }"` (trigger content), `#option="{ option, selected }"` (menu row).

The menu is teleported to `<body>`, so cards with `overflow: hidden` and modals don't cut it off. Keys typed in the menu don't reach page shortcuts.

## Replacing a `<select>` (3 steps)
1. Import it: `import CustomDropdown from './CustomDropdown.vue'` (in `<script setup>` that is all; with the Options API also add `components: { CustomDropdown }`).
2. Build the options once (data or computed), with a plain for-loop:
   ```js
   currencyChoices() {
     const list = []
     for (const c of CURRENCIES) list.push({ value: c, label: c })
     return list
   }
   ```
3. Swap the markup:
   ```html
   <!-- before -->
   <select v-model="form.currency"><option v-for="c in CURRENCIES" :value="c">{{ c }}</option></select>
   <!-- after -->
   <CustomDropdown v-model="form.currency" :options="currencyChoices" header-text="Currency" size="sm" />
   ```
   - `@change="fn($event.target.value)"` becomes `@update:model-value="fn"` (it receives the value).
   - `<option :value="null">Auto</option>` becomes `{ value: null, label: 'Auto' }`.

## Where it is used
Expenses home currency + category filter · Expense form currency + paid by · Exchange rates currency · Photos "move to album" · Wishlist kind of place, day, "booked on" · Places vote sort · Phone country code (Crew, Settings) · Itinerary stop picker + crowd simulator · Stop sheet "move to" · Overflow sheet · Schedule panel and Settings day start/end, crowds, travel buffer, longest walk · Trip tabs (sections + "more") · Flight delay demo · Safety demo tools · Transport (Other journeys) day.

The only `<select>` left in `src/` is the comment in `CustomDropdown.vue` itself.
