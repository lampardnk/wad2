<template>
  <!-- "Invite people" panel: link + quick share + who's on the trip -->
  <!-- inline = shown inside a page (trip setup) instead of as a pop-up -->
  <div :class="inline ? 'ts-inline' : 'ts-backdrop'" @click.self="inline || $emit('close')">
    <section class="ts" :class="{ flat: inline }" :role="inline ? null : 'dialog'" :aria-modal="inline ? null : 'true'"
      :aria-labelledby="inline ? null : 'ts-title'" tabindex="-1" ref="box" @keydown.esc="inline || $emit('close')">
      <header v-if="!inline" class="ts-head">
        <div>
          <h2 id="ts-title" class="ts-title">Invite to {{ tripName }}</h2>
          <p class="ts-muted mb-0">Invite friends by username, or send them a link.</p>
        </div>
        <button type="button" class="btn-close" aria-label="Close" @click="$emit('close')"></button>
      </header>

      <!-- Invite someone who already has an account -->
      <div class="ts-find">
        <label for="ts-user" class="ts-label">Invite by username</label>
        <div class="ts-search">
          <span class="ts-at" aria-hidden="true">@</span>
          <input id="ts-user" v-model="query" autocomplete="off" spellcheck="false" autocapitalize="none" placeholder="username"
            role="combobox" aria-autocomplete="list" aria-controls="ts-results" :aria-expanded="results.length > 0" @input="onType" data-testid="invite-username">
          <span v-if="searching" class="ts-muted small me-2" aria-hidden="true">…</span>
        </div>
        <ul v-if="results.length" id="ts-results" class="ts-results">
          <li v-for="u in results" :key="u.id" class="ts-result">
            <span class="ts-av sm" :style="{ background: '#2a78d6' }" aria-hidden="true">{{ u.name.charAt(0).toUpperCase() }}</span>
            <span class="flex-grow-1">
              <strong>{{ u.name }}</strong> <span class="ts-muted small">@{{ u.username }}</span>
            </span>
            <span v-if="u.status === 'member'" class="ts-muted small">On this trip</span>
            <span v-else-if="u.status === 'invited'" class="ts-muted small">Invited ✓</span>
            <button v-else type="button" class="ts-invite" :disabled="inviting === u.id" @click="inviteUser(u)" data-testid="invite-user">
              {{ inviting === u.id ? 'Inviting…' : 'Invite' }}
            </button>
          </li>
        </ul>
        <p v-else-if="query.replace('@', '').trim().length >= 3 && !searching && searched" class="ts-muted small mt-2 mb-0">
          No account starts with "@{{ query.replace('@', '').trim() }}". Send them the link instead.
        </p>
        <p v-else-if="query && query.replace('@', '').trim().length < 3" class="ts-muted small mt-2 mb-0">Type at least 3 letters.</p>
        <p v-if="inviteMsg" class="ts-ok" role="status">{{ inviteMsg }}</p>
      </div>

      <div class="ts-or"><span>or share the link</span></div>

      <!-- Link -->
      <div class="ts-link" :class="{ copied }">
        <span class="ts-link-icon" aria-hidden="true">🔗</span>
        <label for="ts-url" class="visually-hidden">Invite link</label>
        <input id="ts-url" :value="link || 'Making a link…'" readonly @focus="$event.target.select()">
        <button type="button" class="ts-copy" :disabled="!link" @click="copy" data-testid="invite-copy">
          {{ copied ? 'Copied ✓' : 'Copy link' }}
        </button>
      </div>
      <p v-if="error" class="ts-error" role="alert">{{ error }}</p>


      <!-- Quick share -->
      <div class="ts-share">
        <a class="ts-app" :href="'https://wa.me/?text=' + encodeURIComponent(message)" target="_blank" rel="noopener">
          <span class="ts-app-icon" style="background:#25d366" aria-hidden="true">💬</span>WhatsApp
        </a>
        <a class="ts-app" :href="'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(shortMessage)" target="_blank" rel="noopener">
          <span class="ts-app-icon" style="background:#2aabee" aria-hidden="true">✈️</span>Telegram
        </a>
        <a class="ts-app" :href="'mailto:?subject=' + encodeURIComponent('Join ' + tripName + ' on Chui-se Your Trip') + '&body=' + encodeURIComponent(message)">
          <span class="ts-app-icon" style="background:#5f6f6b" aria-hidden="true">✉️</span>Email
        </a>
        <button v-if="canNativeShare" type="button" class="ts-app" @click="nativeShare">
          <span class="ts-app-icon" style="background:#1f2d2a" aria-hidden="true">⋯</span>More
        </button>
      </div>

      <!-- People -->
      <h3 class="ts-sub">On this trip <span class="ts-count">{{ members.length }} joined<template v-if="pending.length"> · {{ pending.length }} invited</template> · {{ guests.length }} not yet</span></h3>
      <ul class="ts-people">
        <li v-for="m in members" :key="m.id" class="ts-person">
          <span class="ts-av" :style="{ background: colorFor(m.name) }" aria-hidden="true">{{ m.name.charAt(0).toUpperCase() }}</span>
          <span class="flex-grow-1">
            <strong>{{ m.name }}</strong><span v-if="m.name === me" class="ts-muted"> (you)</span>
            <span class="d-block ts-muted small">{{ m.role === 'owner' ? 'Organiser' : 'Joined' }}</span>
          </span>
          <span v-if="m.role === 'owner'" class="ts-badge">Organiser</span>
          <template v-else-if="role === 'owner' && m.name !== me">
            <button v-if="confirmRemove !== m.id" type="button" class="ts-text-btn" @click="confirmRemove = m.id">Remove</button>
            <span v-else class="d-flex gap-1">
              <button type="button" class="ts-text-btn danger" @click="removeMember(m)">Remove {{ m.name }}</button>
              <button type="button" class="ts-text-btn" @click="confirmRemove = null">Keep</button>
            </span>
          </template>
        </li>
        <li v-for="p in pending" :key="'p-' + p.id" class="ts-person">
          <span class="ts-av invited" aria-hidden="true">{{ (p.name || '?').charAt(0).toUpperCase() }}</span>
          <span class="flex-grow-1">
            <strong>{{ p.name }}</strong> <span class="ts-muted small">@{{ p.username }}</span>
            <span class="d-block ts-muted small">Invited by {{ p.invitedBy === me ? 'you' : p.invitedBy }} · waiting for them to join</span>
          </span>
          <button v-if="role === 'owner' || String(p.invitedById) === String(myId)" type="button" class="ts-text-btn" @click="cancelInvite(p)">Cancel invite</button>
        </li>
        <li v-for="g in guests" :key="'g-' + g" class="ts-person guest">
          <span class="ts-av guest" aria-hidden="true">{{ g.charAt(0).toUpperCase() }}</span>
          <span class="flex-grow-1">
            <strong>{{ g }}</strong>
            <span class="d-block ts-muted small">No account yet · can still be in expenses and votes</span>
          </span>
          <button type="button" class="ts-text-btn" :aria-label="'Remove ' + g" @click="removeGuest(g)">Remove</button>
        </li>
      </ul>

      <!-- Someone going who won't make an account -->
      <form v-if="addingGuest" class="ts-guest-form" @submit.prevent="addGuest">
        <label for="ts-guest" class="visually-hidden">Their name</label>
        <input id="ts-guest" ref="guestInput" v-model="guestName" class="ts-guest-input" maxlength="40" placeholder="Their name, e.g. Mum">
        <button type="submit" class="ts-invite" :disabled="!guestName.trim()">Add</button>
        <button type="button" class="ts-text-btn" @click="addingGuest = false">Cancel</button>
      </form>
      <button v-else type="button" class="ts-text-btn mt-2" @click="openGuestForm">+ Add someone without an account</button>
      <p v-if="guestError" class="ts-error" role="alert">{{ guestError }}</p>

      <footer class="ts-foot">
        <template v-if="role === 'owner'">
          <button v-if="!confirmReset" type="button" class="ts-text-btn" @click="confirmReset = true">Reset link</button>
          <span v-else class="d-flex align-items-center gap-2 flex-wrap">
            <span class="small ts-muted">The old link will stop working.</span>
            <button type="button" class="ts-text-btn danger" @click="resetLink">Reset</button>
            <button type="button" class="ts-text-btn" @click="confirmReset = false">Cancel</button>
          </span>
        </template>
        <template v-else>
          <button v-if="!confirmLeave" type="button" class="ts-text-btn danger" @click="confirmLeave = true">Leave trip</button>
          <span v-else class="d-flex align-items-center gap-2 flex-wrap">
            <span class="small ts-muted">You'll need a new invite to come back.</span>
            <button type="button" class="ts-text-btn danger" @click="leave">Leave</button>
            <button type="button" class="ts-text-btn" @click="confirmLeave = false">Stay</button>
          </span>
        </template>
        <button v-if="!inline" type="button" class="ts-done ms-auto" @click="$emit('close')">Done</button>
      </footer>
    </section>
  </div>
</template>

<script>
import axios from 'axios'
import { auth } from '../auth.js'

const AVATAR_COLORS = ['#0b7f5f', '#2a78d6', '#d0662e', '#7a5bd6', '#c2477d', '#2b8c99']

export default {
  props: {
    tripId: { type: String, required: true },
    tripName: { type: String, default: '' },
    members: { type: Array, default: () => [] },     // [{ id, name, role }]
    travellers: { type: Array, default: () => [] },
    role: { type: String, default: 'member' },       // my role
    pendingInvites: { type: Array, default: () => [] }, // [{ id, name, username, invitedBy, invitedById }]
    inline: { type: Boolean, default: false },
    me: { type: String, default: '' }
  },
  emits: ['close', 'changed', 'left'],

  data() {
    return {
      code: '',
      copied: false,
      error: '',
      confirmRemove: null,
      confirmReset: false,
      confirmLeave: false,
      canNativeShare: typeof navigator !== 'undefined' && !!navigator.share,
      pending: this.pendingInvites.slice(),
      people: this.travellers.slice(), // everyone going (updated when guests are added/removed)
      addingGuest: false,
      guestError: '',
      guestName: '',
      query: '',
      results: [],
      searching: false,
      searched: false,
      searchTimer: null,
      inviting: null,
      inviteMsg: ''
    }
  },

  computed: {
    myId() {
      return auth.user ? auth.user.id : ''
    },
    link() {
      return this.code ? window.location.origin + '/join/' + this.code : ''
    },
    // Travellers who haven't joined with an account
    guests() {
      const names = this.members.map((m) => m.name)
      return this.people.filter((t) => !names.includes(t))
    },
    shortMessage() {
      return 'Join our trip "' + this.tripName + '" on Chui-se Your Trip'
    },
    message() {
      return this.shortMessage + ': ' + this.link
    }
  },

  async created() {
    await this.getLink(false)
  },

  mounted() {
    if (!this.inline) this.$refs.box.focus()
  },

  methods: {
    colorFor(name) {
      const i = Math.max(0, this.people.indexOf(name))
      return AVATAR_COLORS[i % AVATAR_COLORS.length]
    },

    async getLink(reset) {
      this.error = ''
      try {
        const res = await axios.post('/api/trips/' + this.tripId + '/invite', { reset })
        this.code = res.data.code
      } catch (err) {
        this.error = (err.response && err.response.data && err.response.data.message) || 'Could not make a link. Is the server running?'
      }
    },

    async copy() {
      try {
        await navigator.clipboard.writeText(this.link)
      } catch (err) {
        // Older browsers: select the text so the user can copy it
        document.getElementById('ts-url').select()
        document.execCommand('copy')
      }
      this.copied = true
      setTimeout(() => { this.copied = false }, 2000)
    },

    nativeShare() {
      navigator.share({ title: this.tripName, text: this.shortMessage, url: this.link }).catch(() => {})
    },

    // Wait until typing pauses, then look up usernames
    onType() {
      this.inviteMsg = ''
      this.searched = false
      clearTimeout(this.searchTimer)
      this.searchTimer = setTimeout(this.search, 250)
    },

    async search() {
      const q = this.query.replace('@', '').trim().toLowerCase()
      if (q.length < 3) {
        this.results = []
        return
      }
      this.searching = true
      try {
        const res = await axios.get('/api/invites/users', { params: { q, trip: this.tripId } })
        if (q === this.query.replace('@', '').trim().toLowerCase()) this.results = res.data // ignore older answers
      } catch (err) {
        this.results = []
      }
      this.searching = false
      this.searched = true
    },

    async inviteUser(u) {
      this.inviting = u.id
      this.error = ''
      try {
        const res = await axios.post('/api/trips/' + this.tripId + '/invites', { userId: u.id })
        this.pending = res.data
        u.status = 'invited'
        this.inviteMsg = '✓ Invited ' + u.name + '. They\'ll see it on their home page.'
      } catch (err) {
        this.error = (err.response && err.response.data && err.response.data.message) || 'Could not send the invite.'
      }
      this.inviting = null
    },

    async cancelInvite(p) {
      try {
        const res = await axios.delete('/api/trips/' + this.tripId + '/invites/' + p.id)
        this.pending = res.data
        for (const r of this.results) if (r.id === p.id) r.status = ''
      } catch (err) {
        this.error = (err.response && err.response.data && err.response.data.message) || 'Could not cancel the invite.'
      }
    },

    openGuestForm() {
      this.addingGuest = true
      this.$nextTick(() => this.$refs.guestInput.focus())
    },

    async addGuest() {
      this.guestError = ''
      try {
        const res = await axios.post('/api/trips/' + this.tripId + '/guests', { name: this.guestName })
        this.people = res.data.travellers
        this.guestName = ''
        this.addingGuest = false
        this.$emit('changed')
      } catch (err) {
        this.guestError = (err.response && err.response.data && err.response.data.message) || 'Could not add them.'
      }
    },

    async removeGuest(name) {
      this.guestError = ''
      try {
        const res = await axios.delete('/api/trips/' + this.tripId + '/guests/' + encodeURIComponent(name))
        this.people = res.data.travellers
        this.$emit('changed')
      } catch (err) {
        this.guestError = (err.response && err.response.data && err.response.data.message) || 'Could not remove them.'
      }
    },

    async resetLink() {
      await this.getLink(true)
      this.confirmReset = false
    },

    async removeMember(m) {
      try {
        await axios.delete('/api/trips/' + this.tripId + '/members/' + m.id)
        this.confirmRemove = null
        this.$emit('changed')
      } catch (err) {
        this.error = (err.response && err.response.data && err.response.data.message) || 'Could not remove them.'
      }
    },

    async leave() {
      try {
        await axios.delete('/api/trips/' + this.tripId + '/members/' + auth.user.id)
        this.$emit('left')
      } catch (err) {
        this.error = (err.response && err.response.data && err.response.data.message) || 'Could not leave the trip.'
      }
    }
  }
}
</script>

<style scoped>
.ts-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1050;
  background: rgba(11, 18, 16, 0.5);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: ts-fade 0.2s ease;
}
.ts {
  width: min(520px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.25);
  outline: none;
  animation: ts-pop 0.22s ease;
}
.ts-inline .ts.flat {
  width: 100%;
  max-height: none;
  overflow: visible;
  box-shadow: none;
  border: 1px solid #e3e9e7;
  animation: none;
}
.ts-guest-form {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}
.ts-guest-input {
  flex: 1;
  min-width: 0;
  border: 1.5px solid #e3e9e7;
  border-radius: 999px;
  padding: 7px 14px;
  outline: none;
}
.ts-guest-input:focus {
  border-color: #0b7f5f;
}
.ts-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}
.ts-title {
  font-family: 'Fredoka', sans-serif;
  font-size: 1.4rem;
  margin: 0 0 2px;
}
.ts-muted {
  color: #5f6f6b;
}
.ts-link {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f4f7f6;
  border: 1.5px solid #e3e9e7;
  border-radius: 999px;
  padding: 5px 5px 5px 14px;
  transition: border-color 0.2s;
}
.ts-link.copied {
  border-color: #0b7f5f;
}
.ts-link input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: #1f2d2a;
}
.ts-copy {
  border: 0;
  border-radius: 999px;
  background: #1f2d2a;
  color: #dcf5a6;
  font-weight: 600;
  padding: 8px 16px;
  white-space: nowrap;
}
.ts-link.copied .ts-copy {
  background: #0b7f5f;
  color: #fff;
}
.ts-error {
  color: #c0392b;
  font-size: 13px;
  margin: 8px 4px 0;
}
.ts-share {
  display: flex;
  gap: 8px;
  margin: 12px 0 22px;
}
.ts-find {
  margin-top: 4px;
}
.ts-label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
}
.ts-search {
  display: flex;
  align-items: center;
  border: 1.5px solid #e3e9e7;
  border-radius: 999px;
  padding: 2px 6px 2px 14px;
  transition: border-color 0.15s;
}
.ts-search:focus-within {
  border-color: #0b7f5f;
}
.ts-at {
  color: #5f6f6b;
  font-weight: 700;
}
.ts-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  padding: 8px 6px;
  background: transparent;
}
.ts-results {
  list-style: none;
  padding: 6px;
  margin: 6px 0 0;
  border: 1px solid #e3e9e7;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(16, 40, 34, 0.08);
}
.ts-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 12px;
}
.ts-result:hover {
  background: #f4f7f6;
}
.ts-invite {
  border: 0;
  border-radius: 999px;
  background: #0b7f5f;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  padding: 6px 14px;
}
.ts-invite:disabled {
  opacity: 0.6;
}
.ts-ok {
  color: #0b7f5f;
  font-size: 13px;
  font-weight: 600;
  margin: 8px 4px 0;
}
.ts-or {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 0 12px;
  color: #9aa8a4;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.ts-or::before,
.ts-or::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e3e9e7;
}
.ts-av.sm {
  width: 28px;
  height: 28px;
  font-size: 12px;
}
.ts-av.invited {
  background: #eaf1fb;
  color: #2a78d6;
  border: 2px solid #2a78d6;
}
.ts-app {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  border: 1px solid #e3e9e7;
  border-radius: 16px;
  background: #fff;
  color: #1f2d2a;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s, transform 0.15s;
}
.ts-app:hover {
  background: #f4f7f6;
  transform: translateY(-2px);
}
.ts-app-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.ts-sub {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 8px;
}
.ts-count {
  font-weight: 400;
  font-size: 13px;
  color: #5f6f6b;
  margin-left: 6px;
}
.ts-people {
  list-style: none;
  padding: 0;
  margin: 0;
}
.ts-person {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid #eef2f1;
}
.ts-person.guest strong {
  color: #5f6f6b;
}
.ts-av {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ts-av.guest {
  background: #fff;
  color: #9aa8a4;
  border: 2px dashed #c5d0cd;
}
.ts-badge {
  font-size: 12px;
  font-weight: 600;
  background: #eef4f2;
  color: #0b7f5f;
  border-radius: 999px;
  padding: 3px 10px;
}
.ts-text-btn {
  border: 0;
  background: none;
  color: #0b7f5f;
  font-weight: 600;
  font-size: 13px;
  padding: 4px 6px;
  border-radius: 8px;
}
.ts-text-btn:hover {
  background: #f4f7f6;
}
.ts-text-btn.danger {
  color: #c0392b;
}
.ts-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
}
.ts-done {
  border: 0;
  border-radius: 999px;
  background: #1f2d2a;
  color: #dcf5a6;
  font-weight: 600;
  padding: 9px 22px;
}
.ts-copy:focus-visible,
.ts-app:focus-visible,
.ts-text-btn:focus-visible,
.ts-invite:focus-visible,
.ts-done:focus-visible {
  outline: 3px solid rgba(11, 127, 95, 0.45);
  outline-offset: 2px;
}
@keyframes ts-fade {
  from { opacity: 0; }
}
@keyframes ts-pop {
  from { opacity: 0; transform: scale(0.97) translateY(8px); }
}
@media (max-width: 480px) {
  .ts {
    padding: 18px;
  }
  .ts-share {
    flex-wrap: wrap;
  }
  .ts-app {
    flex: 1 1 40%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ts, .ts-backdrop { animation: none; }
}
</style>
