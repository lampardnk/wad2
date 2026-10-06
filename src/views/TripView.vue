<template>
  <div>
    <div class="card p-4 mb-4 bg-dark text-white">
      <h2>Seoul, South Korea</h2>
      <p class="mb-0 text-white-50">12 Oct – 17 Oct | Travellers: Sarah, John, Amy</p>
    </div>

    <!-- Safety banner: shown on every tab when SafetyLayer reports High/Critical risk -->
    <div v-if="safetyWarning" class="alert alert-danger d-flex justify-content-between align-items-center">
      <span>⚠️ {{ safetyWarning }}</span>
      <button class="btn btn-sm btn-outline-danger" @click="activeTab = 'safety'">View safety</button>
    </div>

    <ul class="nav nav-pills mb-4">
      <li class="nav-item me-2">
        <button class="btn btn-sm" :class="activeTab === 'itinerary' ? 'btn-primary' : 'btn-outline-secondary'" @click="activeTab = 'itinerary'">Itinerary & Weather</button>
      </li>
      <li class="nav-item me-2">
        <button class="btn btn-sm" :class="activeTab === 'voting' ? 'btn-primary' : 'btn-outline-secondary'" @click="activeTab = 'voting'">Group Decisions</button>
      </li>
      <li class="nav-item me-2">
        <button class="btn btn-sm" :class="activeTab === 'packing' ? 'btn-primary' : 'btn-outline-secondary'" @click="activeTab = 'packing'">Packing List</button>
      </li>
      <li class="nav-item me-2">
        <button class="btn btn-sm" :class="activeTab === 'expenses' ? 'btn-primary' : 'btn-outline-secondary'" @click="activeTab = 'expenses'">Expenses & Split</button>
      </li>
      <li class="nav-item">
        <button class="btn btn-sm" :class="activeTab === 'safety' ? 'btn-primary' : 'btn-outline-secondary'" @click="activeTab = 'safety'" data-testid="safety-tab">Safety</button>
      </li>
    </ul>

    <div v-if="activeTab === 'itinerary'">
      <ItineraryView />
    </div>
    <div v-if="activeTab === 'voting'">
      <GroupVoting />
    </div>
    <div v-if="activeTab === 'packing'">
      <PackingView />
    </div>
    <div v-if="activeTab === 'expenses'">
      <ExpensesView />
    </div>
    <!--
      v-show (not v-if) keeps SafetyLayer mounted when you switch tabs,
      so live location tracking and alerts keep running in the background.
    -->
    <div v-show="activeTab === 'safety'">
      <SafetyLayer @risk-change="handleRiskChange" />
    </div>
  </div>
</template>

<script>
import ItineraryView from '../components/ItineraryView.vue'
import GroupVoting from '../components/GroupVoting.vue'
import PackingView from '../components/PackingView.vue'
import ExpensesView from '../components/ExpensesView.vue'
import SafetyLayer from '../components/SafetyLayer.vue'

export default {
  components: { ItineraryView, GroupVoting, PackingView, ExpensesView, SafetyLayer },
  data() {
    return {
      activeTab: 'itinerary',
      safetyWarning: ''
    }
  },
  methods: {
    /*
      handleRiskChange()
      Listens to the "risk-change" event from SafetyLayer.
      When the risk score is 50+ (High/Critical), it shows a banner on
      every tab so the group knows to rethink outdoor activities.
      This is how the safety layer feeds into the adaptive itinerary.
    */
    handleRiskChange(risk) {
      if (risk.score >= 50) {
        this.safetyWarning = `${risk.label} risk near ${risk.location?.city || 'you'}. Consider swapping outdoor activities.`
      } else {
        this.safetyWarning = ''
      }
    }
  }
}
</script>