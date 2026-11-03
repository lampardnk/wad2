# Expenses & Split — UI specification

The Expenses tab of a trip. Borrows one idea from each reference app, in the app's light card look
(ink `#003d5b`, muted `#5a6b78`, lines `#e6dfd2`, positive teal `#00798c`, negative red `#c4472e`, `--font-display` headings, tabular numbers).

| Borrowed from | Pattern used here |
|---|---|
| **Splitwise** | "Who owes whom" balances, fewest-payments **Settle up**, "you lent / you owe" on every expense |
| **Copilot Money** | Dark hero tile with total + budget bar, category breakdown, per-day spending bars |
| **Wanderlog** | Expenses grouped by trip day, any currency with live conversion |
| **Linear** | Slide-over editor, `N` keyboard shortcut, quiet borders, tabular numbers, hover rows |

## Layout (desktop → mobile)

```
┌ Toolbar ─────────────────────────────────────────────────────────────────────┐
│ Show totals in [SGD▾]  ● Synced with the group  [Live rates ▾]  [+ Add expense N] │
├ Summary tiles ───────────────────────────────────────────────────────────────┤
│ ███ Group spent (dark) │ Your balance ↑/↓ │ Your share │ Per day              │
│ budget bar 59% of 1,500│                  │            │                      │
├ Feed ──────────────────────────────┬ Side ──────────────────────────────────┤
│ Expenses 7              [🔍 Search] │ Balances (diverging bars)               │
│ [Category ▾]                       │ Settle up: Amy pays John [Mark paid]    │
│ Day 3 · 14 Oct          SGD 166    │ Where it went (stacked bar + legend)    │
│ 🍜 Korean BBQ   KRW 120,000        │ Per day (bars, hover for value)         │
│    John paid · split equally  you owe SGD 38 │                              │
└────────────────────────────────────┴─────────────────────────────────────────┘
```
Below 992px the side column moves under the feed and the tiles become 2×2. Below 480px the tiles stack.

## Components

| File | Role |
|---|---|
| `src/expenses.js` | Pure logic: `CATEGORIES`, `CURRENCIES`, `money()`, `toHome()`, `sharesOf()`, `balances()`, `settleUp()`, `demoExpenses()`, `currencyOptions()` |
| `src/components/ExpensesView.vue` | Container: state, saving, polling, rates, toolbar, tiles, feed, balances, charts |
| `src/components/ExpenseForm.vue` | Slide-over editor for one expense (add / edit / delete) |
| `src/components/ExchangeRates.vue` | "Live rates" popover: shows rates, lets the group set its own rate for a currency |
| `server/routes/rates.js` | `GET /api/rates?base=SGD` — ECB rates via Frankfurter (free, no key), cached 6 h in MongoDB |
| `server/routes/expenses.js` | Mounted at `/api/trips/:tripId/expenses`; one change per request (see below) |

## Data

```js
trip.expenses = {
  homeCurrency: 'SGD', budget: 1500,            // budget optional (null)
  items: [{ id, title, amount, currency, category, paidBy, date,
            splitType: 'equal' | 'exact', people: [...], exact: { name: amount },
            addedBy, updatedAt }],
  settlements: [{ id, from, to, amount, date }], // amount in home currency
  groupRates: { JPY: { base, rate, by, at } }    // the group's own rates, override live ones
}
```
Categories: food, stay, transport, activities, shopping, other. Amounts are kept to the cent.

Balances: payer gets **+amount**, each person in the split gets **−share** (converted to the home currency);
a settlement moves money back. Settle up repeatedly pairs the biggest debtor with the biggest creditor,
which gives at most *n − 1* payments.

## API (one change at a time, MongoDB `$push` / `$pull` / `$set`)
`GET /` · `POST /items` · `PUT /items/:itemId` · `DELETE /items/:itemId` · `POST /settlements` · `DELETE /settlements/:settlementId` ·
`PUT /rates/:code { rate }` · `DELETE /rates/:code` · `PATCH /settings { homeCurrency?, budget? }`.
Every answer is the latest expenses from everyone.

## Interaction & states

- **Add**: `+ Add expense` or press **N** (ignored while typing). Panel focuses the amount; **Esc** or backdrop closes.
- **Edit / delete**: click any expense row → same panel with **Delete** (asks "Delete for everyone?" first).
- **Split**: *Equally* (tick who shares; each person's share shows live next to their name) or *Exact amounts* (live "SGD 12 left to assign" / "✓ Adds up").
- **Validation**: amount > 0, a name, at least one person, exact amounts must add up — errors shown under the field. The server checks again.
- **Currency**: each expense keeps its own currency; totals convert to "Show totals in". Rates come from the group's own rate if set, else live rates. An expense with no rate is left out of the totals and a warning says which currencies (never silently wrong).
- **Settle up**: *Mark paid* records a payment; *Payments made* lists them with *Undo*.
- **Filters**: the category dropdown and the "Where it went" legend both filter the feed; search matches name or payer.
- **Empty**: "No expenses yet" + "Add the first expense".
- **Saving**: each change is saved straight away; the toolbar shows "Saving…", then "Saved ✓" or the error.
- **Others' changes**: polled every 15 s; new items from others show as a toast. Rows show "added by …" when someone else logged them.
- **Archived trip**: read only (no add, edit, budget or rates).
- **Demo trip (Seoul)**: pre-filled example data, not saved, no polling.

## Heuristics checklist (Nielsen)

1. Visibility of status — live totals, budget %, "Saving… / Saved ✓", "Synced with the group", rates date.
2. Match the real world — "you owe / you lent / gets back", currency codes, trip days.
3. User control — Cancel/Esc, Undo on payments, confirm before delete.
4. Consistency — same pills, cards, colours and radii as the rest of the app; the shared CustomDropdown.
5. Error prevention — exact-split total check, amount/name required, currency always visible.
6. Recognition over recall — category icons, avatars, "(you)" labels, payer names on each row.
7. Flexibility — `N` shortcut, filters, any home currency, the group's own exchange rates.
8. Minimal design — numbers first, secondary text muted, details only on hover/edit.
9. Recover from errors — inline messages saying exactly what to fix.
10. Help — empty state explains the feature; tab description mentions the `N` shortcut.

## Charts & colour

- Categories use 6 fixed colours (blue, orange, green, yellow, pink, dark green; see `CATEGORIES`);
  every colour also has an icon, a name and a number in the legend, so colour is never the only cue.
- Balances use a diverging bar from a centre line: right = gets back, left = owes, always with the words "gets" / "owes".
- Per-day bars (shown when there is more than one day): hover or keyboard focus shows the day and amount.
- Money uses tabular numbers so columns line up.
