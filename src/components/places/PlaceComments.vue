<template>
  <!-- Comments on one saved place: anyone on the trip can add one and delete their own (the organiser can delete any). No editing. -->
  <div class="pc">
    <p v-if="!list.length && readOnly" class="pc-empty">No comments on this place.</p>
    <ol v-if="list.length" class="pc-list">
      <li v-for="c in list" :key="c.id" class="pc-item" :class="{ mine: c.mine }">
        <p class="pc-meta"><strong>{{ c.mine ? 'You' : c.name }}</strong> <span>{{ timeAgo(c.at) }}</span></p>
        <p class="pc-text">{{ c.text }}</p>
        <div v-if="confirmId === c.id" class="pc-confirm" role="alert">
          Delete this comment?
          <button type="button" class="pc-btn danger" :disabled="busy" @click="remove(c)">Delete</button>
          <button type="button" class="pc-btn" @click="confirmId = null">Keep</button>
        </div>
        <button v-else-if="c.canDelete && !readOnly" type="button" class="pc-del" :aria-label="'Delete comment by ' + c.name"
          @click="confirmId = c.id"><AppIcon name="trash" :size="13" /></button>
      </li>
    </ol>
    <form v-if="!readOnly" class="pc-form" @submit.prevent="add">
      <label :for="'pc-' + wishId" class="visually-hidden">Comment on {{ placeName }}</label>
      <input :id="'pc-' + wishId" ref="input" v-model="draft" class="pc-input" maxlength="500" placeholder="e.g. Worth it at sunset" data-testid="comment-input">
      <button type="submit" class="pc-btn primary" :disabled="!draft.trim() || busy">Post</button>
    </form>
  </div>
</template>

<script>
import AppIcon from '../common/AppIcon.vue'
import { commentsOn, addPlaceComment, deletePlaceComment } from '../../lib/trip/placeComments.js'

export default {
  components: { AppIcon },
  inject: { readOnly: { default: false } },
  props: {
    tripId: { type: String, required: true },
    wishId: { type: String, required: true },     // for the input's id
    placeName: { type: String, required: true }   // whose comments: the thread is per place name
  },
  data() {
    return { draft: '', busy: false, confirmId: null }
  },
  computed: {
    list() {
      return commentsOn(this.placeName)
    }
  },
  methods: {
    focus() {
      if (this.$refs.input) this.$refs.input.focus()
    },
    async add() {
      const text = this.draft.trim()
      if (!text) return
      this.busy = true
      if (await addPlaceComment(this.tripId, this.placeName, text)) this.draft = ''
      this.busy = false
    },
    async remove(c) {
      this.busy = true
      if (await deletePlaceComment(this.tripId, c.id)) this.confirmId = null
      this.busy = false
    },
    // "just now", "5 min ago", "3 h ago", "12 Oct"
    timeAgo(at) {
      const min = Math.round((Date.now() - new Date(at).getTime()) / 60000)
      if (min < 1) return 'just now'
      if (min < 60) return min + ' min ago'
      if (min < 24 * 60) return Math.round(min / 60) + ' h ago'
      return new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    }
  }
}
</script>

<style scoped>
.pc-empty { margin: 0; font-size: 13px; color: #6b7c88; }
.pc-list { list-style: none; margin: 0 0 8px; padding: 0; display: grid; gap: 6px; }
.pc-item { position: relative; padding: 7px 34px 7px 10px; border-radius: 10px; background: #fbf5ea; }
.pc-item.mine { background: #e6f4f1; }
.pc-meta { margin: 0; font-size: 12px; color: #6b7c88; }
.pc-meta strong { color: #12324a; margin-right: 4px; }
.pc-text { margin: 2px 0 0; font-size: 14px; color: #12324a; white-space: pre-wrap; overflow-wrap: anywhere; }
.pc-del { position: absolute; top: 6px; right: 6px; display: grid; place-items: center; width: 24px; height: 24px; border: 0; border-radius: 6px; background: none; color: #6b7c88; }
.pc-del:hover { background: #fde2e4; color: #b42318; }
.pc-confirm { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 6px; font-size: 13px; font-weight: 600; color: #12324a; }
.pc-form { display: flex; gap: 6px; }
.pc-input { flex: 1; min-width: 0; padding: 6px 10px; border: 1.5px solid #e3cfa9; border-radius: 10px; background: #fff; color: #12324a; font-size: 14px; }
.pc-input:focus { outline: none; border-color: #00798c; }
.pc-btn { padding: 4px 12px; border: 1.5px solid #e3cfa9; border-radius: 10px; background: #fff; color: #12324a; font-size: 13px; font-weight: 700; }
.pc-btn.primary { background: #12324a; border-color: #12324a; color: #fff; }
.pc-btn.primary:disabled { opacity: 0.45; }
.pc-btn.danger { background: #b42318; border-color: #b42318; color: #fff; }
</style>
