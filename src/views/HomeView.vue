<template>
  <div class="home">
    <!-- ===== New account: a "campfire briefing" from our explorer, pointing them to Settings for their travel needs.
         A cream journal insert taped to the page, with stitching round the edge. ===== -->
    <transition name="slide">
      <section v-if="showSetup" class="setup" aria-labelledby="setup-title" data-testid="setup-prompt">
        <span class="setup-tape tl" aria-hidden="true"></span>
        <span class="setup-tape tr" aria-hidden="true"></span>

        <!-- the explorer in a round frame, with the greeting in his speech bubble -->
        <div class="setup-guide">
          <span class="setup-avatar" aria-hidden="true"><ExplorerMascot :hands="false" :size="150" /></span>
          <div class="setup-bubble">
            <p class="setup-kicker">Campfire briefing</p>
            <h2 id="setup-title" class="setup-title">Ahoy, {{ firstName || 'explorer' }}! Before we hit the trail, let’s pack your field essentials.</h2>
          </div>
        </div>

        <div class="setup-body">
          <p class="setup-sub">Your crew relies on your food preferences, currency, and pacing so we can plot the smoothest route together.</p>
          <!-- what to set up, as luggage tags -->
          <ul class="setup-list">
            <li><span class="setup-tag"><span class="setup-stamp"><DoodleIcon name="bowl" :size="20" anim="" /></span> Food needs &amp; allergies</span></li>
            <li><span class="setup-tag"><span class="setup-stamp"><DoodleIcon name="chat" :size="20" anim="" /></span> WhatsApp number</span></li>
            <li><span class="setup-tag"><span class="setup-stamp"><DoodleIcon name="wallet" :size="20" anim="" /></span> Base currency</span></li>
            <li><span class="setup-tag"><span class="setup-stamp"><DoodleIcon name="boot" :size="20" anim="" /></span> Trip pacing</span></li>
          </ul>
        </div>

        <div class="setup-btns">
          <button type="button" class="setup-go" @click="goSetup">Set up my needs <span aria-hidden="true">→</span></button>
          <button type="button" class="setup-later" @click="skipSetup">Later</button>
          <small class="setup-hint">
            <DoodleIcon name="gear" :size="16" anim="" />
            <span>Find it anytime in <span class="setup-path">Profile › Settings</span></span>
          </small>
        </div>
      </section>
    </transition>

    <!-- ===== Hero: you, your travel map (dotted routes for every trip) and your numbers ===== -->
    <section class="hero pl-pop-in" aria-labelledby="hero-title">
      <!-- The sun peeks over the card's top-left corner, the plane cruises over the top-right one. Tap them:
           the plane swoops down across the card on a new random route each time (always facing where
           it's going) and comes home; the sun spins and glows. -->
      <button type="button" class="hero-sun" :class="{ shine: sunShine }" aria-label="Make the sun shine" @click="shineSun">
        <span class="hero-sun-glow" aria-hidden="true"></span>
        <DoodleIcon name="sun" :size="62" anim="" />
      </button>
      <button ref="plane" type="button" class="hero-plane" :class="{ flying: planeFlying }" aria-label="Send the plane for a spin" @click="flyPlane">
        <span class="hero-plane-body" :style="planeStyle"><DoodleIcon name="plane" :size="46" anim="" /></span>
      </button>
      <div class="hero-top">
        <div class="hero-me">
          <!-- Your Travel Twin's face (or your initial) -->
          <span class="hero-avatar" aria-hidden="true">
            <img v-if="twin.picture" :src="twin.picture" alt="">
            <template v-else>{{ (firstName || '?').charAt(0).toUpperCase() }}</template>
          </span>
          <div>
            <p class="hero-hello">Hi{{ firstName ? ', ' + firstName : '' }}! Where to next?</p>
            <h1 id="hero-title" class="hero-title">Your travels</h1>
          </div>
        </div>
        <!-- Hidden while there are no trips: the "No trips yet" box below has the same two buttons -->
        <div v-if="!noTrips" class="hero-btns">
          <button class="pl-btn" @click="openForm" data-testid="new-trip-btn"><DoodleIcon name="plus" :size="22" tint="cream" /> Plan a new trip</button>
          <router-link to="/discover" class="pl-btn ghost"><DoodleIcon name="compass" :size="22" /> Help me choose</router-link>
        </div>
      </div>
      <div class="hero-grid">
        <TravelMap class="hero-map" :trips="mapTrips" :active-id="mapActive" :hover-id="hoverTrip"
          @hover="hoverTrip = $event" @open="(id) => $router.push('/trip/' + id)" />
        <ul class="hero-stats" aria-label="Your travel numbers">
          <li v-for="(st, i) in travelStats" :key="st.label" class="pl-hover-bounce" :class="'tint-' + i" :style="{ animationDelay: i * 0.06 + 's' }">
            <DoodleIcon :name="STAT_ICONS[i]" :size="26" anim="bounce" />
            <b>{{ st.value }}</b><span>{{ st.label }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- ===== Plan a new trip: the "Traveler's adventure notebook" pop-up ===== -->
    <NotebookModal :open="showCreateForm" title="Plan a new trip" :tip="notebookTip" @close="closeForm">
      <form ref="form" class="nbf" novalidate aria-label="New trip" @submit.prevent="createTrip" @focusin="onNotebookFocus">
        <!-- Trip name -->
        <div class="nbf-row">
          <label for="trip-name" class="nbf-label"><DoodleIcon name="ticket" :size="24" anim="" /> Trip name</label>
          <div class="nbf-field" :class="'is-' + states.name">
            <input id="trip-name" ref="nameInput" type="text" class="nbf-input" v-model="newTrip.name" maxlength="80"
              placeholder="e.g. Kyoto adventure" :aria-invalid="states.name === 'error'" aria-describedby="trip-name-msg"
              data-tip="name" @blur="touched.name = true" data-testid="trip-name">
            <DoodleIcon v-if="states.name === 'success'" class="nbf-ok" name="check" :size="22" anim="" />
          </div>
          <p id="trip-name-msg" class="nbf-msg" :class="'is-' + states.name">{{ messages.name }}</p>
        </div>

        <!-- Destinations: quick picks + type-ahead -->
        <div class="nbf-row">
          <label for="trip-dest" class="nbf-label"><DoodleIcon name="pin" :size="24" anim="" /> Where to?</label>
          <div class="nbf-field" :class="'is-' + states.destination">
            <input id="trip-dest" type="text" class="nbf-input" v-model="newTrip.destination" maxlength="80"
              :placeholder="newTrip.destinations.length ? 'Add another stop…' : 'Type a city, e.g. Kyoto, Japan'" autocomplete="off"
              role="combobox" aria-autocomplete="list" aria-controls="dest-list"
              :aria-expanded="destOpen && destOptions.length > 0"
              :aria-activedescendant="destActive >= 0 ? 'dest-opt-' + destActive : null"
              :aria-invalid="states.destination === 'error'" aria-describedby="trip-dest-msg" data-tip="dest"
              @input="onDestInput" @keydown="onDestKeydown" @focus="destOpen = true" @blur="onDestBlur"
              data-testid="trip-destination">
            <span v-if="destLoading" class="nbf-spin" aria-hidden="true"></span>
            <ul v-if="destOpen && destOptions.length" id="dest-list" class="nbf-suggest" role="listbox" data-testid="dest-suggestions">
              <li v-for="(opt, k) in destOptions" :id="'dest-opt-' + k" :key="opt.label" role="option"
                class="nbf-suggest-item" :class="{ active: k === destActive }" :aria-selected="k === destActive"
                @mousedown.prevent="pickDestination(opt.label)" @mouseenter="destActive = k">
                <FlagImg :code="opt.code" :size="13" />
                <span>{{ opt.before }}<strong>{{ opt.match }}</strong>{{ opt.after }}</span>
              </li>
            </ul>
          </div>
          <!-- Chosen stops, in travel order -->
          <ol v-if="newTrip.destinations.length" class="nbf-stops" aria-label="Chosen destinations" data-testid="dest-chips">
            <li v-for="(d, k) in newTrip.destinations" :key="d" class="nbf-stop">
              <span class="nbf-stop-n">{{ k + 1 }}</span>
              <FlagImg :code="codeFor(d)" :size="12" />
              <span>{{ d }}</span>
              <span v-if="newTrip.destinations.length > 1" class="nbf-stop-move">
                <button type="button" :disabled="k === 0" :aria-label="'Move ' + d + ' earlier'" @click="moveDestination(k, -1)">
                  <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
                <button type="button" :disabled="k === newTrip.destinations.length - 1" :aria-label="'Move ' + d + ' later'" @click="moveDestination(k, 1)">
                  <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
              </span>
              <button type="button" class="nbf-stop-x" :aria-label="'Remove ' + d" @click="removeDestination(k)">
                <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
              </button>
            </li>
          </ol>
          <p id="trip-dest-msg" class="nbf-msg" :class="'is-' + states.destination">{{ messages.destination }}</p>
        </div>

        <!-- Dates + how long -->
        <div class="nbf-row">
          <span class="nbf-label" id="nbf-dates"><DoodleIcon name="calendar" :size="24" anim="" /> When?</span>
          <div class="nbf-dates" role="group" aria-labelledby="nbf-dates">
            <div class="nbf-field" :class="'is-' + states.startDate">
              <label for="trip-start" class="nbf-mini">Leaving</label>
              <input id="trip-start" type="date" class="nbf-input" v-model="newTrip.startDate" :min="todayStr" data-tip="dates" @click="openPicker"
                :aria-invalid="states.startDate === 'error'" @blur="touched.startDate = true">
            </div>
            <div class="nbf-field" :class="'is-' + states.endDate">
              <label for="trip-end" class="nbf-mini">Coming home</label>
              <input id="trip-end" type="date" class="nbf-input" v-model="newTrip.endDate" :min="newTrip.startDate || todayStr" data-tip="dates" @click="openPicker"
                :aria-invalid="states.endDate === 'error'" aria-describedby="trip-end-msg" @blur="touched.endDate = true">
            </div>
            <transition name="nbf-pop">
              <div v-if="formDays" :key="formDays" class="nbf-days" aria-live="polite">
                <b>{{ formDays }}</b><span>-day itinerary</span>
              </div>
            </transition>
          </div>
          <p class="nbf-msg" :class="'is-' + states.startDate">{{ messages.startDate }}</p>
          <p id="trip-end-msg" class="nbf-msg" :class="'is-' + states.endDate">{{ states.endDate === 'error' ? messages.endDate : '' }}</p>
        </div>

        <!-- Travel vibe (also ticks the matching activities for the packing list) -->
        <div class="nbf-row">
          <span class="nbf-label" id="nbf-vibe"><DoodleIcon name="sparkle" :size="24" anim="" /> Trip vibe <small>(pick any)</small></span>
          <div class="nbf-vibes" role="group" aria-labelledby="nbf-vibe">
            <button v-for="v in VIBES" :key="v.key" type="button" class="nbf-vibe" :class="{ on: newTrip.vibes.includes(v.key) }"
              :aria-pressed="newTrip.vibes.includes(v.key)" data-tip="vibe" @click="toggleVibe(v.key)">
              <DoodleIcon :name="v.icon" :size="38" anim="bounce" />
              <span>{{ v.label }}</span>
            </button>
          </div>
        </div>

        <p v-if="formError" class="nbf-msg is-error" role="alert" data-testid="trip-form-error">{{ formError }}</p>

        <div class="nbf-actions">
          <button type="button" class="nbf-later" @click="closeForm">Maybe later</button>
          <button type="submit" class="nbf-go" :disabled="saving" data-testid="trip-save">
            <DoodleIcon name="plane" :size="24" tint="cream" anim="" /> {{ saving ? 'Saving…' : 'Confirm Trip' }}
          </button>
        </div>
      </form>
    </NotebookModal>

    <!-- ===== Search + sort & filter ===== -->
    <div v-if="!noTrips" class="toolbar">
      <!-- Search: cream, chunky and soft, like Discover's (press "/" to jump here) -->
      <div class="search">
        <span class="search-icon" aria-hidden="true"><DoodleIcon name="search" :size="24" anim="" /></span>
        <label for="trip-search" class="visually-hidden">Search trips</label>
        <input id="trip-search" ref="searchEl" v-model="search" type="text" class="search-input" placeholder="Search trips or destinations"
          autocomplete="off" spellcheck="false" data-testid="trip-search" @keydown.esc="search = ''">
        <button v-if="search" type="button" class="search-clear" aria-label="Clear search" @click="search = ''; $refs.searchEl.focus()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <kbd v-else class="search-kbd" aria-hidden="true" title="Press / to search">/</kbd>
      </div>
      <!-- Sort & filter: a chunky button that opens a cream paper menu -->
      <div class="sortbox" @keydown.esc="sortOpen = false">
        <button type="button" class="sort-btn" :class="{ open: sortOpen }" aria-haspopup="true" :aria-expanded="sortOpen" data-testid="trip-sort"
          @click.stop="sortOpen = !sortOpen">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M7 4v15M3.5 15.5 7 19l3.5-3.5M17 20V5M13.5 8.5 17 5l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="sort-btn-text">{{ sortLabel }}</span>
          <span v-if="tripFilter !== 'all'" class="sort-badge">{{ tripFilter === 'group' ? 'Group' : 'Solo' }}</span>
          <svg class="sort-caret" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <transition name="sort-pop">
          <div v-if="sortOpen" class="sort-menu" role="menu" aria-label="Sort and filter trips" @click.stop>
            <p class="sort-head">Sort by</p>
            <button v-for="o in SORTS" :key="o.key" type="button" class="sort-item" :class="{ on: tripSort === o.key }"
              role="menuitemradio" :aria-checked="tripSort === o.key" @click="pickSort(o.key)">
              <DoodleIcon :name="o.doodle" :size="20" anim="" /> {{ o.label }}
              <span v-if="tripSort === o.key" class="sort-tick"><DoodleIcon name="check" :size="18" anim="" /></span>
            </button>
            <p class="sort-head">Show</p>
            <button v-for="o in TRIP_FILTERS" :key="o.key" type="button" class="sort-item" :class="{ on: tripFilter === o.key }"
              role="menuitemradio" :aria-checked="tripFilter === o.key" @click="pickFilter(o.key)">
              <DoodleIcon :name="o.doodle" :size="20" anim="" /> {{ o.label }}
              <span v-if="tripFilter === o.key" class="sort-tick"><DoodleIcon name="check" :size="18" anim="" /></span>
            </button>
          </div>
        </transition>
      </div>
    </div>

    <!-- ===== Invites waiting for me ===== -->
    <transition-group v-if="invites.length" name="list" tag="section" class="invites" aria-label="Trip invites">
      <article v-for="inv in invites" :key="inv.tripId" class="invite-card" data-testid="invite-card">
        <span class="invite-icon" aria-hidden="true"><AppIcon name="mail" :size="20" /></span>
        <div class="invite-text">
          <p class="mb-0"><strong>{{ inv.invitedBy }}</strong> invited you to <strong>{{ inv.name }}</strong></p>
          <p class="invite-meta mb-0">
            <template v-for="(d, k) in inv.destinations" :key="d"><span v-if="k > 0"> → </span>{{ flagFor(d) }} {{ shortPlace(d) }}</template>
            <template v-if="inv.startDate"> · {{ dateRange(inv) }}</template>
            · {{ inv.people }} going
          </p>
        </div>
        <div class="invite-actions">
          <button type="button" class="btn invite-decline" @click="declineInvite(inv)">Decline</button>
          <router-link :to="'/join/' + inv.code" class="btn invite-join" data-testid="invite-join">Join →</router-link>
        </div>
      </article>
    </transition-group>

    <!-- ===== Trips ===== -->
    <div class="trips-head">
      <h2 class="section-title">My Trips</h2>
      <!-- Planning / Upcoming / Archive (finished trips) -->
      <div v-if="!noTrips" class="stage-tabs" role="tablist" aria-label="Show trips">
        <button v-for="st in STAGES" :key="st.key" type="button" role="tab" class="stage-tab"
          :class="{ on: stage === st.key }" :aria-selected="stage === st.key" :data-testid="'stage-' + st.key"
          @click="stage = st.key">
          <DoodleIcon :name="st.doodle" :size="20" anim="" /> {{ st.label }} <span class="stage-count">{{ stageCounts[st.key] }}</span>
        </button>
      </div>
    </div>

    <!-- Passport book: an inked stamp for every place you've finished a trip to. Tap one to filter the trips below. -->
    <PassportBook v-if="stage === 'archive' && stamps.length" ref="passport" :stamps="stamps" :countries="countryCount"
      :holder="holderName" :picture="twin.picture" :active="stampFilter"
      :hide="ceremony ? ceremony.newPlaces : []" :landing="landing" @select="stampFilter = $event" />
    <p v-if="stampFilter && stage === 'archive'" class="stamp-filter" role="status">
      <DoodleIcon name="pin" :size="20" anim="" /> Showing trips to <strong>{{ shortPlace(stampFilter) }}</strong>
      <button type="button" class="stamp-filter-x" @click="stampFilter = ''">Show all</button>
    </p>

    <!-- "Trip complete!" stamping ceremony (once per finished trip) -->
    <StampCeremony :open="!!ceremony" :place="ceremony ? ceremony.place : ''" :date="ceremony ? ceremony.date : ''"
      :flag="ceremony ? ceremony.flag : ''" :trip-name="ceremony ? ceremony.name : ''" :more="ceremony ? ceremony.more : 0"
      :target-rect="stampSlot" @stamped="showPassport" @done="ceremonyDone" @close="ceremonyLater" />

    <div v-if="loadError" class="alert alert-warning d-flex justify-content-between align-items-center" role="alert">
      <span>{{ loadError }}</span>
      <button class="btn btn-sm btn-outline-secondary" @click="loadTrips">Try again</button>
    </div>

    <!-- Loading skeletons -->
    <div v-if="loading" class="trip-grid" aria-busy="true" aria-label="Loading trips">
      <div v-for="n in 3" :key="n" class="trip-card skeleton"></div>
    </div>

    <!-- Nothing matches the search -->
    <div v-else-if="!visibleTrips.length && (search || tripFilter !== 'all')" class="empty">
      <p v-if="search" class="mb-2">No {{ stageName.toLowerCase() }} trips match “{{ search }}”.</p>
      <p v-else class="mb-2">No {{ tripFilter }} trips in {{ stageName }}.</p>
      <button class="btn btn-sm btn-outline-primary" @click="clearFilters">Clear filters</button>
    </div>

    <!-- No trips at all yet (new account) -->
    <div v-else-if="!trips.length" class="empty" data-testid="no-trips">
      <p v-if="showCreateForm" class="mb-0"><strong>No trips yet.</strong> Fill in the form above to plan your first one.</p>
      <p v-else class="mb-2"><strong>No trips yet.</strong> Plan your first one, or let us suggest a place.</p>
      <div v-if="!showCreateForm" class="d-flex gap-2 justify-content-center flex-wrap">
        <button type="button" class="pl-btn" @click="openForm"><DoodleIcon name="plus" :size="22" tint="cream" /> Plan your first trip</button>
        <router-link to="/discover" class="pl-btn ghost"><DoodleIcon name="compass" :size="22" /> Help me choose</router-link>
      </div>
    </div>

    <!-- Archive is empty -->
    <div v-else-if="!visibleTrips.length && stage === 'archive'" class="empty">
      <p class="mb-0"><AppIcon name="archive" :size="17" /> Trips you've finished end up here.</p>
    </div>

    <!-- This tab is empty, but there are trips in the others -->
    <div v-else-if="!visibleTrips.length" class="empty">
      <p class="mb-0">No {{ stageName.toLowerCase() }} trips right now.</p>
    </div>

    <transition-group v-else name="list" tag="div" class="trip-grid">
      <!-- Each trip is a postcard: the photo in a cream frame, a status sticker on its corner,
           the name, dates and route on the card below. Tilted a little; straightens on hover. -->
      <article v-for="(t, i) in visibleTrips" :key="t.id" class="trip-card" :class="{ archived: stage === 'archive', lit: hoverTrip === t.id }" data-testid="trip-card"
        :style="{ '--tilt': CARD_TILT[i % CARD_TILT.length] }"
        @click="openCard($event, t)" @mouseenter="hoverTrip = t.id" @mouseleave="hoverTrip = ''" @focusin="hoverTrip = t.id" @focusout="hoverTrip = ''">
        <!-- status sticker over the photo's corner -->
        <span class="trip-status" :class="'status-' + statusFor(t).kind">
          <DoodleIcon :name="STATUS_DOODLE[statusFor(t).kind]" :size="16" anim="" /> {{ statusFor(t).label }}
        </span>
        <!-- the photo (an illustrated scene until the photo loads) -->
        <router-link :to="'/trip/' + t.id" class="trip-art" :class="'theme-' + themeFor(t.destinations[0])" :aria-label="'Open ' + t.name" tabindex="-1">
          <svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
            <circle cx="235" cy="38" r="16" class="sun" />
            <path d="M0 120 L70 50 L120 95 L170 40 L240 105 L300 70 L300 120 Z" class="mountain-back" />
            <path d="M0 120 Q60 80 120 100 T300 95 L300 120 Z" class="hill" />
          </svg>
          <img v-if="photos[t.destinations[0]]" :src="photos[t.destinations[0]]" class="trip-photo" alt="" loading="lazy">
          <span v-if="t.members && t.members.length > 1" class="trip-demo"><DoodleIcon name="users" :size="15" anim="" /> {{ t.members.length }}</span>
        </router-link>

        <div class="trip-body">
          <h3 class="trip-name fun">{{ t.name }}</h3>
          <p class="trip-dates"><DoodleIcon name="calendar" :size="16" anim="" /> {{ dateRange(t) }}<template v-if="tripLength(t)"> · {{ tripLength(t) }}</template></p>
          <!-- The route: each place joined by a dotted line, with its flag as a little stamp -->
          <ol class="trip-route" :aria-label="'Route: ' + t.destinations.map(shortPlace).join(', then ')">
            <li v-for="d in t.destinations" :key="d" class="trip-stop">
              <span class="nowrap"><span v-if="flagCode(d)" class="trip-stamp"><FlagImg :code="flagCode(d)" :size="12" /></span>
                <DoodleIcon v-else name="pin" :size="15" anim="" /> {{ shortPlace(d) }}</span>
            </li>
          </ol>

          <div class="trip-foot">
            <!-- Travellers as initials -->
            <div class="avatars" :aria-label="t.travellers.length + ' travellers: ' + t.travellers.join(', ')">
              <span v-for="(p, k) in t.travellers.slice(0, 4)" :key="k" class="avatar"
                :class="{ guest: t.members && !t.members.some((m) => m.name === p) }"
                :title="p + (t.members && !t.members.some((m) => m.name === p) ? ' (not joined yet)' : '')">{{ p.charAt(0).toUpperCase() }}</span>
              <span v-if="t.travellers.length > 4" class="avatar more">+{{ t.travellers.length - 4 }}</span>
            </div>

            <!-- Delete asks first, right inside the card -->
            <div v-if="confirmingId === t.id" class="trip-confirm" role="alert">
              <span>Delete?</span>
              <button type="button" class="trip-confirm-yes" @click="removeTrip(t)">Yes</button>
              <button type="button" class="trip-confirm-no" @click="confirmingId = null">No</button>
            </div>
            <button v-else-if="t.role === 'owner'" type="button" class="icon-btn" :aria-label="'Delete ' + t.name" title="Delete trip" @click="confirmingId = t.id"><AppIcon name="trash" :size="18" /></button>
            <span v-else-if="t.role === 'member'" class="shared-tag" title="You joined this trip"><DoodleIcon name="users" :size="15" anim="" /> Shared with you</span>
          </div>

          <router-link :to="'/trip/' + t.id" class="open-btn" data-testid="open-trip">Open trip →</router-link>
        </div>
      </article>

      <!-- "New trip": a blank postcard. No words: a plane on a dotted route, an empty stamp slot and a big "+".
           The whole card opens the trip form. -->
      <button v-if="stage !== 'archive'" key="new" type="button" class="trip-card new-tile" aria-label="Plan a new trip" title="Plan a new trip" @click="openForm">
        <span class="new-slot" aria-hidden="true">
          <!-- faint postmark ink behind everything -->
          <svg class="new-postmark" viewBox="0 0 200 110">
            <circle cx="55" cy="55" r="40" fill="none" stroke="currentColor" stroke-width="3" />
            <circle cx="55" cy="55" r="31" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path d="M100 30c12-8 22 8 34 0s22 8 34 0 18 6 26 2M100 55c12-8 22 8 34 0s22 8 34 0 18 6 26 2M100 80c12-8 22 8 34 0s22 8 34 0 18 6 26 2" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          </svg>
          <span class="new-stamp">Your stamp here</span>
          <!-- an inked rubber stamp in the middle of the card: "+ PLAN A TRIP" -->
          <span class="new-focus">
            <span class="new-ink">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
              Plan a trip
            </span>
          </span>
          <!-- the address lines, like the back of a postcard -->
          <span class="new-address">
            <span class="new-line"></span>
            <span class="new-line"></span>
            <span class="new-line"></span>
          </span>
        </span>
      </button>
    </transition-group>
  </div>
</template>

<script>
import axios from 'axios'
import { auth } from '../auth.js'
import { POPULAR_DESTINATIONS, codeForDestination, flagEmoji } from '../destinations.js'
import AppIcon from '../components/AppIcon.vue'
import TravelMap from '../components/TravelMap.vue'
import DoodleIcon from '../components/DoodleIcon.vue'
import PassportBook from '../components/PassportBook.vue'
import StampCeremony from '../components/StampCeremony.vue'
import NotebookModal from '../components/NotebookModal.vue'
import ExplorerMascot from '../components/ExplorerMascot.vue'
import FlagImg from '../components/FlagImg.vue'
import { avatar as twin, loadAvatar } from '../avatarStore.js'
import { needsSetup, setupDone } from '../onboarding.js'
import { friends } from '../friends.js'

const DAY_MS = 86400000

// Straight-line distance between two { lat, lon } points, in km
function kmBetween(a, b) {
  const r = Math.PI / 180
  const h = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

const STAGES = [
  { key: 'planning', label: 'Planning', doodle: 'map' },
  { key: 'upcoming', label: 'Upcoming', doodle: 'plane' },
  { key: 'archive', label: 'Archive', doodle: 'ticket' }
]
// Sort & filter choices for the trip cards
const SORTS = [
  { key: 'upcoming', label: 'Upcoming first', doodle: 'calendar' },
  { key: 'earliest', label: 'Earliest departure', doodle: 'plane' },
  { key: 'recent', label: 'Recently added / edited', doodle: 'sparkle' },
  { key: 'shortest', label: 'Shortest trip first', doodle: 'boot' }
]
const TRIP_FILTERS = [
  { key: 'all', label: 'All trips', doodle: 'suitcase' },
  { key: 'group', label: 'Group trips only', doodle: 'users' },
  { key: 'solo', label: 'Solo trips only', doodle: 'backpack' }
]
function readPref(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback
  } catch (err) {
    return fallback
  }
}
// Postcards sit a little crooked, like real ones (they straighten on hover)
const CARD_TILT = ['-1deg', '1.2deg', '-0.6deg', '1.5deg']
// A doodle for each trip status sticker
const STATUS_DOODLE = { none: 'map', upcoming: 'plane', ongoing: 'sun', past: 'check' }

export default {
  components: { AppIcon, TravelMap, DoodleIcon, PassportBook, StampCeremony, NotebookModal, FlagImg, ExplorerMascot },
  data() {
    return {
      planeStyle: {},      // where the plane is during its loop
      planeFlying: false, // the hero's paper plane is doing its loop
      sunShine: false,     // the hero's sun is spinning
      twin, // Travel Twin picture for the hero
      STAT_ICONS: ['suitcase', 'pin', 'map', 'calendar', 'plane'],
      showSetup: needsSetup(auth.user && auth.user.id), // just signed up: "set up your needs" card
      trips: [],
      loading: true,
      loadError: '',
      showCreateForm: false,
      saving: false,
      formError: '',
      // Which fields the user has left at least once (we only judge those)
      touched: { name: false, destination: false, startDate: false, endDate: false },
      icons: { success: '✓', error: '!', '': '' },
      // Destination type-ahead
      destOpen: false,
      destActive: -1,        // highlighted suggestion (keyboard / mouse)
      destRemote: [],        // results from the online place search
      destLoading: false,
      destTimer: null,
      confirmingId: null,
      search: '',
      // Sort & filter for the trip cards (remembered in this browser)
      tripSort: readPref('chuise-trip-sort', 'upcoming'),
      tripFilter: readPref('chuise-trip-filter', 'all'),
      sortOpen: false,
      SORTS,
      TRIP_FILTERS,
      stampFilter: '',   // a passport stamp that was tapped: only trips to that place
      ceremony: null,    // the trip being stamped: { tripId, name, place, date, flag, more, newPlaces }
      landing: '',       // the stamp that just landed in the passport
      STAGES,
      CARD_TILT,
      STATUS_DOODLE,
      stage: null, // 'planning' | 'upcoming' | 'archive' (picked once the trips load, see shownStage)
      // destination = what's being typed; destinations = the ones already added
      photos: {}, // destination -> photo url
      places: {}, // destination -> { lat, lon } for the travel map
      hoverTrip: '', // the trip being pointed at (its card and its route on the map light up together)
      invites: [], // trips I've been invited to by username
      friends, // shared numbers (new invites arrive here; see friends.js)
      newTrip: { name: '', destination: '', destinations: [], startDate: '', endDate: '', vibes: [] },
      notebookFocus: '',  // which part of the notebook is being filled in (Pip's tip follows it)
      // Trip vibes -> the packing list's activities
      VIBES: [
        { key: 'adventure', label: 'Adventure', icon: 'boot', activity: 'hiking' },
        { key: 'culinary', label: 'Culinary', icon: 'bowl', activity: 'food' },
        { key: 'leisure', label: 'Leisure', icon: 'lounger', activity: 'beach' },
        { key: 'culture', label: 'Culture', icon: 'pillar', activity: 'sightseeing' }
      ],
    }
  },

  async mounted() {
    document.addEventListener('click', this.closeSort) // a click anywhere else closes the sort menu
    document.addEventListener('keydown', this.slashToSearch)
    loadAvatar()
    // Coming from Discover ("Plan Tokyo"): open the form with the city and dates filled in
    const q = this.$route.query
    if (q.dest) {
      // One place, or several (a trip across a country)
      const dests = Array.isArray(q.dest) ? q.dest : [q.dest]
      for (const d of dests) this.pickDestination(String(d))
      this.newTrip.name = q.name ? String(q.name) : 'Trip to ' + String(dests[0]).split(', ')[0]
      if (q.start) this.newTrip.startDate = String(q.start)
      if (q.end) this.newTrip.endDate = String(q.end)
      this.openForm()
      this.$router.replace({ path: '/home' }) // so a refresh doesn't open it again
    }
    await this.loadTrips()
  },


  beforeUnmount() {
    document.removeEventListener('click', this.closeSort)
    document.removeEventListener('keydown', this.slashToSearch)
  },
  watch: {
    // The stamp filter belongs to the passport (Archive tab): switching tab drops it, so other tabs aren't emptied
    stage() {
      this.stampFilter = ''
    },
    // The app checks for new trip invites every 20 seconds: when the number changes, show the new cards
    'friends.invites'(now, before) {
      if (before >= 0 && now !== before) this.loadInvites()
    }
  },

  computed: {
    // One stamp per city from finished trips (earliest year first)
    stamps() {
      const list = []
      for (const t of this.allTrips) {
        if (this.stageOf(t) !== 'archive') continue
        for (const d of t.destinations) {
          if (!list.some((st) => st.place === d)) {
            const end = t.endDate || t.startDate || ''
            list.push({ place: d, year: end.slice(0, 4), end, date: this.stampDate(end), flag: this.flagFor(d) })
          }
        }
      }
      list.sort((a, b) => a.end.localeCompare(b.end))
      return list
    },
    // ---------- travel map + numbers ----------
    // Your trips as routes for the map. No trips yet: the whole world with a "plan a trip" note
    mapTrips() {
      const list = []
      for (const t of this.allTrips) {
        const points = []
        for (const d of t.destinations) {
          if (this.places[d]) points.push({ label: d, lat: this.places[d].lat, lon: this.places[d].lon })
        }
        list.push({ id: t.id, name: t.name, done: this.stageOf(t) === 'archive', points })
      }
      return list
    },
    // The trip that's highlighted: the next one coming up, else the newest
    mapActive() {
      const next = this.allTrips.find((t) => this.stageOf(t) !== 'archive')
      return next ? next.id : (this.allTrips[0] ? this.allTrips[0].id : '')
    },
    travelStats() {
      const real = this.allTrips
      const cities = []
      const countries = []
      let days = 0
      let km = 0
      for (const t of real) {
        for (const d of t.destinations) {
          if (!cities.includes(d)) cities.push(d)
          const c = codeForDestination(d) || d.split(', ').pop()
          if (!countries.includes(c)) countries.push(c)
        }
        if (t.startDate && t.endDate) days += Math.round((new Date(t.endDate) - new Date(t.startDate)) / DAY_MS) + 1
        // Distance along the route, place to place
        for (let i = 1; i < t.destinations.length; i++) {
          const a = this.places[t.destinations[i - 1]]
          const b = this.places[t.destinations[i]]
          if (a && b) km += kmBetween(a, b)
        }
      }
      return [
        { value: real.length, label: real.length === 1 ? 'Trip' : 'Trips' },
        { value: countries.length, label: countries.length === 1 ? 'Country' : 'Countries' },
        { value: cities.length, label: cities.length === 1 ? 'Place' : 'Places' },
        { value: days, label: 'Days away' },
        { value: Math.round(km).toLocaleString(), label: 'km between places' }
      ]
    },
    countryCount() {
      const countries = []
      for (const st of this.stamps) {
        const c = this.flagFor(st.place)
        if (!countries.includes(c)) countries.push(c)
      }
      return countries.length
    },
    holderName() {
      return auth.user ? auth.user.name : ''
    },
    firstName() {
      return auth.user ? auth.user.name.split(' ')[0] : ''
    },

    // New account: nothing to search, filter or sort yet
    noTrips() {
      return !this.loading && !this.loadError && !this.trips.length
    },
    // Every trip you're on (yours and ones you joined)
    allTrips() {
      return this.trips
    },

    // "All" plus one city per trip (the first one, for multi-city trips), for the filter dropdown
    // How many trips are in each stage
    stageCounts() {
      const counts = { planning: 0, upcoming: 0, archive: 0 }
      for (const t of this.allTrips) counts[this.stageOf(t)]++
      return counts
    },
    stageName() {
      for (const st of STAGES) if (st.key === this.stage) return st.label
      return ''
    },

    // Trips that match the stage tab, the search box and the destination filter
    visibleTrips() {
      const q = this.search.trim().toLowerCase()
      const result = []
      for (const t of this.allTrips) {
        if (this.stageOf(t) !== this.stage) continue
        if (this.stampFilter && this.stage === 'archive' && !t.destinations.includes(this.stampFilter)) continue
        // group = more than one traveller, solo = just you
        const people = (t.travellers || []).length
        if (this.tripFilter === 'group' && people < 2) continue
        if (this.tripFilter === 'solo' && people > 1) continue
        let matchesSearch = !q || t.name.toLowerCase().includes(q)
        for (const d of t.destinations) {
          if (d.toLowerCase().includes(q)) matchesSearch = true
        }
        if (matchesSearch) result.push(t)
      }
      // Sort: each trip gets a number, smallest first (trips without dates go last)
      const today = new Date().toISOString().slice(0, 10)
      const keyOf = (t, i) => {
        const start = t.startDate ? new Date(t.startDate + 'T00:00:00').getTime() : Infinity
        if (this.tripSort === 'earliest') return start
        if (this.tripSort === 'shortest') return t.startDate ? this.daysOf(t) : Infinity
        if (this.tripSort === 'recent') return -(new Date(t.updatedAt || t.createdAt || 0).getTime()) || i
        // upcoming first: soonest coming (or happening now) first, finished trips after, newest finished first
        if (!t.startDate) return Infinity
        if ((t.endDate || t.startDate) >= today) return start
        return 1e15 - start
      }
      const keys = {}
      result.forEach((t, i) => { keys[t.id] = keyOf(t, i) })
      result.sort((a, b) => keys[a.id] - keys[b.id] || (a.name < b.name ? -1 : 1))
      return result
    },
    sortLabel() {
      for (const o of SORTS) if (o.key === this.tripSort) return o.label
      return 'Sort'
    },

    // Suggestions for the Destination box: popular matches first, then online results.
    // Each has the typed letters split out so they can be shown in bold.
    destOptions() {
      const q = this.newTrip.destination.trim().toLowerCase()
      if (q.length < 2) return []

      const labels = []
      const codes = {} // label -> two-letter country code, for the flag
      for (const d of POPULAR_DESTINATIONS) {
        if (d.toLowerCase().includes(q) && labels.length < 4 && !this.newTrip.destinations.includes(d)) {
          labels.push(d)
          codes[d] = codeForDestination(d)
        }
      }
      for (const r of this.destRemote) {
        if (!labels.includes(r.label) && labels.length < 7 && !this.newTrip.destinations.includes(r.label)) {
          labels.push(r.label)
          codes[r.label] = r.countryCode || codeForDestination(r.label)
        }
      }

      const options = []
      for (const label of labels) {
        const at = label.toLowerCase().indexOf(q)
        options.push({
          label,
          flag: flagEmoji(codes[label]),
          code: codes[label] || codeForDestination(label),
          before: at >= 0 ? label.slice(0, at) : label,
          match: at >= 0 ? label.slice(at, at + q.length) : '',
          after: at >= 0 ? label.slice(at + q.length) : ''
        })
      }
      return options
    },

    // Each field is '' (not checked yet), 'success' or 'error'
    states() {
      const t = this.newTrip
      const result = { name: '', destination: '', startDate: '', endDate: '' }

      if (this.touched.name) result.name = t.name.trim() ? 'success' : 'error'
      if (t.destinations.length) result.destination = 'success'
      else if (this.touched.destination) result.destination = t.destination.trim() ? '' : 'error'
      // Past dates are greyed out in the calendar; typing one in still shows an error
      if (t.startDate) result.startDate = t.startDate < this.todayStr ? 'error' : 'success'
      if (t.endDate) result.endDate = t.endDate < this.todayStr || (t.startDate && t.endDate < t.startDate) ? 'error' : 'success'
      return result
    },

    // The small line under each field
    messages() {
      const msg = { name: '', destination: '', startDate: '', endDate: '' }
      if (this.states.name === 'error') msg.name = 'Please give your trip a name'
      if (this.states.destination === 'error') msg.destination = 'Where are you going? Add at least one destination'
      else if (this.newTrip.destinations.length === 0) msg.destination = ''
      else if (this.newTrip.destinations.length === 1) msg.destination = 'Going to more places? Add another'
      else msg.destination = this.newTrip.destinations.length + ' destinations, in this order'
      if (this.states.startDate === 'error') msg.startDate = "Can't start in the past"
      if (this.states.endDate === 'error') msg.endDate = this.newTrip.endDate < this.todayStr ? "Can't end in the past" : 'Must be on or after the start date'
      else if (this.formLength) msg.endDate = this.formLength
      return msg
    },

    // Today as YYYY-MM-DD in local time (the earliest date you can pick)
    todayStr() {
      const d = new Date()
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    },

    // Live preview of the trip length while filling in the form
    // Days between the chosen dates (for the "10-day itinerary" badge)
    formDays() {
      if (!this.newTrip.startDate || !this.newTrip.endDate || this.newTrip.endDate < this.newTrip.startDate) return 0
      return Math.round((new Date(this.newTrip.endDate) - new Date(this.newTrip.startDate)) / DAY_MS) + 1
    },
    // What Pip says, depending on what you're filling in
    notebookTip() {
      const t = this.notebookFocus
      const stops = this.newTrip.destinations.length
      if (t === 'name') return 'Ooh, a new adventure! What shall we call it?'
      if (t === 'dest') {
        if (stops > 1) return 'What a route! Use the arrows to shuffle the order. You can change it later too!'
        if (stops === 1) return 'Love it! Going anywhere else? Add another stop!'
        return 'Where are we heading to?'
      }
      if (t === 'dates') return this.formDays ? this.formDays + ' whole days of adventure? Woohoo!' : 'When do we take off? Pick your dates!'
      if (t === 'vibe') return 'Ooh, what kind of trip? Pick a vibe and I\'ll help you pack!'
      return 'Up, up and away!'
    },
    formLength() {
      if (!this.newTrip.startDate || !this.newTrip.endDate || this.newTrip.endDate < this.newTrip.startDate) return ''
      return this.tripLength({ startDate: this.newTrip.startDate, endDate: this.newTrip.endDate })
    }
  },

  methods: {
    // Clicking anywhere on a trip card opens it (except its own buttons, e.g. Delete)
    openCard(e, t) {
      if (e.target.closest('button, a')) return
      this.$router.push('/trip/' + t.id)
    },
    // ----- Destination type-ahead -----
    onDestInput() {
      this.destOpen = true
      this.destActive = -1
      // Wait until the user pauses typing (300 ms) before searching online
      clearTimeout(this.destTimer)
      const q = this.newTrip.destination.trim()
      if (q.length < 2) {
        this.destRemote = []
        return
      }
      this.destTimer = setTimeout(() => this.searchPlaces(q), 300)
    },

    async searchPlaces(q) {
      this.destLoading = true
      try {
        const res = await axios.get('/api/places', { params: { q } })
        // Only use the answer if the box still says the same thing
        if (this.newTrip.destination.trim() === q) this.destRemote = res.data
      } catch (err) {
        this.destRemote = [] // offline search failed: the popular list still works
      }
      this.destLoading = false
    },

    // Add a destination to the list and clear the box for the next one
    // "Singapore, Singapore" -> "Singapore" (a city-state named after itself)
    tidyPlace(label) {
      const parts = label.trim().split(', ')
      if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) return parts[0]
      return label.trim()
    },
    pickDestination(label) {
      const clean = this.tidyPlace(label)
      // Already on the list (ignoring capitals)? Don't add it twice
      const already = this.newTrip.destinations.some((d) => d.toLowerCase() === clean.toLowerCase())
      if (clean && !already && this.newTrip.destinations.length < 10) {
        this.newTrip.destinations.push(clean)
      }
      this.newTrip.destination = ''
      this.destRemote = []
      this.destActive = -1
      this.touched.destination = true
    },

    removeDestination(index) {
      this.newTrip.destinations.splice(index, 1)
    },

    flagFor(label) {
      return flagEmoji(codeForDestination(label))
    },
    // Two-letter country code for a place (for the flag stamps), or '' if unknown
    flagCode(label) {
      return codeForDestination(label) || ''
    },

    // "Kyoto, Japan" -> "Kyoto" (shorter on cards; the flag shows the country)
    shortPlace(label) {
      return codeForDestination(label) ? label.split(', ')[0] : label
    },

    // Up/Down to move, Enter to pick, Escape to close
    onDestKeydown(e) {
      const count = this.destOptions.length
      // Enter with nothing highlighted: add exactly what was typed
      if (e.key === 'Enter' && (this.destActive < 0 || !this.destOpen || count === 0)) {
        e.preventDefault()
        if (this.newTrip.destination.trim()) this.pickDestination(this.newTrip.destination)
        return
      }
      // Backspace in an empty box removes the last destination
      if (e.key === 'Backspace' && !this.newTrip.destination && this.newTrip.destinations.length) {
        this.newTrip.destinations.pop()
        return
      }
      if (!this.destOpen || count === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.destActive = (this.destActive + 1) % count
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.destActive = (this.destActive - 1 + count) % count
      } else if (e.key === 'Enter' && this.destActive >= 0) {
        e.preventDefault() // pick the suggestion instead of submitting the form
        this.pickDestination(this.destOptions[this.destActive].label)
      } else if (e.key === 'Escape') {
        this.destOpen = false
      }
    },

    onDestBlur() {
      this.destOpen = false
      this.touched.destination = true
    },

    async loadTrips() {
      this.loading = true
      this.loadError = ''
      try {
        const res = await axios.get('/api/trips')
        // Older trips only have one destination
        for (const t of res.data) {
          if (!t.destinations || !t.destinations.length) t.destinations = [t.destination]
        }
        this.trips = res.data
      } catch (err) {
        this.loadError = 'Could not load your trips. Is the server running?'
      }
      this.loading = false
      this.pickStartStage()
      this.loadPhotos()
      this.loadPlaces()
      this.loadInvites()
      this.checkCeremony()
    },

    // ---------- hero doodles ----------
    // A new random flight every tap: from its spot the plane swoops DOWN over the card through a few
    // random points, then curves back home. The route is a smooth curve (Catmull-Rom spline) and the
    // plane always points the way it's going. Drawn frame by frame.
    flyPlane() {
      if (this.planeFlying || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const hero = this.$refs.plane && this.$refs.plane.parentElement
      if (!hero) return
      this.planeFlying = true
      const box = hero.getBoundingClientRect()
      const me = this.$refs.plane.getBoundingClientRect()
      // How far it can go from its spot and still stay over the card
      const left = -(me.left - box.left) + 20
      const right = box.right - me.right - 10
      const bottom = Math.min(box.height - 70, 320)
      const rand = (a, b) => a + Math.random() * (b - a)
      // 3 or 4 random stops, each lower down the card and swinging left/right, then home
      const pts = [{ x: 0, y: 0 }, { x: 0, y: 0 }]
      const stops = 3 + Math.floor(Math.random() * 2)
      for (let i = 1; i <= stops; i++) {
        const depth = (i / stops) * bottom
        pts.push({ x: rand(left, right), y: rand(depth * 0.5, depth) + 30 })
      }
      pts.push({ x: rand(left * 0.3, 0), y: rand(20, 60) }, { x: 0, y: 0 }, { x: 0, y: 0 })
      const NOSE = 25        // the drawing's nose points 25° above "right"
      const DURATION = 1100 + stops * 600
      const segs = pts.length - 3
      // point on the smooth curve through the points (t: 0 -> 1 over the whole route)
      const at = (t) => {
        const f = Math.min(t, 0.9999) * segs
        const i = Math.floor(f)
        const u = f - i
        const p0 = pts[i], p1 = pts[i + 1], p2 = pts[i + 2], p3 = pts[i + 3]
        const c = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * u + (2 * a - 5 * b + 4 * cc - d) * u * u + (-a + 3 * b - 3 * cc + d) * u * u * u)
        return { x: c(p0.x, p1.x, p2.x, p3.x), y: c(p0.y, p1.y, p2.y, p3.y) }
      }
      const t0 = performance.now()
      let angle = 0
      const step = (now) => {
        const k = Math.min((now - t0) / DURATION, 1)
        const eased = 0.5 - Math.cos(Math.PI * k) / 2 // gentle take-off and landing
        const p = at(eased)
        const ahead = at(Math.min(eased + 0.01, 1))
        if (Math.hypot(ahead.x - p.x, ahead.y - p.y) > 0.3) angle = (Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI
        const grow = 1 + Math.sin(Math.PI * k) * 0.2
        this.planeStyle = { transform: 'translate(' + p.x.toFixed(1) + 'px, ' + p.y.toFixed(1) + 'px) rotate(' + (angle + NOSE).toFixed(1) + 'deg) scale(' + grow.toFixed(3) + ')' }
        if (k < 1) requestAnimationFrame(step)
        else {
          this.planeStyle = {}
          this.planeFlying = false
        }
      }
      requestAnimationFrame(step)
    },
    shineSun() {
      if (this.sunShine) return
      this.sunShine = true
      setTimeout(() => { this.sunShine = false }, 1300)
    },

    // ---------- passport stamps ----------
    // '2025-03-14' -> 'MAR 2025'
    stampDate(iso) {
      if (!iso) return ''
      const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
      return MONTHS[Number(iso.slice(5, 7)) - 1] + ' ' + iso.slice(0, 4)
    },
    // Which finished trips have had their stamping ceremony (kept on this device)
    stampedKey() {
      return 'chuise-stamped-' + (auth.user ? auth.user.id : 'guest')
    },
    readStamped() {
      try {
        return JSON.parse(localStorage.getItem(this.stampedKey()))
      } catch (err) {
        return null
      }
    },
    writeStamped(list) {
      try {
        localStorage.setItem(this.stampedKey(), JSON.stringify(list))
      } catch (err) {
        // private window: it may show again next time, which is harmless
      }
    },
    // A trip that has just finished (and hasn't been stamped yet) gets the ceremony, one at a time
    checkCeremony() {
      if (this.ceremony) return
      const finished = []
      for (const t of this.allTrips) if (this.stageOf(t) === 'archive') finished.push(t)
      let done = this.readStamped()
      if (!done) {
        // First time on this device: trips that were already over don't all celebrate at once
        done = finished.map((t) => t.id)
        this.writeStamped(done)
        return
      }
      const next = finished.find((t) => !done.includes(t.id))
      if (!next) return
      // Places that only this trip has (their stamps wait in the passport until this one lands)
      const older = []
      for (const t of finished) if (t.id !== next.id && done.includes(t.id)) older.push(...t.destinations)
      const newPlaces = next.destinations.filter((d) => !older.includes(d))
      const place = newPlaces[0] || next.destinations[0]
      const end = next.endDate || next.startDate || ''
      this.stage = 'archive'
      this.stampFilter = ''
      this.ceremony = { tripId: next.id, name: next.name, place, date: this.stampDate(end), flag: this.flagFor(place), more: Math.max(0, newPlaces.length - 1), newPlaces }
    },
    // Where the big stamp should fly to: its slot in the passport
    stampSlot() {
      if (!this.ceremony) return null
      const el = document.querySelector('.pb-slot[data-place="' + this.ceremony.place.replace(/"/g, '\\"') + '"]')
      return el ? el.getBoundingClientRect() : null
    },
    // Once stamped, bring the passport into view (behind the overlay) so the stamp has somewhere to land
    showPassport() {
      const book = this.$refs.passport && this.$refs.passport.$el
      if (book) book.scrollIntoView({ behavior: 'auto', block: 'center' })
    },
    ceremonyDone(place) {
      const id = this.ceremony.tripId
      this.ceremony = null
      this.landing = place
      setTimeout(() => { this.landing = '' }, 700)
      const done = this.readStamped() || []
      if (!done.includes(id)) done.push(id)
      this.writeStamped(done)
      setTimeout(() => this.checkCeremony(), 900) // another trip finished too? its turn next
    },
    // "Later": ask again next time Home opens
    ceremonyLater() {
      this.ceremony = null
    },

    async loadInvites() {
      try {
        const res = await axios.get('/api/invites')
        this.invites = res.data
      } catch (err) {
        this.invites = []
      }
    },

    async declineInvite(inv) {
      this.invites = this.invites.filter((x) => x !== inv)
      try {
        await axios.post('/api/invites/' + inv.tripId + '/decline')
      } catch (err) {
        this.loadInvites() // put it back if that failed
      }
    },

    // Where each destination is, for the travel map (looked up 20 at a time)
    async loadPlaces() {
      const names = []
      for (const t of this.allTrips) {
        for (const d of t.destinations) if (!this.places[d] && !names.includes(d)) names.push(d)
      }
      for (let i = 0; i < names.length; i += 20) {
        const batch = names.slice(i, i + 20)
        const codes = []
        for (const n of batch) codes.push(codeForDestination(n) || '')
        try {
          const res = await axios.get('/api/discover/cities', { params: { names: batch.join('|'), codes: codes.join('|') }, background: true })
          for (const c of res.data) this.places[c.label] = { lat: c.lat, lon: c.lon }
        } catch (err) {
          // the map just shows fewer places
        }
      }
    },

    // One photo per destination (trips going to the same place share it)
    async loadPhotos() {
      for (const t of this.allTrips) {
        const d = t.destinations[0]
        if (!d || this.photos[d] !== undefined) continue
        this.photos[d] = '' // looking it up
        axios.get('/api/places/photo', { params: { destination: d, size: 'small' }, background: true })
          .then((res) => {
            if (!res.data.url) return
            // Show it only once it has downloaded, so the card never flashes empty
            const img = new Image()
            img.onload = () => { this.photos[d] = res.data.url }
            img.src = res.data.url
          })
          .catch(() => {}) // keep the drawing
      }
    },

    // "Set up my needs": go to Settings (it shows a short welcome there too)
    goSetup() {
      setupDone(auth.user && auth.user.id)
      this.$router.push({ path: '/settings', query: { welcome: '1' } })
    },
    skipSetup() {
      setupDone(auth.user && auth.user.id)
      this.showSetup = false
    },

    openForm() {
      this.showCreateForm = true
      // Wait for the form to appear, then scroll to it and focus the first field
      this.$nextTick(() => {
        setTimeout(() => this.$refs.nameInput && this.$refs.nameInput.focus({ preventScroll: true }), 350) // after it swings open
      })
    },

    // ---------- the notebook ----------
    onNotebookFocus(e) {
      const el = e.target.closest('[data-tip]')
      if (el) this.notebookFocus = el.dataset.tip
    },
    // Clicking anywhere on a date box opens the calendar (not just the little calendar icon)
    openPicker(e) {
      try {
        if (e.target.showPicker) e.target.showPicker()
      } catch (err) {
        // older browsers: the icon still works
      }
    },
    codeFor(place) {
      return codeForDestination(place)
    },
    // The arrows on a chosen stop: swap it with the one before / after
    moveDestination(k, step) {
      const list = this.newTrip.destinations
      const j = k + step
      if (j < 0 || j >= list.length) return
      const moving = list[k]
      list.splice(k, 1)
      list.splice(j, 0, moving)
    },
    toggleVibe(key) {
      const list = this.newTrip.vibes
      const i = list.indexOf(key)
      if (i >= 0) list.splice(i, 1)
      else list.push(key)
    },
    vibeActivities() {
      const list = []
      for (const v of this.VIBES) if (this.newTrip.vibes.includes(v.key)) list.push(v.activity)
      return list
    },
    closeForm() {
      this.notebookFocus = ''
      this.showCreateForm = false
      this.formError = ''
      this.resetTouched()
    },

    resetTouched() {
      for (const key in this.touched) this.touched[key] = false
    },

    // Sort & filter menu
    pickSort(key) {
      this.tripSort = key
      this.sortOpen = false
      try { localStorage.setItem('chuise-trip-sort', key) } catch (err) { /* private mode */ }
    },
    pickFilter(key) {
      this.tripFilter = key
      this.sortOpen = false
      try { localStorage.setItem('chuise-trip-filter', key) } catch (err) { /* private mode */ }
    },
    closeSort() {
      this.sortOpen = false
    },
    // "/" jumps to the search box (unless you're already typing somewhere)
    slashToSearch(e) {
      if (e.key !== '/' || !this.$refs.searchEl) return
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable) return
      e.preventDefault()
      this.$refs.searchEl.focus()
    },
    // How many days a trip lasts (1 for a day trip)
    daysOf(t) {
      const start = new Date(t.startDate + 'T00:00:00')
      const end = new Date((t.endDate || t.startDate) + 'T00:00:00')
      return Math.round((end - start) / DAY_MS) + 1
    },

    clearFilters() {
      this.search = ''
      this.pickFilter('all')
      this.stampFilter = ''
    },

    // First visit: open Upcoming if there's anything coming up, otherwise Planning
    pickStartStage() {
      if (this.stage) return
      this.stage = this.stageCounts.upcoming ? 'upcoming' : 'planning'
    },

    async createTrip() {
      this.formError = ''
      for (const key in this.touched) this.touched[key] = true
      const name = this.newTrip.name.trim()
      // Anything still typed in the box counts too
      if (this.newTrip.destination.trim()) this.pickDestination(this.newTrip.destination)
      const destinations = this.newTrip.destinations
      if (!name || !destinations.length) {
        this.$nextTick(() => {
          const firstBad = this.$el.querySelector('[aria-invalid="true"]')
          if (firstBad) firstBad.focus()
        })
        return
      }
      if (this.states.startDate === 'error' || this.states.endDate === 'error') {
        return // the date fields already show the problem
      }
      this.saving = true
      try {
        const res = await axios.post('/api/trips', {
          name,
          destinations,
          startDate: this.newTrip.startDate,
          endDate: this.newTrip.endDate,
          activities: this.vibeActivities() // e.g. Adventure -> hiking, for the packing list
        })
        this.newTrip = { name: '', destination: '', destinations: [], startDate: '', endDate: '', vibes: [] }
        this.resetTouched()
        this.showCreateForm = false
        // New trip: set it up step by step (invite, wishlist, then voting). "first" = this is their first trip.
        // "new" = just made: going Back from the first setup step offers to discard it
        const query = this.trips.length === 0 ? { first: '1', new: '1' } : { new: '1' }
        this.$router.push({ path: '/trip/' + res.data.id + '/setup/invite', query })
      } catch (err) {
        this.formError = (err.response && err.response.data && err.response.data.message) || 'Could not save the trip. Is the server running?'
      }
      this.saving = false
    },

    async removeTrip(trip) {
      this.confirmingId = null
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
    },

    // "6 days" (start and end both count)
    tripLength(t) {
      if (!t.startDate || !t.endDate) return ''
      const days = Math.round((new Date(t.endDate) - new Date(t.startDate)) / DAY_MS) + 1
      return days + (days === 1 ? ' day' : ' days')
    },

    // Upcoming / ongoing / past, from today's date
    // Archive: the trip has ended. Upcoming: dates set and the itinerary has stops (or it's on now).
    // Planning: everything else (no dates yet, or nothing planned yet).
    stageOf(t) {
      const status = this.statusFor(t).kind
      if (status === 'past') return 'archive'
      if (status === 'ongoing') return 'upcoming'
      if (status === 'upcoming' && (t.stopCount || (t.stops && t.stops.length))) return 'upcoming'
      return 'planning'
    },

    statusFor(t) {
      if (!t.startDate) return { kind: 'none', label: 'Planning' }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const start = new Date(t.startDate + 'T00:00:00')
      const end = new Date((t.endDate || t.startDate) + 'T00:00:00')
      if (today < start) {
        const days = Math.round((start - today) / DAY_MS)
        return { kind: 'upcoming', label: days === 1 ? 'Tomorrow' : 'In ' + days + ' days' }
      }
      if (today <= end) return { kind: 'ongoing', label: 'Happening now' }
      return { kind: 'past', label: 'Completed' }
    },

    // Same destination always gets the same colour theme (0-3)
    themeFor(destination) {
      if (!destination) return 0
      let sum = 0
      for (let i = 0; i < destination.length; i++) sum += destination.charCodeAt(i)
      return sum % 4
    }
  }
}
</script>

<style scoped>
.home {
  --accent: #f08c3a; /* warm highlight, used sparingly */
}

/* ---------- Hero: you, your map, your numbers (Polarsteps-style profile) ---------- */
/* New-account prompt: a "campfire briefing" journal insert */
.setup {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
  grid-template-areas: "guide guide btns" "body body btns";
  align-items: center;
  gap: 16px 28px;
  margin: 14px 0 28px;
  padding: 26px 28px 24px;
  border: 2px solid rgba(226, 215, 196, 0.8);
  border-radius: 24px;
  background:
    radial-gradient(circle, rgba(18, 50, 74, 0.06) 1px, transparent 1.2px) 0 0 / 18px 18px,
    #faf8f3;
  box-shadow: 0 4px 0 0 #e2d9cc, 0 22px 36px -24px rgba(18, 50, 74, 0.35);
}
/* stitching round the inside edge */
.setup::before {
  content: '';
  position: absolute;
  inset: 8px;
  border: 2px dashed rgba(201, 184, 148, 0.7);
  border-radius: 17px;
  pointer-events: none;
}
/* washi tape on two corners */
.setup-tape {
  position: absolute;
  top: -10px;
  width: 96px;
  height: 26px;
  opacity: 0.85;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  pointer-events: none;
}
.setup-tape.tl {
  left: 30px;
  transform: rotate(-7deg);
  background: repeating-linear-gradient(45deg, rgba(255, 191, 60, 0.75) 0 8px, rgba(255, 214, 120, 0.75) 8px 16px);
}
.setup-tape.tr {
  right: 34px;
  transform: rotate(6deg);
  background: repeating-linear-gradient(45deg, rgba(25, 179, 196, 0.55) 0 8px, rgba(143, 203, 255, 0.55) 8px 16px);
}
/* the explorer + speech bubble */
.setup-guide {
  grid-area: guide;
  display: flex;
  align-items: center;
  gap: 16px;
}
.setup-avatar {
  position: relative;
  flex: none;
  width: 96px;
  height: 96px;
  overflow: hidden;
  border: 3px solid #12324a;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #e8f6ff, #bfe3f5);
  box-shadow: 0 4px 0 #12324a;
}
/* his face centred in the circle (the drawing is 150 x 140; his face is at about 62, 76) */
.setup-avatar :deep(.em) {
  position: absolute;
  left: -14px;
  top: -24px;
}
.setup-bubble {
  position: relative;
  min-width: 0;
  padding: 12px 18px 14px;
  border: 2.5px solid #12324a;
  border-radius: 20px;
  background: #fbf5ea;
  box-shadow: 0 4px 0 #12324a;
}
.setup-bubble::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 50%;
  width: 14px;
  height: 14px;
  margin-top: -7px;
  background: #fbf5ea;
  border-left: 2.5px solid #12324a;
  border-bottom: 2.5px solid #12324a;
  transform: rotate(45deg);
}
.setup-kicker {
  margin: 0 0 2px;
  font-size: 11.5px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #d94b5b;
}
.setup-title {
  margin: 0;
  font-family: 'Lilita One', var(--font-display);
  font-size: clamp(1.15rem, 2vw, 1.45rem);
  font-weight: 400;
  line-height: 1.25;
  letter-spacing: 0.01em;
  color: #12324a;
}
.setup-body {
  grid-area: body;
}
.setup-sub {
  margin: 0;
  max-width: 620px;
  font-size: 14.5px;
  font-weight: 600;
  color: #5a6b78;
}
/* what to set up: luggage tags (a notched end with a punched hole, tilted a little).
   The tag's shape is cut out on the inner span; the outline is drawn round that shape by the li's drop-shadows
   (a normal border would be cut off at the notch). */
.setup-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
}
.setup-list li {
  filter:
    drop-shadow(2px 0 0 #12324a) drop-shadow(-2px 0 0 #12324a)
    drop-shadow(0 2px 0 #12324a) drop-shadow(0 -2px 0 #12324a)
    drop-shadow(0 3px 0 rgba(18, 50, 74, 0.18));
  transform: rotate(-1.5deg);
}
.setup-list li:nth-child(even) {
  transform: rotate(1.5deg);
}
.setup-tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 28px;
  background:
    repeating-linear-gradient(0deg, transparent 0 7px, rgba(168, 151, 120, 0.12) 7px 8px),
    #fff3dc;
  color: #12324a;
  font-size: 13.5px;
  font-weight: 800;
  clip-path: polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%);
  border-radius: 0 10px 10px 0;
}
.setup-list li:nth-child(even) .setup-tag {
  background:
    repeating-linear-gradient(0deg, transparent 0 7px, rgba(168, 151, 120, 0.12) 7px 8px),
    #e9f5ff;
}
/* the punched hole */
.setup-tag::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 50%;
  width: 7px;
  height: 7px;
  margin-top: -3.5px;
  border-radius: 50%;
  background: #faf8f3;
  box-shadow: inset 0 0 0 2px #12324a;
}
/* the icon in a little round ink stamp */
.setup-stamp {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1.5px dashed rgba(18, 50, 74, 0.45);
  border-radius: 50%;
  background: #fffaf0;
}
/* actions */
.setup-btns {
  grid-area: btns;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  min-width: 210px;
}
.setup-go {
  padding: 13px 20px;
  border: 2.5px solid #12324a;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffd36e, #fbbf24 55%, #f5a922);
  color: #12324a;
  font-family: 'Lilita One', var(--font-display);
  font-size: 1.15rem;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.55), 0 4px 0 0 #d97706;
  transition: transform 0.12s, box-shadow 0.12s;
}
.setup-go:hover {
  transform: translateY(-2px);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.55), 0 6px 0 0 #d97706;
}
.setup-go:active {
  transform: translateY(4px);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.55), 0 0 0 0 #d97706;
}
/* "Later": a light, handwritten-looking tag, not a second big button */
.setup-later {
  align-self: center;
  padding: 4px 14px;
  border: 1.5px dashed rgba(18, 50, 74, 0.35);
  border-radius: 8px;
  background: transparent;
  color: #4a6274;
  font-family: 'Caveat', 'Segoe Script', cursive;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  transform: rotate(-2deg);
  transition: transform 0.2s, background 0.15s, color 0.15s;
}
.setup-later:hover {
  background: rgba(255, 255, 255, 0.7);
  color: #12324a;
  transform: rotate(0deg);
}
.setup-go:focus-visible,
.setup-later:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
}
/* where to find it later: a small note with a gear and the menu path as a little label */
.setup-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.6;
  color: #6a7f8f;
  text-align: center;
}
.setup-path {
  display: inline-block;
  padding: 0 7px;
  border-radius: 7px;
  background: #f1e7d5;
  color: #12324a;
  font-weight: 800;
  white-space: nowrap;
}
@media (max-width: 860px) {
  .setup {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "guide" "body" "btns";
    padding: 24px 20px 20px;
  }
  .setup-btns {
    min-width: 0;
  }
}
@media (max-width: 480px) {
  .setup-guide {
    align-items: flex-start;
  }
  .setup-avatar {
    width: 70px;
    height: 70px;
  }
  .setup-avatar :deep(.em) {
    width: 110px;
    height: 103px;
    left: -10px;
    top: -18px;
  }
  .setup-bubble::before {
    top: 30px;
  }
}
.hero {
  position: relative;
  margin-bottom: 28px;
  padding: clamp(18px, 3vw, 32px);
  border-radius: 32px;
  background:
    radial-gradient(500px 260px at 0% 0%, #ffe6dc, transparent 70%),
    radial-gradient(520px 300px at 100% 100%, #dff6f3, transparent 70%),
    #fffaf0;
  box-shadow: 0 2px 0 rgba(18, 50, 74, 0.06), 0 22px 50px -18px rgba(18, 50, 74, 0.28);
}
.hero-sun,
.hero-plane {
  position: absolute;
  z-index: 2;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  line-height: 0;
}
.hero-sun:focus-visible,
.hero-plane:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 4px;
  border-radius: 50%;
}
/* The sun sits on the card's top-left corner (low enough to be seen whole, clear of your avatar) */
.hero-sun {
  top: -16px;
  left: -18px;
}
.hero-sun .dz {
  width: 54px;
  height: 54px;
  animation: hero-sun-bob 5s ease-in-out infinite;
}
.hero-sun-glow {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 201, 77, 0.55), transparent 70%);
  opacity: 0.6;
  transform: scale(1.4);
  pointer-events: none;
}
@keyframes hero-sun-bob {
  0%, 100% { transform: rotate(0) translateY(0); }
  50% { transform: rotate(10deg) translateY(-3px); }
}
/* tapped: spins once with a bounce, and the glow flares */
.hero-sun.shine .dz {
  animation: hero-sun-spin 1.2s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.hero-sun.shine .hero-sun-glow {
  animation: hero-sun-flare 1.2s ease-out;
}
@keyframes hero-sun-spin {
  0% { transform: rotate(0) scale(1); }
  35% { transform: rotate(200deg) scale(1.3); }
  100% { transform: rotate(360deg) scale(1); }
}
@keyframes hero-sun-flare {
  0% { opacity: 0.6; transform: scale(1.4); }
  35% { opacity: 1; transform: scale(2.6); }
  100% { opacity: 0.6; transform: scale(1.4); }
}
/* The plane cruises over the card's top-right corner */
.hero-plane {
  top: -20px;
  right: 34px;
}
.hero-plane-body {
  display: inline-block;
  animation: pl-float 3.4s ease-in-out infinite;
}
.hero-plane.flying {
  pointer-events: none;
  z-index: 5;
}
.hero-plane.flying .hero-plane-body {
  animation: none; /* the loop (set frame by frame) takes over */
}
@media (max-width: 560px) {
  .hero-sun { top: -12px; left: -12px; }
  .hero-sun .dz { width: 38px; height: 38px; }
  .hero-plane { right: 14px; top: -18px; }
}
@media (prefers-reduced-motion: reduce) {
  .hero-plane-body, .hero-sun .dz, .hero-sun.shine .dz, .hero-sun.shine .hero-sun-glow { animation: none; }
}
.hero-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.hero-me {
  display: flex;
  align-items: center;
  gap: 14px;
}
.hero-avatar {
  position: relative;
  overflow: hidden;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #edae49;
  color: #001d2c;
  font-size: 24px;
  font-weight: 800;
  box-shadow: 0 0 0 4px #fff, 0 6px 16px rgba(0, 29, 44, 0.15);
  animation: pl-float 3.6s ease-in-out infinite;
}
.hero-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.hero-hello {
  margin: 0;
  color: var(--app-muted);
  font-weight: 600;
}
.hero-title {
  margin: 0;
  font-size: clamp(1.9rem, 3.6vw, 2.6rem);
  font-weight: 800;
  color: #001d2c;
}
.hero-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.hero-btn {
  background: #001d2c;
  color: #fff;
  padding: 10px 22px;
  transition: transform 0.15s, background 0.15s;
}
.hero-btn:hover,
.hero-btn:focus-visible {
  background: #003d5b;
  color: #fff;
  transform: translateY(-1px);
}
.hero-btn.ghost {
  background: #fbf5ea;
  color: #001d2c;
  border: 1.5px solid #e2dacb;
}
.hero-btn.ghost:hover,
.hero-btn.ghost:focus-visible {
  background: #fbf5ea;
  border-color: #edae49;
  color: #001d2c;
}
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 14px;
}
.hero-map {
  border-radius: 24px;
  overflow: hidden;
  height: 300px;
  box-shadow: 0 16px 36px rgba(0, 29, 44, 0.18);
}
/* Big friendly numbers */
.hero-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.hero-stats li {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 12px 14px;
  border-radius: 20px;
  background: #fbf5ea;
  border: 0;
  box-shadow: 0 4px 0 rgba(18, 50, 74, 0.08);
  animation: pl-pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.hero-stats li.tint-0 { background: #fff1cf; }
.hero-stats li.tint-1 { background: #ffe1e6; }
.hero-stats li.tint-2 { background: #dff6f3; }
.hero-stats li.tint-3 { background: #e3f1ff; }
.hero-stats li:last-child {
  grid-column: 1 / -1;
  background: #001d2c;
  border-color: #001d2c;
  color: #fff;
}
.hero-stats b {
  font-size: 1.7rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.hero-stats li:last-child b {
  color: #edae49;
}
.hero-stats span {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--app-muted);
}
.hero-stats li:last-child span {
  color: rgba(255, 255, 255, 0.75);
}
@media (max-width: 760px) {
  .hero-grid { grid-template-columns: minmax(0, 1fr); }
  .hero-map { height: 220px; }
  .hero-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .hero-stats li { padding: 10px; }
  .hero-stats li:last-child { grid-column: 1 / -1; }
  .hero-stats b { font-size: 1.3rem; }
  .hero-stats span { font-size: 11px; }
}


@media (prefers-reduced-motion: reduce) {
  .stamp { transition: none; }
}

/* ---------- Create form ---------- */
.create-card {
  background: #fbf5ea;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(0, 40, 62, 0.08);
  scroll-margin-top: 16px;
}
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ---------- Form fields: pill inputs with the label on the border ---------- */
.field {
  --field-color: #d6ccbb;
  --field-bg: #fff;
  position: relative;
}
.field-label {
  position: absolute;
  top: 0;
  left: 18px;
  transform: translateY(-50%);
  padding: 0 6px;
  background: var(--field-bg);
  font-size: 13px;
  color: var(--app-ink);
  line-height: 1;
  pointer-events: none;
}
.field-input {
  width: 100%;
  height: 54px;
  border: 1.5px solid var(--field-color);
  border-radius: 999px;
  padding: 0 46px 0 22px;
  font-size: 16px;
  font-weight: 600;
  color: var(--app-ink);
  background: var(--field-bg);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field-input::placeholder {
  color: #9aa7b1;
  font-weight: 500;
}
.field-input:focus {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 4px rgba(0, 121, 140, 0.15);
}
.field-input:disabled {
  background: #f1f3f3;
  color: #9aa7b1;
}
.field-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: 700;
  pointer-events: none;
}
.field.is-success { --field-color: #f1c47a; }
.field.is-success .field-icon { color: #1f9d6b; }
.field.is-error { --field-color: #ef9a8a; }
.field.is-error .field-input:focus { box-shadow: 0 0 0 4px rgba(214, 69, 46, 0.15); }
.field.is-error .field-icon {
  color: #d6452e;
  border: 2px solid #d6452e;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}
.field-msg {
  font-size: 13px;
  margin: 6px 0 0 22px;
  min-height: 18px; /* keeps the layout still when a message appears */
  color: var(--app-muted);
}
.field-msg.is-success { color: #1f9d6b; }
.field-msg.is-error { color: #d6452e; }

.pill-btn {
  border-radius: 999px;
  padding: 10px 24px;
  font-weight: 600;
}
.pill-primary {
  background: var(--app-primary);
  color: #fff;
}
.pill-primary:hover,
.pill-primary:focus-visible {
  background: var(--app-primary-dark);
  color: #fff;
}
.pill-ghost {
  border: 1.5px solid var(--field-color, #d6ccbb);
  color: var(--app-ink);
  background: #fbf5ea;
}
.pill-ghost:hover {
  border-color: var(--app-ink);
}

/* ---------- Chosen destinations ---------- */
.dest-chips {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 0;
  padding: 0 0 0 10px;
  counter-reset: stop;
}
.dest-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fbefd9;
  color: #004e5a;
  border: 1px solid #f3d9a8;
  border-radius: 999px;
  padding: 4px 6px 4px 12px;
  font-size: 14px;
  font-weight: 600;
  animation: pop 0.12s ease-out;
}
.dest-chip::before {
  counter-increment: stop;
  content: counter(stop);
  font-size: 11px;
  background: var(--app-primary);
  color: #fff;
  border-radius: 999px;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dest-chip-x {
  border: 0;
  background: transparent;
  color: #004e5a;
  font-size: 18px;
  line-height: 1;
  width: 24px;
  height: 24px;
  border-radius: 50%;
}
.dest-chip-x:hover,
.dest-chip-x:focus-visible {
  background: #c9ecdd;
}

/* ---------- Destination suggestions ---------- */
.suggest {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  list-style: none;
  margin: 0;
  padding: 6px;
  background: #fbf5ea;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  box-shadow: 0 14px 30px rgba(0, 40, 62, 0.14);
  max-height: 300px;
  overflow-y: auto;
  animation: pop 0.12s ease-out;
}
.suggest-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
  color: var(--app-ink);
}
.suggest-item strong {
  color: var(--app-primary);
}
.suggest-item.active {
  background: #fbefd9;
}
.suggest-icon {
  font-size: 18px;
  line-height: 1;
}
@keyframes pop {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .suggest { animation: none; }
}

/* ---------- Search + destination filter ---------- */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 24px;
}
/* Search: like Discover's (cream, chunky soft border, drawn icon, "/" key on the right) */
.search {
  position: relative;
  flex: 1 1 260px;
  max-width: 440px;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.search:focus-within {
  transform: scale(1.01);
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  line-height: 0;
  pointer-events: none;
}
.search-input {
  box-sizing: border-box;
  width: 100%;
  height: 50px;
  padding: 0 48px 0 48px;
  border: 2.5px solid #efdcbc;
  border-radius: 18px;
  background: #fffaf0;
  color: #12324a;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  box-shadow: inset 0 3px 0 rgba(18, 50, 74, 0.04), 0 4px 0 #e2cfab, 0 12px 22px -16px rgba(18, 50, 74, 0.45);
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.search-input::placeholder {
  color: #8a99a5;
  font-weight: 600;
}
.search-input:focus {
  outline: none;
  border-color: #ffbf3c;
  background: #fbf5ea;
  box-shadow: 0 0 0 4px rgba(255, 191, 60, 0.25), 0 4px 0 #d99a1c, 0 14px 24px -16px rgba(18, 50, 74, 0.5);
}
.search-kbd,
.search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}
.search-kbd {
  min-width: 26px;
  height: 26px;
  padding: 0 7px;
  border-radius: 8px;
  background: #f4ead8;
  color: #5a6b78;
  font: 800 12px/26px ui-monospace, SFMono-Regular, Menlo, monospace;
  text-align: center;
  box-shadow: 0 2px 0 #e2d0ae;
}
.search-clear {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 10px;
  background: #f4ead8;
  color: #12324a;
  cursor: pointer;
}
.search-clear:hover,
.search-clear:focus-visible {
  background: #ffbf3c;
  outline: none;
}
@media (max-width: 560px) {
  .search-kbd { display: none; } /* no keyboard on phones */
}
.invites {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}
.invite-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: #fbf5ea;
  border: 1.5px solid #f3d9a8;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 121, 140, 0.08);
}
.invite-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 14px;
  background: #fbefd9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.invite-text {
  flex: 1;
  min-width: 0;
}
.invite-meta {
  font-size: 13px;
  color: var(--app-muted);
}
.invite-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.invite-join {
  background: #003d5b;
  color: #edae49;
  border-radius: 999px;
  font-weight: 600;
  padding: 7px 18px;
}
.invite-join:hover {
  background: var(--app-primary);
  color: #fff;
}
.invite-decline {
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 7px 14px;
  color: var(--app-muted);
}
@media (max-width: 576px) {
  .invite-card {
    flex-wrap: wrap;
  }
  .invite-actions {
    width: 100%;
  }
  .invite-actions .btn {
    flex: 1;
  }
}
/* ---------- Sort & filter ---------- */
.sortbox {
  position: relative;
}
.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 14px;
  border: 2.5px solid #efdcbc;
  border-radius: 16px;
  background: #fffaf0;
  color: #12324a;
  font: inherit;
  font-size: 14.5px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 #e2cfab;
  transition: transform 0.12s, box-shadow 0.12s, border-color 0.15s;
}
.sort-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #e2cfab;
}
.sort-btn:active,
.sort-btn.open {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #e2cfab;
}
.sort-btn.open {
  border-color: #ffbf3c;
}
.sort-btn:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
}
.sort-btn-text {
  white-space: nowrap;
}
.sort-badge {
  padding: 1px 8px;
  border-radius: 8px;
  background: #ffbf3c;
  font-size: 12px;
  font-weight: 900;
}
.sort-caret {
  transition: transform 0.2s;
}
.sort-btn.open .sort-caret {
  transform: rotate(180deg);
}
.sort-menu {
  position: absolute;
  left: 0;
  top: calc(100% + 10px);
  z-index: 30;
  width: 270px;
  padding: 8px;
  border-radius: 20px;
  background:
    radial-gradient(circle, rgba(18, 50, 74, 0.06) 1px, transparent 1.2px) 0 0 / 16px 16px,
    #fffaf0;
  box-shadow: 0 4px 0 #e2cfab, 0 24px 44px -14px rgba(18, 50, 74, 0.45);
  transform-origin: 30px 0;
}
.sort-head {
  margin: 6px 10px 4px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #d94b5b;
}
.sort-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #12324a;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s, transform 0.12s;
}
.sort-item:hover,
.sort-item:focus-visible {
  background: #fff1d6;
  transform: translateX(3px);
  outline: none;
}
.sort-item.on {
  background: #ffe3a1;
  font-weight: 900;
}
.sort-tick {
  margin-left: auto;
  line-height: 0;
}
.sort-pop-enter-active {
  transition: opacity 0.15s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sort-pop-leave-active {
  transition: opacity 0.12s, transform 0.12s;
}
.sort-pop-enter-from,
.sort-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.95);
}
@media (max-width: 480px) {
  .sortbox {
    flex: 1;
  }
  .sort-btn {
    width: 100%;
  }
  .sort-caret {
    margin-left: auto;
  }
  .sort-menu {
    width: 100%;
  }
}
.icon-btn:focus-visible,
.trip-card:focus-visible {
  outline: 3px solid rgba(0, 121, 140, 0.4);
  outline-offset: 2px;
}

.section-title {
  font-size: 1.5rem;
  margin: 0;
}
.trips-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
/* ---------- Planning / Upcoming / Archive: chunky beveled tabs (like Discover's stamps) ---------- */
.stage-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 10px;
}
.stage-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 2.5px solid #efdcbc;
  border-radius: 14px;
  background: #fffaf0;
  color: #12324a;
  font-size: 14.5px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 4px 0 #e2cfab;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s, background 0.15s, border-color 0.15s;
}
.stage-tab:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 0 #e2cfab;
}
.stage-tab:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #e2cfab;
}
.stage-tab.on {
  border-color: #12324a;
  background: #ffbf3c;
  transform: translateY(-3px) rotate(-1.5deg);
  box-shadow: 0 5px 0 #12324a;
  animation: tab-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes tab-pop {
  45% { transform: translateY(-6px) rotate(-4deg) scale(1.08); }
}
.stage-count {
  display: inline-block;
  min-width: 22px;
  padding: 0 6px;
  border-radius: 7px;
  font-size: 12px;
  text-align: center;
  background: rgba(18, 50, 74, 0.08);
}
.stage-tab.on .stage-count {
  background: rgba(18, 50, 74, 0.16);
}
.stage-tab:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
}
@media (max-width: 480px) {
  .stage-tabs {
    width: 100%;
    flex-wrap: nowrap;
  }
  .stage-tab {
    flex: 1;
    min-width: 0;
    justify-content: center;
    gap: 4px;
    padding: 8px 4px;
    font-size: 13px;
  }
  .stage-tab :deep(.dz) {
    display: none; /* no room for the icons on phones */
  }
}

/* ---------- Trip postcards ---------- */
.fun {
  font-family: 'Lilita One', var(--font-display);
  font-weight: 400;
  letter-spacing: 0.01em;
}
.trip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 28px 24px;
  padding-top: 10px; /* room for the status stickers */
}
.trip-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 10px 10px 0;
  border-radius: 24px;
  background: #fffaf0;
  color: #12324a;
  transform: rotate(var(--tilt, 0deg));
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.9), 0 5px 0 #e3cfa9, 0 20px 32px -18px rgba(18, 50, 74, 0.5);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
}
.trip-card[data-testid="trip-card"] {
  cursor: pointer;
}
.trip-card:hover,
.trip-card:focus-within {
  transform: rotate(0deg) translateY(-8px);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.9), 0 7px 0 #e3cfa9, 0 30px 36px -18px rgba(18, 50, 74, 0.55);
}
/* pointed at on the map: lifts with a gold ring */
.trip-card.lit {
  transform: rotate(0deg) translateY(-8px);
  box-shadow: 0 0 0 3px #ffbf3c, 0 7px 0 #e3cfa9, 0 30px 36px -18px rgba(18, 50, 74, 0.55);
}
/* the photo window */
.trip-art {
  position: relative;
  display: block;
  height: 170px;
  border-radius: 15px;
  background: var(--sky);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(18, 50, 74, 0.1);
}
.trip-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: photo-in 0.4s ease;
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.trip-card:hover .trip-photo {
  transform: scale(1.06);
}
@keyframes photo-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.trip-art svg {
  width: 100%;
  height: 100%;
  display: block;
}
.sun { fill: var(--sun); }
.mountain-back { fill: var(--far); }
.hill { fill: var(--near); }
.theme-0 { --sky: #dff3ec; --sun: #ffd166; --far: #8fd3b8; --near: #2f9e78; }
.theme-1 { --sky: #e3eefc; --sun: #ffd166; --far: #9cbcea; --near: #3f6fb5; }
.theme-2 { --sky: #fdf0e1; --sun: #f08c3a; --far: #f2c48d; --near: #c9733a; }
.theme-3 { --sky: #ece6fb; --sun: #ffd166; --far: #b8a6ea; --near: #6a54b5; }
/* status: an angled souvenir sticker over the photo's top-left corner */
.trip-status {
  position: absolute;
  top: -8px;
  left: -8px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px 5px 8px;
  border: 3px solid #fff;
  border-radius: 12px;
  background: #ffe3a1;
  color: #12324a;
  font-size: 12.5px;
  font-weight: 900;
  white-space: nowrap;
  transform: rotate(-6deg);
  box-shadow: 0 4px 8px rgba(18, 50, 74, 0.3);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.trip-card:hover .trip-status {
  transform: rotate(-2deg) scale(1.05);
}
.status-none { background: #e4dcff; }
.status-upcoming { background: #ffe3a1; }
.status-ongoing {
  background: #ff6b7a;
  color: #fff;
  animation: status-pulse 1.8s ease-in-out infinite;
}
@keyframes status-pulse {
  0%, 100% { box-shadow: 0 4px 8px rgba(18, 50, 74, 0.3), 0 0 0 0 rgba(255, 107, 122, 0.5); }
  50% { box-shadow: 0 4px 8px rgba(18, 50, 74, 0.3), 0 0 0 8px rgba(255, 107, 122, 0); }
}
.status-past { background: #dde6ec; }
/* how many people: a small cream chip in the photo's top-right */
.trip-demo {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px 3px 6px;
  border-radius: 999px;
  background: #fffaf0;
  color: #12324a;
  font-size: 12px;
  font-weight: 900;
  box-shadow: 0 3px 8px rgba(18, 50, 74, 0.3);
}
/* the card body */
.trip-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 14px 6px 14px;
}
.trip-name {
  margin: 0 0 4px;
  font-size: 1.45rem;
  line-height: 1.1;
  color: #12324a;
}
.trip-dates {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  color: #5a6b78;
}
/* the route: places joined by a dotted line, each flag a little stamp */
.trip-route {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 0;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
  font-size: 14px;
  font-weight: 800;
}
.trip-stop {
  display: inline-flex;
  align-items: center;
}
.trip-stop + .trip-stop::before {
  content: '';
  width: 20px;
  height: 2px;
  margin: 0 6px;
  background-image: radial-gradient(circle, #ffbf3c 1.3px, transparent 1.5px);
  background-size: 5px 2px;
}
.nowrap {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap; /* keep a flag next to its place name */
}
.trip-stamp {
  display: inline-flex;
  padding: 3px;
  background: radial-gradient(circle, transparent 1.3px, #fff 1.6px) -2.5px -2.5px / 5px 5px;
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.3));
  transform: rotate(-4deg);
}
.trip-stamp :deep(.fl) {
  border-radius: 0;
  box-shadow: none;
}
.trip-foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.avatars {
  display: flex;
}
.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #24407a;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fffaf0;
  margin-left: -8px;
}
.avatar:first-child { margin-left: 0; }
.avatar.more { background: #8a99a5; }
.avatar.guest {
  background: #fffaf0;
  color: #8a99a5;
  border: 2px dashed #c9b894;
}
.shared-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px 3px 7px;
  border-radius: 999px;
  background: #d7f2f4;
  color: #0f6e7b;
  font-size: 12px;
  font-weight: 800;
}
.icon-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #5a6b78;
  transition: background 0.15s, color 0.15s;
}
.icon-btn:hover {
  background: #ffe1e4;
  color: #c43a4b;
}
.trip-confirm {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 800;
  color: #c43a4b;
}
.trip-confirm button {
  padding: 4px 10px;
  border: 0;
  border-radius: 9px;
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
}
.trip-confirm-yes {
  background: #c43a4b;
  color: #fff;
  box-shadow: 0 2px 0 #8f2533;
}
.trip-confirm-no {
  background: #f1e7d5;
  color: #12324a;
  box-shadow: 0 2px 0 #d7c3a0;
}
/* "Open trip →": a chunky amber button with a bevel that presses down */
.open-btn {
  display: block;
  margin-top: 14px;
  padding: 11px 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffd36e, #ffbf3c 55%, #f5a922);
  color: #12324a;
  font-weight: 900;
  text-align: center;
  text-decoration: none;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 4px 0 #b9770f;
  transition: transform 0.12s, box-shadow 0.12s;
}
.open-btn:hover {
  color: #12324a;
  transform: translateY(-2px);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 6px 0 #b9770f;
}
.open-btn:active {
  transform: translateY(3px);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 1px 0 #b9770f;
}
.open-btn:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
}
/* finished trips look a little faded until you hover */
.trip-card.archived .trip-photo,
.trip-card.archived .trip-art svg {
  filter: grayscale(0.6);
  transition: filter 0.2s, transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.trip-card.archived:hover .trip-photo,
.trip-card.archived:hover .trip-art svg {
  filter: none;
}
/* ---------- "New trip": a blank postcard (same frame as the trip cards), the whole card is the button ---------- */
.new-tile {
  border: 0;
  padding-bottom: 10px; /* even cream frame all round */
  font: inherit;
  cursor: pointer;
  min-height: 330px;
}
.new-tile:hover,
.new-tile:focus-visible {
  transform: rotate(0deg) translateY(-6px);
}
.new-slot {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
  border: 2.5px dashed #c9b894;
  border-radius: 15px;
  background:
    radial-gradient(circle, rgba(18, 50, 74, 0.08) 1.1px, transparent 1.3px) 0 0 / 16px 16px,
    #fff3dc;
  transition: border-color 0.2s;
}
.new-tile:hover .new-slot {
  border-color: #ffbf3c;
}
/* empty stamp slot, like the stamps on the other postcards */
.new-stamp {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 50px;
  height: 58px;
  padding: 4px;
  border: 2px dotted #b9a47c;
  border-radius: 4px;
  color: #a08c66;
  font-size: 8.5px;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: 0.04em;
  text-align: center;
  text-transform: uppercase;
  transform: rotate(4deg);
}
/* faint postmark ink (behind everything) */
.new-postmark {
  position: absolute;
  left: 10px;
  top: 18px;
  width: 190px;
  color: #12324a;
  opacity: 0.12;
  transform: rotate(-12deg);
  pointer-events: none;
}
/* the "+", centred on the whole card */
.new-focus {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
}
/* three faint address lines in the lower third */
.new-address {
  position: relative;
  z-index: 1;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 10px 22px 24px;
}
.new-line {
  display: flex;
  justify-content: flex-end;
  height: 2px;
  border-bottom: 2px dotted rgba(168, 151, 120, 0.5);
  border-radius: 2px;
}
.new-line:nth-child(2) {
  margin-right: 18%;
}
/* "+ PLAN A TRIP": an inked rubber stamp (double border in navy ink, slightly crooked) */
.new-ink {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 22px;
  border: 3px solid currentColor;
  border-radius: 16px;
  box-shadow: inset 0 0 0 3px #fff3dc, inset 0 0 0 4.5px currentColor; /* the thin second ring inside */
  color: rgba(36, 64, 122, 0.82);
  font-family: 'Lilita One', var(--font-display);
  font-size: 1.2rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transform: rotate(-2deg);
  mix-blend-mode: multiply; /* sits "in" the paper like ink */
  /* a little uneven, like a real rubber stamp */
  -webkit-mask-image: radial-gradient(circle at 30% 40%, #000 60%, rgba(0, 0, 0, 0.82) 100%);
  mask-image: radial-gradient(circle at 30% 40%, #000 60%, rgba(0, 0, 0, 0.82) 100%);
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s;
}
.new-tile:hover .new-ink,
.new-tile:focus-visible .new-ink {
  transform: rotate(-2deg) scale(1.05);
  color: rgba(36, 64, 122, 0.95);
}
.new-tile:active .new-ink {
  transform: rotate(-2deg) scale(0.97);
}
.new-tile:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 4px;
}

/* Loading skeleton */
.skeleton {
  min-height: 330px;
  transform: none;
  background: linear-gradient(90deg, #efe9df 25%, #f9f6f0 50%, #efe9df 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}
@keyframes shimmer {
  to { background-position: -200% 0; }
}

.empty {
  text-align: center;
  padding: 40px 16px;
  color: var(--app-muted);
  background: #fbf5ea;
  border: 1px dashed var(--app-border);
  border-radius: 16px;
}

/* Cards fade in/out when filtering */
.list-enter-active,
.list-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

/* Phones */
@media (max-width: 576px) {
  .hero { min-height: 0; border-radius: 18px; }
  .hero-panel { max-width: none; padding: 28px 22px; }
}

/* Respect "reduce motion" */
@media (prefers-reduced-motion: reduce) {
  .trip-card,
  .hero-btn,
  .slide-enter-active,
  .slide-leave-active,
  .list-enter-active,
  .list-leave-active {
    transition: none;
  }
  .trip-card, .trip-card:hover, .trip-card.lit { transform: none; }
  .stage-tab.on, .status-ongoing { animation: none; }
  .skeleton { animation: none; }
}

/* "Showing trips to Kyoto" (after tapping a passport stamp) */
.stamp-filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: -10px 0 18px;
  font-weight: 600;
}
.stamp-filter-x {
  padding: 5px 12px;
  border: 0;
  border-radius: 999px;
  background: #12324a;
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

/* ---------- Plan-a-trip notebook (inside NotebookModal) ---------- */
.nbf {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 18px;
}
.nbf-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nbf-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 800;
  color: #12324a;
}
.nbf-label small {
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 600;
  color: #6b7f8e;
}
.nbf-mini {
  position: absolute;
  top: -9px;
  left: 14px;
  padding: 0 6px;
  border-radius: 6px;
  background: #fffaf0;
  font-size: 11.5px;
  font-weight: 800;
  color: #4a6274;
}
/* chunky, rounded "notebook entry" fields */
.nbf-field {
  position: relative;
}
.nbf-input {
  width: 100%;
  min-width: 0;
  min-height: 52px;
  padding: 12px 44px 12px 16px;
  border: 2.5px solid #12324a;
  border-radius: 18px;
  background: #fbf5ea;
  color: #12324a;
  font: inherit;
  font-size: 16px; /* 16px: phones don't zoom in */
  font-weight: 600;
  box-shadow: 0 4px 0 rgba(18, 50, 74, 0.18);
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
}
.nbf-input::placeholder {
  color: #8a9aa6;
  font-weight: 500;
}
.nbf-input:focus {
  outline: none;
  transform: translateY(-1px);
  box-shadow: 0 5px 0 #ffbf3c, 0 0 0 4px rgba(255, 191, 60, 0.3);
}
.nbf-field.is-error .nbf-input {
  border-color: #d94b5b;
  box-shadow: 0 4px 0 rgba(217, 75, 91, 0.35);
}
.nbf-ok {
  position: absolute;
  right: 12px;
  top: 50%;
  margin-top: -11px;
}
.nbf-spin {
  position: absolute;
  right: 16px;
  top: 50%;
  width: 18px;
  height: 18px;
  margin-top: -9px;
  border-radius: 50%;
  border: 3px solid rgba(18, 50, 74, 0.2);
  border-top-color: #12324a;
  animation: nbf-spin 0.8s linear infinite;
}
@keyframes nbf-spin {
  to { transform: rotate(360deg); }
}
.nbf-msg {
  margin: 0;
  min-height: 0;
  font-size: 13px;
  font-weight: 700;
}
.nbf-msg:empty {
  display: none;
}
.nbf-msg.is-error {
  color: #c43a4b;
}
.nbf-msg.is-success {
  color: #0f8d9b;
}
/* type-ahead list */
.nbf-suggest {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  z-index: 5;
  margin: 0;
  padding: 6px;
  list-style: none;
  border: 2.5px solid #12324a;
  border-radius: 18px;
  background: #fbf5ea;
  box-shadow: 0 5px 0 #12324a, 0 18px 30px -12px rgba(0, 0, 0, 0.3);
}
.nbf-suggest-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
}
.nbf-suggest-item.active {
  background: #fff1cf;
}
/* chosen stops */
.nbf-stops {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.nbf-stop {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 6px 5px 6px;
  border-radius: 14px;
  background: #e3f1ff;
  border: 2px solid #12324a;
  font-size: 14px;
  font-weight: 700;
  animation: pl-pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.nbf-stop-n {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #12324a;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}
.nbf-stop-move {
  display: inline-flex;
  gap: 2px;
}
.nbf-stop-move button {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 8px;
  background: rgba(18, 50, 74, 0.08);
  color: #12324a;
  cursor: pointer;
}
.nbf-stop-move button:hover:not(:disabled) {
  background: #ffbf3c;
}
.nbf-stop-move button:disabled {
  opacity: 0.3;
  cursor: default;
}
.nbf-stop-x {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #12324a;
  cursor: pointer;
}
.nbf-stop-x:hover {
  background: rgba(217, 75, 91, 0.15);
  color: #c43a4b;
}
/* dates + duration counter */
.nbf-dates {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding-top: 8px;
}
.nbf-days {
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: 8px 14px;
  border-radius: 16px;
  background: #ffbf3c;
  border: 2.5px solid #12324a;
  box-shadow: 0 4px 0 #12324a;
  color: #12324a;
  transform: rotate(2deg);
  white-space: nowrap;
}
.nbf-days b {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 900;
  line-height: 1;
}
.nbf-days span {
  font-size: 13px;
  font-weight: 800;
}
.nbf-pop-enter-active {
  transition: transform 0.4s cubic-bezier(0.34, 1.7, 0.64, 1), opacity 0.2s;
}
.nbf-pop-leave-active {
  transition: opacity 0.12s;
}
.nbf-pop-enter-from {
  opacity: 0;
  transform: scale(0.6) rotate(-8deg);
}
.nbf-pop-leave-to {
  opacity: 0;
}
.nbf-dates .nbf-input {
  padding: 12px 10px 12px 14px; /* no tick icon here: give the date the room */
  cursor: pointer;
}
@media (max-width: 420px) {
  .nbf-dates {
    grid-template-columns: minmax(0, 1fr) !important; /* phones: one date per line so they're never cut off */
    gap: 18px;
  }
}
/* vibe badges */
.nbf-vibes {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.nbf-vibe {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px 10px;
  border: 2.5px solid #12324a;
  border-radius: 20px;
  background: #fbf5ea;
  color: #12324a;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 #12324a;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s, box-shadow 0.15s;
}
.nbf-vibe:hover {
  transform: translateY(-3px);
}
.nbf-vibe:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #12324a;
}
.nbf-vibe.on {
  background: #dff6f3;
  box-shadow: 0 4px 0 #0f8d9b;
  border-color: #0f8d9b;
}
/* the big 3D "Confirm Trip" button (presses down when clicked) */
.nbf-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}
.nbf-later {
  padding: 10px 16px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #4a6274;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.nbf-later:hover {
  background: rgba(18, 50, 74, 0.06);
}
.nbf-go {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border: 2.5px solid #12324a;
  border-radius: 20px;
  background: linear-gradient(180deg, #ffd36e, #ffbf3c 55%, #f5a922);
  color: #12324a;
  font: inherit;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(0, 0, 0, 0.08), 0 7px 0 #12324a, 0 16px 24px -10px rgba(18, 50, 74, 0.45);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.nbf-go:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(0, 0, 0, 0.08), 0 9px 0 #12324a, 0 18px 26px -10px rgba(18, 50, 74, 0.45);
}
.nbf-go:active:not(:disabled) {
  transform: translateY(6px);
  box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.15), 0 1px 0 #12324a;
}
.nbf-go:disabled {
  opacity: 0.6;
  cursor: wait;
}
.nbf button:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
}
@media (max-width: 600px) {
  .nbf-dates {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
  .nbf-days {
    grid-column: 1 / -1;
    justify-self: start;
  }
  .nbf-vibes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .nbf-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  .nbf-go {
    justify-content: center;
  }
}
@media (prefers-reduced-motion: reduce) {
  .nbf-stop, .nbf-spin { animation: none; }
  .nbf-badge, .nbf-vibe, .nbf-go, .nbf-input { transition: none; }
}
</style>