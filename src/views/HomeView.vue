<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2>Your Trips</h2>
      <button class="btn btn-primary btn-sm" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? 'Cancel' : '+ Create New Trip' }}
      </button>
    </div>

    <!-- Inline form -->
    <form v-if="showCreateForm" class="card p-3 mb-4 bg-white" @submit.prevent="createTrip">
      <h5>Create New Trip</h5>
      <div class="row g-2">
        <div class="col-md-6">
          <label for="trip-name" class="form-label">Trip name</label>
          <input id="trip-name" type="text" class="form-control" v-model="newTrip.name" maxlength="80" placeholder="e.g. Kyoto Adventure">
        </div>
        <div class="col-md-6">
          <label for="trip-dest" class="form-label">Destination</label>
          <input id="trip-dest" type="text" class="form-control" v-model="newTrip.destination" maxlength="80" placeholder="e.g. Kyoto, Japan">
        </div>
        <div class="col-6 col-md-3">
          <label for="trip-start" class="form-label">Start date</label>
          <input id="trip-start" type="date" class="form-control" v-model="newTrip.startDate">
        </div>
        <div class="col-6 col-md-3">
          <label for="trip-end" class="form-label">End date</label>
          <input id="trip-end" type="date" class="form-control" v-model="newTrip.endDate" :min="newTrip.startDate">
        </div>
        <div class="col-md-6">
          <label for="trip-people" class="form-label">Travellers <span class="text-muted small">(names, separated by commas. Ignored for shared trips, which show the group members)</span></label>
          <input id="trip-people" type="text" class="form-control" v-model="newTrip.travellers" placeholder="e.g. Sarah, John, Amy">
        </div>
        <div class="col-md-6">
          <label for="trip-group" class="form-label">Share with group</label>
          <select id="trip-group" class="form-select" v-model="newTrip.group">
            <option value="">Just me (private)</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
      </div>
      <p v-if="formError" class="text-danger small mt-2 mb-0" role="alert">{{ formError }}</p>
      <div>
        <button type="submit" class="btn btn-success btn-sm mt-3" :disabled="saving">{{ saving ? 'Saving…' : 'Save Trip' }}</button>
      </div>
    </form>

    <p v-if="loadError" class="alert alert-warning small">{{ loadError }}</p>

    <!-- Family groups -->
    <div class="card p-3 mb-4 bg-white">
      <h5>Family groups</h5>
      <p class="small text-muted">Trips shared with a group can be opened and edited by every member. Give your invite code to the people you travel with.</p>
      <div class="row g-2 mb-2">
        <form class="col-md-6 d-flex gap-2" @submit.prevent="createGroup">
          <label for="group-name" class="visually-hidden">New group name</label>
          <input id="group-name" v-model="newGroupName" class="form-control form-control-sm" maxlength="60" placeholder="New group name, e.g. Tan Family">
          <button type="submit" class="btn btn-outline-primary btn-sm text-nowrap">Create group</button>
        </form>
        <form class="col-md-6 d-flex gap-2" @submit.prevent="joinGroup">
          <label for="join-code" class="visually-hidden">Invite code</label>
          <input id="join-code" v-model="joinCode" class="form-control form-control-sm" maxlength="6" placeholder="Invite code, e.g. K7TQ2M">
          <button type="submit" class="btn btn-outline-primary btn-sm text-nowrap">Join group</button>
        </form>
      </div>
      <p v-if="groupError" class="text-danger small mb-2" role="alert">{{ groupError }}</p>
      <p v-if="!groups.length" class="text-muted small mb-0">You are not in any group yet.</p>
      <div v-for="g in groups" :key="g.id" class="border-top py-2 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <strong>{{ g.name }}</strong>
          <span class="badge bg-light text-dark border ms-2">Code: {{ g.inviteCode }}</span>
          <div class="small text-muted">{{ memberNames(g) }}</div>
        </div>
        <button v-if="g.isOwner" type="button" class="btn btn-outline-danger btn-sm" @click="deleteGroup(g)">Delete group</button>
        <button v-else type="button" class="btn btn-outline-secondary btn-sm" @click="leaveGroup(g)">Leave</button>
      </div>
    </div>

    <div class="row">
      <!-- Demo trip (all features are built around this one) -->
      <div class="col-md-4 mb-3">
        <div class="card p-3 bg-white h-100">
          <span class="badge bg-primary mb-2 align-self-start">South Korea · demo</span>
          <h4>Seoul Trip</h4>
          <p class="text-muted small">12 Oct – 17 Oct | 3 Travellers</p>
          <p class="text-danger small">Weather Warning: Rain expected Day 2.</p>
          <router-link to="/trip/seoul" class="btn btn-outline-primary btn-sm mt-auto align-self-start">Open Trip</router-link>
        </div>
      </div>

      <!-- Trips saved by this user, or shared with their groups -->
      <div v-for="t in trips" :key="t.id" class="col-md-4 mb-3">
        <div class="card p-3 bg-white h-100">
          <div class="mb-2">
            <span class="badge bg-secondary">{{ t.destination }}</span>
            <span v-if="t.group" class="badge bg-info-subtle text-info-emphasis ms-1">Shared · {{ groupLabel(t.group) }}</span>
          </div>
          <h4>{{ t.name }}</h4>
          <p class="text-muted small mb-1">{{ dateRange(t) }} | {{ t.travellers.length }} {{ t.travellers.length === 1 ? 'Traveller' : 'Travellers' }}</p>
          <p class="text-muted small">{{ t.travellers.join(', ') }}</p>
          <div class="d-flex gap-2 mt-auto">
            <router-link :to="'/trip/' + t.id" class="btn btn-outline-primary btn-sm">Open Trip</router-link>
            <button v-if="t.isOwner" class="btn btn-outline-danger btn-sm" @click="removeTrip(t)">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <p v-if="!loading && !trips.length && !loadError" class="text-muted small">Trips you create will appear here.</p>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  data() {
    return {
      trips: [],
      groups: [],
      loading: true,
      loadError: '',
      showCreateForm: false,
      saving: false,
      formError: '',
      newTrip: { name: '', destination: '', startDate: '', endDate: '', travellers: '', group: '' },
      newGroupName: '',
      joinCode: '',
      groupError: ''
    }
  },
  async mounted() {
    await this.loadGroups()
    await this.loadTrips()
    this.loading = false
  },
  methods: {
    // ---------- loading ----------
    async loadTrips() {
      try {
        const res = await axios.get('/api/trips')
        this.trips = res.data
        this.loadError = ''
      } catch (err) {
        this.loadError = 'Could not load your trips. Is the server running?'
      }
    },
    async loadGroups() {
      try {
        const res = await axios.get('/api/groups')
        this.groups = res.data
      } catch (err) {
        this.groupError = 'Could not load your groups. Is the server running?'
      }
    },

    // The server's message if it sent one, otherwise a general one
    errorText(err, fallback) {
      if (err.response && err.response.data && err.response.data.message) return err.response.data.message
      return fallback
    },

    // ---------- groups ----------
    memberNames(group) {
      return group.members.map((m) => m.name).join(', ')
    },
    groupLabel(groupId) {
      const group = this.groups.find((g) => g.id === groupId)
      return group ? group.name : 'group'
    },
    async createGroup() {
      this.groupError = ''
      const name = this.newGroupName.trim()
      if (!name) {
        this.groupError = 'Please enter a group name.'
        return
      }
      try {
        const res = await axios.post('/api/groups', { name })
        this.groups.unshift(res.data)
        this.newGroupName = ''
      } catch (err) {
        this.groupError = this.errorText(err, 'Could not create the group. Is the server running?')
      }
    },
    async joinGroup() {
      this.groupError = ''
      const code = this.joinCode.trim()
      if (!code) {
        this.groupError = 'Please enter an invite code.'
        return
      }
      try {
        const res = await axios.post('/api/groups/join', { code })
        // Already in the list? Update it. Otherwise add it.
        const index = this.groups.findIndex((g) => g.id === res.data.id)
        if (index === -1) this.groups.unshift(res.data)
        else this.groups[index] = res.data
        this.joinCode = ''
        await this.loadTrips() // trips shared with this group now show up
      } catch (err) {
        this.groupError = this.errorText(err, 'Could not join the group. Is the server running?')
      }
    },
    async leaveGroup(group) {
      if (!confirm('Leave "' + group.name + '"? You will lose access to its shared trips.')) return
      this.groupError = ''
      try {
        await axios.post('/api/groups/' + group.id + '/leave')
        await this.loadGroups()
        await this.loadTrips()
      } catch (err) {
        this.groupError = this.errorText(err, 'Could not leave the group. Try again.')
      }
    },
    async deleteGroup(group) {
      if (!confirm('Delete "' + group.name + '"? Its trips become private to whoever created them.')) return
      this.groupError = ''
      try {
        await axios.delete('/api/groups/' + group.id)
        await this.loadGroups()
        await this.loadTrips()
      } catch (err) {
        this.groupError = this.errorText(err, 'Could not delete the group. Try again.')
      }
    },

    // ---------- trips ----------
    async createTrip() {
      this.formError = ''
      const name = this.newTrip.name.trim()
      const destination = this.newTrip.destination.trim()
      if (!name || !destination) {
        this.formError = 'Please enter a trip name and destination.'
        return
      }
      if (this.newTrip.startDate && this.newTrip.endDate && this.newTrip.endDate < this.newTrip.startDate) {
        this.formError = 'The end date must be on or after the start date.'
        return
      }
      this.saving = true
      try {
        const res = await axios.post('/api/trips', {
          name,
          destination,
          startDate: this.newTrip.startDate,
          endDate: this.newTrip.endDate,
          travellers: this.newTrip.travellers.split(','),
          group: this.newTrip.group
        })
        this.trips.unshift(res.data)
        this.newTrip = { name: '', destination: '', startDate: '', endDate: '', travellers: '', group: '' }
        this.showCreateForm = false
      } catch (err) {
        this.formError = this.errorText(err, 'Could not save the trip. Is the server running?')
      }
      this.saving = false
    },
    async removeTrip(trip) {
      if (!confirm('Delete "' + trip.name + '"? This cannot be undone.')) return
      try {
        await axios.delete('/api/trips/' + trip.id)
        this.trips = this.trips.filter((t) => t.id !== trip.id)
      } catch (err) {
        this.loadError = 'Could not delete that trip. Try again.'
      }
    },
    dateRange(t) {
      if (!t.startDate) return 'Dates not set'
      const fmt = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      return t.endDate ? fmt(t.startDate) + ' – ' + fmt(t.endDate) : 'From ' + fmt(t.startDate)
    }
  }
}
</script>