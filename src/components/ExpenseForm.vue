<template>
  <!-- Slide-over panel for adding or editing one expense -->
  <div class="ef-backdrop" @click.self="$emit('close')">
    <form class="ef" role="dialog" aria-modal="true" aria-labelledby="ef-title" @submit.prevent="submit" @keydown.esc="$emit('close')">
      <header class="ef-head">
        <h3 id="ef-title" class="ef-title">{{ expense ? 'Edit expense' : 'New expense' }}</h3>
        <button type="button" class="btn-close" aria-label="Close" @click="$emit('close')"></button>
      </header>

      <div class="ef-body">
        <!-- Amount: the most important field, so it is the biggest -->
        <div class="ef-amount" :class="{ bad: tried && !(form.amount > 0) }">
          <label for="ef-amount" class="visually-hidden">Amount</label>
          <CustomDropdown v-model="form.currency" :options="currencyOptions" size="sm" class="ef-currency"
            header-text="Currency" aria-label="Currency" />
          <input id="ef-amount" ref="amount" v-model.number="form.amount" type="number" min="0" step="any" inputmode="decimal"
            placeholder="0.00" data-testid="expense-amount">
        </div>
        <p v-if="form.currency !== homeCurrency && form.amount > 0" class="ef-hint">
          <template v-if="rates[form.currency]">≈ {{ money(toHome(form.amount, form.currency, rates), homeCurrency) }}</template>
          <template v-else>No {{ form.currency }} rate yet, so this won't count in the totals until one is set.</template>
        </p>
        <p v-if="tried && !(form.amount > 0)" class="ef-error" role="alert">Enter an amount above 0</p>

        <label for="ef-what" class="ef-label">What was it for?</label>
        <input id="ef-what" v-model="form.title" class="form-control ef-input" maxlength="80" placeholder="e.g. Korean BBQ dinner"
          :aria-invalid="tried && !form.title.trim()" data-testid="expense-title">
        <p v-if="tried && !form.title.trim()" class="ef-error" role="alert">Give it a short name</p>

        <span class="ef-label">Category</span>
        <div class="ef-cats" role="radiogroup" aria-label="Category">
          <button v-for="c in CATEGORIES" :key="c.key" type="button" role="radio" class="ef-cat" :class="{ on: form.category === c.key }"
            :aria-checked="form.category === c.key" @click="form.category = c.key">
            <span class="ef-cat-icon" aria-hidden="true">{{ c.icon }}</span>{{ c.label }}
          </button>
        </div>

        <div class="row g-3">
          <div class="col-sm-6">
            <label for="ef-paid" class="ef-label">Paid by</label>
            <CustomDropdown id="ef-paid" v-model="form.paidBy" :options="payerOptions" block header-text="Paid by" />
          </div>
          <div class="col-sm-6">
            <label for="ef-date" class="ef-label">Date</label>
            <input id="ef-date" v-model="form.date" type="date" class="form-control ef-input">
          </div>
        </div>

        <!-- Split -->
        <div class="d-flex justify-content-between align-items-center mt-3">
          <span class="ef-label mb-0">Split</span>
          <div class="ef-seg" role="radiogroup" aria-label="How to split">
            <button type="button" role="radio" :aria-checked="form.splitType === 'equal'" :class="{ on: form.splitType === 'equal' }" @click="form.splitType = 'equal'">Equally</button>
            <button type="button" role="radio" :aria-checked="form.splitType === 'exact'" :class="{ on: form.splitType === 'exact' }" @click="form.splitType = 'exact'">Exact amounts</button>
          </div>
        </div>

        <ul class="ef-people">
          <li v-for="p in travellers" :key="p" class="ef-person">
            <template v-if="form.splitType === 'equal'">
              <label class="ef-check">
                <input v-model="form.people" type="checkbox" :value="p">
                <span class="ef-avatar" aria-hidden="true">{{ p.charAt(0).toUpperCase() }}</span>
                {{ p }}{{ p === me ? ' (you)' : '' }}
              </label>
              <span class="ef-share">{{ form.people.includes(p) && form.amount > 0 ? money(form.amount / form.people.length, form.currency) : '—' }}</span>
            </template>
            <template v-else>
              <label :for="'ef-x-' + p" class="ef-check">
                <span class="ef-avatar" aria-hidden="true">{{ p.charAt(0).toUpperCase() }}</span>
                {{ p }}{{ p === me ? ' (you)' : '' }}
              </label>
              <input :id="'ef-x-' + p" v-model.number="form.exact[p]" type="number" min="0" step="any" class="form-control ef-exact" placeholder="0">
            </template>
          </li>
        </ul>
        <p v-if="form.splitType === 'equal' && !form.people.length" class="ef-error" role="alert">Pick at least one person</p>
        <p v-if="form.splitType === 'exact'" class="ef-remaining" :class="{ ok: Math.abs(remaining) < 0.01, bad: tried && Math.abs(remaining) >= 0.01 }" role="status">
          {{ Math.abs(remaining) < 0.01 ? '✓ Adds up' : (remaining > 0 ? money(remaining, form.currency) + ' left to assign' : money(-remaining, form.currency) + ' too much') }}
        </p>
      </div>

      <footer class="ef-foot">
        <template v-if="expense">
          <button v-if="!confirmDelete" type="button" class="btn ef-delete" @click="confirmDelete = true">Delete</button>
          <span v-else class="d-flex align-items-center gap-2">
            <span class="small">Delete for everyone?</span>
            <button type="button" class="btn btn-sm btn-danger" @click="$emit('delete', expense.id)">Yes, delete</button>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="confirmDelete = false">Keep</button>
          </span>
        </template>
        <span class="ms-auto d-flex gap-2">
          <button type="button" class="btn ef-ghost" @click="$emit('close')">Cancel</button>
          <button type="submit" class="btn ef-save" data-testid="expense-save">{{ expense ? 'Save changes' : 'Add expense' }}</button>
        </span>
      </footer>
    </form>
  </div>
</template>

<script>
import { CATEGORIES, CURRENCIES, currencyOptions, money, toHome } from '../expenses.js'
import CustomDropdown from './CustomDropdown.vue'

export default {
  components: { CustomDropdown },
  props: {
    expense: { type: Object, default: null }, // null = new expense
    travellers: { type: Array, required: true },
    me: { type: String, default: '' },
    homeCurrency: { type: String, default: 'SGD' },
    lastCurrency: { type: String, default: '' },
    rates: { type: Object, default: () => ({}) },
    defaultDate: { type: String, default: '' }
  },
  emits: ['save', 'delete', 'close'],

  data() {
    const e = this.expense
    const exact = {}
    for (const p of this.travellers) exact[p] = e && e.exact && e.exact[p] ? e.exact[p] : null
    return {
      CATEGORIES,
      CURRENCIES,
      currencyOptions: currencyOptions(),
      tried: false,
      confirmDelete: false,
      form: {
        title: e ? e.title : '',
        amount: e ? e.amount : null,
        currency: e ? e.currency : this.lastCurrency || this.homeCurrency,
        category: e ? e.category : 'food',
        paidBy: e ? e.paidBy : this.me || this.travellers[0],
        date: e ? e.date : this.defaultDate,
        splitType: e ? e.splitType : 'equal',
        people: e && e.splitType === 'equal' ? e.people.slice() : this.travellers.slice(),
        exact
      }
    }
  },

  computed: {
    payerOptions() {
      const list = []
      for (const p of this.travellers) list.push({ value: p, label: p + (p === this.me ? ' (you)' : '') })
      return list
    },
    // Exact split: how much of the total is not given to anyone yet
    remaining() {
      let given = 0
      for (const p of this.travellers) given += Number(this.form.exact[p]) || 0
      return (Number(this.form.amount) || 0) - given
    }
  },

  mounted() {
    this.$refs.amount.focus()
  },

  methods: {
    money,
    toHome,

    submit() {
      this.tried = true
      const f = this.form
      if (!(f.amount > 0) || !f.title.trim() || !f.date) return
      if (f.splitType === 'equal' && !f.people.length) return
      if (f.splitType === 'exact' && Math.abs(this.remaining) >= 0.01) return

      const exact = {}
      if (f.splitType === 'exact') {
        for (const p of this.travellers) {
          if (Number(f.exact[p]) > 0) exact[p] = Number(f.exact[p])
        }
      }
      this.$emit('save', {
        id: this.expense ? this.expense.id : 'e' + Date.now(),
        title: f.title.trim(),
        amount: Number(f.amount),
        currency: f.currency,
        category: f.category,
        paidBy: f.paidBy,
        date: f.date,
        splitType: f.splitType,
        people: f.splitType === 'equal' ? f.people.slice() : [],
        exact
      })
    }
  }
}
</script>

<style scoped>
.ef-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background: rgba(0, 30, 46, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: flex-end;
  animation: ef-fade 0.2s ease;
}
.ef {
  width: min(460px, 100%);
  height: 100%;
  background: #fbf5ea;
  display: flex;
  flex-direction: column;
  box-shadow: -20px 0 40px rgba(0, 0, 0, 0.18);
  animation: ef-slide 0.25s ease;
}
.ef-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 12px;
}
.ef-title {
  font-family: var(--font-display);
  font-size: 1.4rem;
  margin: 0;
}
.ef-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 24px 24px;
}
.ef-amount {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f6f2ea;
  border: 2px solid transparent;
  border-radius: 20px;
  padding: 10px 14px;
}
.ef-amount:focus-within {
  border-color: #00798c;
}
.ef-amount.bad {
  border-color: #d1495b;
}
.ef-currency {
  flex: none;
  width: 92px;
}
.ef-amount input {
  border: 0;
  background: transparent;
  font-size: 2.2rem;
  font-weight: 700;
  width: 100%;
  font-variant-numeric: tabular-nums;
  outline: none;
}
/* No spinner arrows on the big amount */
.ef-amount input::-webkit-outer-spin-button,
.ef-amount input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.ef-amount input[type='number'] {
  -moz-appearance: textfield;
}
.ef-hint {
  font-size: 13px;
  color: #5a6b78;
  margin: 6px 4px 0;
}
.ef-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #5a6b78;
  margin: 16px 0 6px;
}
.ef-input {
  border-radius: 14px;
}
.ef-error {
  color: #d1495b;
  font-size: 13px;
  margin: 4px 4px 0;
}
.ef-cats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.ef-cat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border: 1.5px solid #e6dfd2;
  background: #fbf5ea;
  border-radius: 16px;
  padding: 10px 4px;
  font-size: 13px;
  font-weight: 500;
}
.ef-cat-icon {
  font-size: 20px;
}
.ef-cat.on {
  border-color: #003d5b;
  background: #003d5b;
  color: #edae49;
}
.ef-seg {
  display: inline-flex;
  background: #f4efe6;
  border-radius: 999px;
  padding: 3px;
}
.ef-seg button {
  border: 0;
  background: transparent;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #5a6b78;
}
.ef-seg button.on {
  background: #fbf5ea;
  color: #003d5b;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
.ef-people {
  list-style: none;
  padding: 0;
  margin: 10px 0 0;
}
.ef-person {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid #efe9df;
}
.ef-check {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  cursor: pointer;
}
.ef-check input {
  width: 18px;
  height: 18px;
  accent-color: #00798c;
}
.ef-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #00798c;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ef-share {
  font-variant-numeric: tabular-nums;
  color: #5a6b78;
}
.ef-exact {
  width: 130px;
  border-radius: 12px;
  text-align: right;
}
.ef-remaining {
  margin: 8px 4px 0;
  font-size: 13px;
  font-weight: 600;
  color: #9a6b00;
}
.ef-remaining.ok {
  color: #00798c;
}
.ef-remaining.bad {
  color: #d1495b;
}
.ef-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid #efe9df;
}
.ef-save {
  background: #003d5b;
  color: #edae49;
  border-radius: 999px;
  padding: 8px 20px;
  font-weight: 600;
}
.ef-save:hover {
  background: #00798c;
  color: #fff;
}
.ef-ghost {
  border-radius: 999px;
  border: 1px solid #e6dfd2;
}
.ef-delete {
  color: #d1495b;
  border-radius: 999px;
}
.ef-delete:hover {
  background: #fbe7ea;
}
.ef-cat:focus-visible,
.ef-seg button:focus-visible,
.ef-save:focus-visible {
  outline: 3px solid rgba(0, 121, 140, 0.45);
  outline-offset: 2px;
}
@keyframes ef-slide {
  from { transform: translateX(40px); opacity: 0; }
  to { transform: none; opacity: 1; }
}
@keyframes ef-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .ef, .ef-backdrop { animation: none; }
}
</style>
