# Expenses & Split — UI specification

The Expenses tab of a trip. Borrows one idea from each reference app, in the Chui-se Your Trip look
(dark green `#1f2d2a`, mint `#6ff2bd`, lime `#dcf5a6`, Fredoka headings, Inter body, pill controls, 20–24px radius cards).

| Borrowed from | Pattern used here |
|---|---|
| **Splitwise** | "Who owes whom" balances, fewest-payments **Settle up**, "you lent / you owe" on every expense |
| **Copilot Money** | Dark hero tile with total + budget bar, category breakdown, per-day spending bars |
| **Wanderlog** | Expenses grouped by trip day ("Day 2 · Tue 13 Oct"), any currency with live conversion |
| **Linear** | Slide-over editor, `N` keyboard shortcut, quiet borders, tabular numbers, hover rows |

## Layout (desktop → mobile)

```
┌ Toolbar ─────────────────────────────────────────────────────────────┐
│ Viewing as [Sarah▾]  Show totals in [SGD▾]  Live rates · 9 Oct  [+ Add expense N] │
├ Summary tiles ───────────────────────────────────────────────────────┤
│ ███ Group spent (dark) │ Your balance ↑/↓ │ Your share │ Per day      │
│ budget bar 59% of 1,500│                  │            │              │
├ Feed (1.5fr) ──────────────────────┬ Side (1fr) ─────────────────────┤
│ Expenses 7          [🔍 Search]     │ Balances (diverging bars)       │
│ [All][🍜 Food][🏨 Stay]…            │ Settle up: Amy pays John [Mark paid]│
│ Day 3 · Wed 14 Oct     SGD 166     │ Where it went (stacked bar+legend)│
│ 🍜 Korean BBQ   KRW 120,000        │ Per day (bars, hover for value)  │
│    John paid · split equally  you owe SGD 38 │                       │
└────────────────────────────────────┴─────────────────────────────────┘
```
Below 992px the side column moves under the feed and the tiles become 2×2. Below 480px the tiles stack.

## Components

| File | Role |
|---|---|
| `src/expenses.js` | Pure logic: categories, currencies, `money()`, `toHome()`, `sharesOf()`, `balances()`, `settleUp()`, demo data |
| `src/components/ExpensesView.vue` | Container: state, saving, exchange rates, toolbar, tiles, feed, balances, charts |
| `src/components/ExpenseForm.vue` | Slide-over editor for one expense (add / edit / delete) |
| `server/routes/rates.js` | `GET /api/rates?base=SGD` — live ECB rates via Frankfurter (free, no key), cached 6 h |
| `server/routes/trips.js` | `PUT /api/trips/:id/expenses` — validates and saves; `GET` returns `expenses` |

## Data

```js
trip.expenses = {
  homeCurrency: 'SGD', budget: 1500,            // budget optional
  items: [{ id, title, amount, currency, category, paidBy, date,
            splitType: 'equal' | 'exact', people: [...], exact: { name: amount } }],
  settlements: [{ id, from, to, amount, date }]  // amount in home currency
}
```
Balances: payer gets **+amount**, each person in the split gets **−share** (converted to the home currency);
a settlement moves money back. Settle up repeatedly pairs the biggest debtor with the biggest creditor,
which gives at most *n − 1* payments.

## Interaction & states

- **Add**: `+ Add expense` or press **N** (ignored while typing). Panel focuses the amount; **Esc** or backdrop closes.
- **Edit / delete**: click any expense row → same panel with **Delete** (asks "Delete for everyone?" first).
- **Split**: *Equally* (tick who shares, live "each pays …") or *Exact amounts* (live "SGD 12 left to assign" / "✓ Adds up").
- **Validation**: amount > 0, a name, at least one person, exact amounts must add up — errors shown under the field.
- **Currency**: each expense keeps its own currency; totals convert to "Show totals in". If rates fail, a warning shows
  and amounts are not converted (never silently wrong).
- **Settle up**: *Mark paid* records a payment; *Payments made* lists them with *Undo*.
- **Filters**: category chips and the category legend both filter the feed; search matches name or payer.
- **Empty**: illustration + "Add the first expense". **Saving**: autosaves 0.5 s after a change, shows "Saved ✓" or an error.
- **Demo trip (Seoul)**: pre-filled example data, not saved.

## Heuristics checklist (Nielsen)

1. Visibility of status — live totals, budget %, "Saving… / Saved ✓", rates date.
2. Match the real world — "you owe / you lent / gets back", currency codes, trip days.
3. User control — Cancel/Esc, Undo on payments, confirm before delete.
4. Consistency — same pills, chips, colours and radii as the rest of the app.
5. Error prevention — exact-split total check, amount/name required, currency always visible.
6. Recognition over recall — category icons, avatars, "(you)" labels, payer names on each row.
7. Flexibility — `N` shortcut, filters, viewing as any traveller, any home currency.
8. Minimal design — numbers first, secondary text muted, details only on hover/edit.
9. Recover from errors — inline messages saying exactly what to fix.
10. Help — empty state explains the feature; tab description mentions the `N` shortcut.

## Charts & colour

- Categories use 6 fixed colours (blue, orange, aqua, yellow, pink, green) checked for colour-blind separation;
  every colour also has an icon, a name and a number in the legend, so colour is never the only cue.
- Balances use a diverging bar from a centre line: green right = gets back, red left = owes, always with the words "gets" / "owes".
- Per-day bars: one green series, 2px gaps, rounded tops; hover or keyboard focus shows the day and amount.
- Money uses tabular numbers so columns line up.
