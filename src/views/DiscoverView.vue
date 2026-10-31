<template>
  <div class="dx" :class="{ 'has-tray': shortlist.length }" :style="{ '--dx-top-h': topHeight + 'px' }">
    <!-- Discover: filter by dates, budget and vibe; countries on the left, a 3D pillar map on the right,
         and a shortlist tray docked at the bottom -->
    <!-- ===== Explorer mission control: title + Pip the scout, then search and filters ===== -->
    <header ref="topEl" class="dx-top">
      <!-- Row 1 -->
      <div class="dx-row1">
        <div class="dx-brand">
          <!-- Inside a country, the always-visible back button returns to all countries -->
          <button v-if="openName" type="button" class="dx-back" aria-label="Back to all countries" title="Back to all countries (Esc)" @click="unfocus">‹</button>
          <router-link v-else :to="auth.token ? '/home' : '/'" class="dx-back" :aria-label="auth.token ? 'Back to my trips' : 'Back to the start'">‹</router-link>
          <div>
            <nav v-if="openName" class="dx-crumbs" aria-label="You are here">
              <button type="button" class="dx-crumb" @click="unfocus">All countries</button>
              <span aria-hidden="true">›</span>
              <h1 class="dx-title fun">{{ openName }}</h1>
            </nav>
            <h1 v-else class="dx-title fun">Where to next?</h1>
          </div>
        </div>

        <!-- Pip the scout (a short, cheery line; tap him for another) -->
        <div class="dx-scout">
          <transition name="dx-tipswap" mode="out-in">
            <p :key="scout" class="dx-scout-bubble" aria-live="polite">{{ scout }}</p>
          </transition>
          <button type="button" class="dx-scout-pip" :class="{ hop: scoutHop }" aria-label="Pip, your scout. Tap for another tip" @click="nextTip">
            <PlaneGuide :size="58" :mood="scoutMood" />
          </button>
        </div>
      </div>

      <!-- Row 2: search, then the expedition settings -->
      <div class="dx-row2" data-tour="vibe-filters">
        <div class="dx-search" :class="{ open: suggestOpen && suggestions.length }">
          <span class="dx-search-icon" aria-hidden="true"><DoodleIcon name="search" :size="24" anim="" /></span>
          <input ref="searchEl" v-model="search" type="text" class="dx-search-input" placeholder="Search a city or country, e.g. Kyoto or Japan"
            role="combobox" aria-autocomplete="list" aria-controls="dx-suggest" :aria-expanded="suggestOpen && suggestions.length > 0"
            :aria-activedescendant="activeSuggest >= 0 ? 'dx-sg-' + activeSuggest : null" aria-label="Search a city or country"
            autocomplete="off" spellcheck="false" @input="suggestOpen = true; activeSuggest = -1" @focus="suggestOpen = true"
            @blur="closeSuggest" @keydown="onSearchKey">
          <button v-if="search" type="button" class="dx-search-clear" aria-label="Clear search" @mousedown.prevent @click="clearSearch">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <kbd v-else class="dx-search-kbd" aria-hidden="true" title="Press / to search">/</kbd>

          <ul v-if="suggestOpen && suggestions.length" id="dx-suggest" class="dx-suggest" role="listbox" aria-label="Suggestions">
            <li v-for="(sg, i) in suggestions" :id="'dx-sg-' + i" :key="sg.key" role="option" :aria-selected="i === activeSuggest"
              class="dx-sg" :class="{ active: i === activeSuggest }" @mousedown.prevent="pickSuggest(sg)" @mouseenter="activeSuggest = i">
              <span class="dx-sg-flag dx-stamp sm" aria-hidden="true"><FlagImg :code="sg.cc" :size="14" /></span>
              <span class="dx-sg-text">
                <strong>{{ sg.label }}</strong>
                <small>{{ sg.sub }}</small>
              </span>
              <span class="dx-sg-kind">{{ sg.kind === 'country' ? 'Country' : 'City' }}</span>
            </li>
          </ul>
        </div>

        <!-- Dates: a pocket logbook (tap anywhere on a page to pick the date) -->
        <div class="dx-logbook" role="group" aria-label="Travel dates">
          <label class="dx-logpage" @click="openPicker">
            <small><DoodleIcon name="calendar" :size="14" anim="" /> Depart</small>
            <input v-model="start" type="date" :min="today" aria-label="Depart">
          </label>
          <span class="dx-logbook-ring" aria-hidden="true"></span>
          <label class="dx-logpage" @click="openPicker">
            <small><DoodleIcon name="plane" :size="14" anim="" /> Return</small>
            <input v-model="end" type="date" :min="start || today" aria-label="Return">
          </label>
        </div>

        <!-- Budget: three coins; the picked one is gold and flips -->
        <div class="dx-coins" role="radiogroup" aria-label="Daily budget">
          <button v-for="b in BUDGETS" :key="b.value" type="button" class="dx-coin" :class="{ on: budget === b.value, flip: coinFlip === b.value }"
            role="radio" :aria-checked="budget === b.value" :title="b.title" @click="pickBudget(b.value)">
            <span class="dx-coin-face">{{ b.label }}</span>
          </button>
        </div>

        <button type="button" class="dx-quiz-btn" @click.stop="openQuiz">
          <DoodleIcon name="sparkle" :size="20" tint="amber" anim="" /> {{ vibes.length ? 'Check your vibe again' : 'Check your vibe' }}
        </button>
        <button v-if="!auth.token" type="button" class="dx-signin" @click="askToSignIn('')">Sign in</button>
      </div>

      <!-- Row 3: continent stamps (inked once explored) + your vibe stickers -->
      <div class="dx-row3">
        <div v-if="!openName" class="dx-conts" role="group" aria-label="Continent">
          <button v-for="(c, i) in CONTINENT_CHIPS" :key="c.key" type="button" class="dx-cont"
            :class="{ on: continent === c.key, inked: !c.key || explored.includes(c.key) }" :style="{ '--tilt': STAMP_TILT[i % 5] }"
            :aria-pressed="continent === c.key" @click="pickContinent(c.key)">
            <DoodleIcon :name="c.doodle" :size="20" anim="" /> {{ c.label }}<span v-if="c.key" class="dx-cont-n">{{ continentCounts[c.key] || 0 }}</span>
          </button>
        </div>
        <div v-if="vibes.length" class="dx-vibebox" aria-label="Your vibe">
          <button v-for="(v, i) in vibes" :key="v" type="button" class="dx-sticker" :style="{ '--tilt': STICKER_TILT[i % 4] }"
            :aria-label="'Remove the ' + v + ' vibe'" @click="toggleVibe(v)"><DoodleIcon :name="vibeDoodle(v)" :size="16" anim="" /> {{ v }} <span aria-hidden="true">×</span></button>
        </div>
      </div>
      <p v-if="dateError" class="dx-error" role="alert">{{ dateError }}</p>
    </header>

    <div class="dx-split" :class="{ 'map-only': mapOnly }">
      <!-- ===== Feed: one card per country, its cities in a swipeable row ===== -->
      <section v-show="!mapOnly" ref="feedEl" class="dx-feed" aria-label="Destinations">
        <!-- Countries reshuffle with a slide when the ranking changes (e.g. after the vibe quiz) -->
        <TransitionGroup name="dx-shuffle" tag="div" class="dx-groups">
        <article v-for="g in groups" :key="g.country" :data-country="g.country" class="dx-country glass" :class="{ lit: hoverCountry === g.country, focused: focusCountry === g.country }"
          @mouseenter="hoverCountry = g.country" @mouseleave="hoverCountry = null" @click="openCountryCard($event, g.country)">
          <!-- Opened country: a photo header -->
          <div v-if="focusCountry === g.country" class="dx-hero" :class="{ nophoto: !heroPhoto(g.country) }" :style="heroStyle(g.country)">
            <button type="button" class="dx-hero-back" aria-label="Back to all countries" @click="unfocus">‹ Back</button>
            <h2 class="dx-hero-name fun"><span class="dx-stamp"><FlagImg :code="g.cc" :size="22" /></span> {{ g.country }}</h2>
          </div>
          <header class="dx-country-head">
            <button v-if="focusCountry !== g.country" type="button" class="dx-country-btn" :aria-label="'Explore ' + g.country" @click="focus(g.country)">
              <h2 class="dx-country-name fun"><span class="dx-stamp"><FlagImg :code="g.cc" :size="18" /></span> {{ g.country }} <span class="dx-explore" aria-hidden="true">Explore ›</span></h2>
              <p class="dx-tagline">{{ g.tagline }}</p>
            </button>
            <p v-else class="dx-tagline big">{{ g.tagline }}</p>
            <div class="dx-country-meta">
              <span class="dx-grade sm" :class="'g-' + gradeOf(g.best).letter" :title="'Best match in ' + g.country + ': ' + g.best + ' out of 100'">{{ gradeOf(g.best).letter }}</span>
              <span v-if="g.gems" class="dx-gems">+{{ g.gems }} hidden gem{{ g.gems === 1 ? '' : 's' }}</span>
            </div>
          </header>

          <div class="dx-row" role="list" :aria-label="'Cities in ' + g.country">
            <!-- Each city is a collectible postcard: a photo in a cream frame, tilted a little, with a postage-stamp
                 grade, souvenir stickers, a luggage-tag price and a bookmark to pack it -->
            <article v-for="(c, ci) in g.cities" :key="c.id" :ref="(el) => { if (el) cardEls[c.id] = el }" role="listitem"
              class="dx-city deal" :class="['r-' + c.rarity.key, { lit: hoverId === c.id, flash: flashId === c.id, packed: liked(c.id) }]"
              :style="{ '--i': ci, '--tilt': ci % 2 ? '1.5deg' : '-1.5deg' }" tabindex="0" :aria-label="'Show ' + c.cityName + ' on the map'"
              @mouseenter="hoverId = c.id" @mouseleave="hoverId = null" @focus="hoverId = c.id" @blur="hoverId = null"
              @click="showOnMap(c)" @keydown.enter.self="showOnMap(c)">
              <!-- the photo -->
              <div class="dx-photo" :style="postcardPhoto(c)">
                <span v-if="c.rarity.label" class="dx-rarity" :class="'r-' + c.rarity.key">{{ c.rarity.label }}</span>
                <span v-if="c.rarity.key !== 'common'" class="dx-foil" aria-hidden="true"></span>
                <!-- favourite: a round heart button (outline = not saved, filled coral = saved into your suitcase) -->
                <button type="button" class="dx-fav" :class="{ on: liked(c.id), pop: popId === c.id }" :aria-pressed="liked(c.id)"
                  :aria-label="'Favorite destination: ' + c.cityName" :title="liked(c.id) ? 'Saved. Tap to remove' : 'Save to your suitcase'"
                  @click.stop="toggleLike(c, $event)" @keydown.enter.stop @keydown.space.stop>
                  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
                    <path d="M12 20.2s-7.6-4.6-8.9-9.3C2.2 7.6 4.3 4.8 7.3 4.8c2 0 3.6 1.2 4.7 2.9 1.1-1.7 2.7-2.9 4.7-2.9 3 0 5.1 2.8 4.2 6.1-1.3 4.7-8.9 9.3-8.9 9.3Z"
                      stroke-width="2.2" stroke-linejoin="round" />
                  </svg>
                  <span v-if="burstId === c.id" class="dx-burst" aria-hidden="true"><i v-for="k in 8" :key="k" :style="{ '--a': k * 45 + 'deg' }"></i></span>
                </button>
                <!-- match grade as a postage stamp with a postmark (tap it for "why") -->
                <button type="button" class="dx-poststamp" :class="'g-' + gradeOf(c.score).letter" :aria-expanded="whyId === c.id"
                  :aria-label="'Match ' + c.score + ' out of 100, ' + gradeOf(c.score).label + '. Why?'" @click.stop="whyId = whyId === c.id ? null : c.id">
                  <span class="dx-poststamp-face">
                    <strong>{{ gradeOf(c.score).letter }}</strong>
                    <small>{{ c.score }}</small>
                  </span>
                  <svg class="dx-postmark" viewBox="0 0 70 34" aria-hidden="true">
                    <circle cx="17" cy="17" r="13" fill="none" stroke="currentColor" stroke-width="2" />
                    <path d="M33 9c5-3 9 3 14 0s9 3 14 0M33 17c5-3 9 3 14 0s9 3 14 0M33 25c5-3 9 3 14 0s9 3 14 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </button>
              </div>
              <!-- the open bottom margin: name, vibe stickers, then when to go (left) and the price tag (right) -->
              <div class="dx-city-body">
                <h3 class="dx-city-name fun">{{ c.cityName }}</h3>
                <div class="dx-tags">
                  <span v-for="(t, ti) in c.vibeTags" :key="t" class="dx-sticker sm" :class="['v-' + vibeDoodle(t), { hit: vibes.includes(t) }]"
                    :style="{ '--tilt': STICKER_TILT[(ti + ci) % 4] }"><DoodleIcon :name="vibeDoodle(t)" :size="13" anim="" /> {{ t }}</span>
                </div>
                <div class="dx-card-foot">
                  <span class="dx-season" :class="{ good: c.monthFit === 1 }">
                    <DoodleIcon :name="c.monthFit === 1 ? 'check' : 'calendar'" :size="14" anim="" />
                    {{ c.monthFit === 1 ? 'Great time to go' : 'Best ' + monthsText(c.bestMonths) }}
                  </span>
                  <span class="dx-luggage" :title="'About $' + c.estDailyBudget + ' a day'">${{ c.estDailyBudget }}<small>/day</small></span>
                </div>
              </div>
              <!-- "Why 94?" -->
              <div v-if="whyId === c.id" class="dx-why" role="dialog" :aria-label="'Why ' + c.cityName + ' scores ' + c.score" @click.stop>
                <p class="dx-why-title">Why {{ c.score }}?</p>
                <ul>
                  <li v-for="r in reasonsFor(c)" :key="r.text" :class="r.good ? 'good' : 'meh'">{{ r.good ? '✓' : '–' }} {{ r.text }}</li>
                </ul>
                <p class="dx-why-how">{{ vibes.length ? 'Vibe 40% · season 30% · budget 15% · popularity 15%' : 'Season 45% · budget 25% · popularity 30%' }}</p>
              </div>
            </article>
          </div>

          <!-- Opened country: its top sights, to tempt you in (tap one to see its city on the map) -->
          <section v-if="focusCountry === g.country && sightsOf(g.country).length" class="dx-sights" :aria-label="'Top sights in ' + g.country">
            <h3 class="dx-sights-title">Top {{ sightsOf(g.country).length }} things to see</h3>
            <ol class="dx-sights-row">
              <li v-for="(a, i) in sightsOf(g.country)" :key="a.name">
                <button type="button" class="dx-sight" :class="{ loading: sightPhotos[a.name] === null }" :style="sightStyle(a)" :aria-label="(i + 1) + '. ' + sightName(a) + ', near ' + a.city + '. Show on the map'" @click="showSight(g.country, a)">
                  <span class="dx-sight-rank" aria-hidden="true">{{ i + 1 }}</span>
                  <span class="dx-sight-text">
                    <strong>{{ sightName(a) }}</strong>
                    <small><AppIcon name="map-pin" :size="12" /> {{ a.city }}</small>
                  </span>
                </button>
              </li>
            </ol>
          </section>
        </article>
        </TransitionGroup>
        <!-- A country without cities in Discover yet -->
        <article v-if="otherCountry" class="dx-country glass focused">
          <div class="dx-hero" :class="{ nophoto: !heroPhoto(otherCountry) }" :style="heroStyle(otherCountry)">
            <button type="button" class="dx-hero-back" aria-label="Back to all countries" @click="unfocus">‹ Back</button>
            <h2 class="dx-hero-name">{{ otherCountry }}</h2>
          </div>
          <p class="dx-tagline big">Not in Discover yet. You can still plan a trip here and choose the places yourself.</p>
          <button type="button" class="dx-cta dx-other-cta" :disabled="!!dateError" @click="planOther">Plan a trip to {{ otherCountry }} →</button>
        </article>
        <div v-else-if="!groups.length && search.trim()" class="dx-empty">
          <PlaneGuide :size="86" mood="wave" />
          <p>Hmm, I can't find "{{ search.trim() }}" on my map. <button type="button" class="dx-link" @click="search = ''">Clear search</button></p>
        </div>
        <div v-else-if="!groups.length" class="dx-empty">
          <PlaneGuide :size="86" mood="wave" />
          <p>No places match those vibes yet. <button type="button" class="dx-link" @click="openQuiz">Check your vibe again</button></p>
        </div>
      </section>

      <!-- ===== 3D map ===== -->
      <div class="dx-mapcol">
      <!-- Map size: hide the list to give the map the whole width (narrow screens: a taller map), and back.
           A labelled button over the map's top-left corner that stays on screen while you scroll (sticky). -->
      <button type="button" class="dx-widen glass" :aria-pressed="mapOnly" @click="toggleMapOnly">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path v-if="mapOnly" d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
          <path v-else d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
        <span>{{ mapOnly ? 'Show list' : 'Expand map' }}</span>
      </button>
      <section class="dx-mapwrap" aria-label="Map of destinations" data-tour="map-layer">
        <div ref="mapEl" class="dx-map"></div>
        <p v-if="mapError" class="dx-maperr glass">{{ mapError }}</p>
        <!-- Spin the globe: it spins and lands on a random high-match city -->
        <button type="button" class="dx-spin" :disabled="spinning" aria-label="Spin the globe: land on a random top match" @click="spinGlobe">
          <DoodleIcon name="compass" :size="22" anim="" :class="{ 'dx-spinning': spinning }" /> <span class="dx-spin-text">{{ spinning ? 'Spinning…' : 'Spin the globe' }}</span>
        </button>
        <!-- Rotation slider (also follows right-click / two-finger rotating) -->
        <div class="dx-rotate glass">
          <label for="dx-rot" class="dx-rot-label">Rotate</label>
          <input id="dx-rot" v-model.number="rotation" type="range" min="-180" max="180" step="1" class="dx-rot-range"
            :aria-valuetext="rotation + ' degrees'" @input="rotateMap">
          <button type="button" class="dx-rot-reset" :disabled="rotation === 0" title="North up" aria-label="Reset rotation to north up" @click="rotation = 0; rotateMap()">N</button>
        </div>

        <!-- Glass tooltip over a hovered pillar -->
        <transition name="dx-pop">
          <div v-if="tip" class="dx-tip glass" :style="{ left: tip.x + 'px', top: tip.y + 'px' }" aria-hidden="true">
            <div class="dx-tip-photo" :style="photoStyle(tip.city)"></div>
            <div class="dx-tip-body">
              <strong class="fun"><span class="dx-stamp sm"><FlagImg :code="tip.city.cc" :size="12" /></span> {{ tip.city.cityName }}</strong>
              <small>{{ gradeOf(tip.city.score).letter }} · {{ tip.city.score }} {{ gradeOf(tip.city.score).label }} · ~${{ tip.city.estDailyBudget }}/day</small>
            </div>
            <p v-if="liked(tip.city.id)" class="dx-tip-hint"><AppIcon name="heart" :size="13" filled /> Packed in your suitcase</p>
          </div>
        </transition>
      </section>
      </div>
    </div>

    <!-- Confirm your trip: check the name, dates and city order, then create it -->
    <transition name="dx-pop">
      <div v-if="plan" class="dx-sheet-overlay" @click.self="plan = null" @keydown.esc="plan = null">
        <form class="dx-sheet glass" role="dialog" aria-modal="true" aria-labelledby="dx-sheet-title" @submit.prevent="createTrip">
          <button type="button" class="dx-sheet-x" aria-label="Close" @click="plan = null"><AppIcon name="x" :size="16" /></button>
          <h2 id="dx-sheet-title" class="dx-sheet-title fun">Confirm your trip</h2>

          <label for="dx-plan-name" class="dx-sheet-label">Trip name</label>
          <input id="dx-plan-name" v-model="plan.name" class="dx-input dx-sheet-input" maxlength="60">

          <span class="dx-sheet-label">Dates</span>
          <div class="dx-dates">
            <input v-model="plan.start" type="date" :min="today" aria-label="From" class="dx-input">
            <span aria-hidden="true">→</span>
            <input v-model="plan.end" type="date" :min="plan.start || today" aria-label="To" class="dx-input">
          </div>

          <span class="dx-sheet-label">Cities, in travel order</span>
          <ol class="dx-route">
            <li v-for="(c, i) in plan.cities" :key="c.id">
              <span class="dx-route-n">{{ i + 1 }}</span>
              <span class="dx-route-name"><span class="dx-stamp sm"><FlagImg :code="c.cc" :size="12" /></span> {{ c.cityName }}</span>
              <button type="button" :disabled="i === 0" :aria-label="'Move ' + c.cityName + ' earlier'" @click="moveCity(i, -1)">↑</button>
              <button type="button" :disabled="i === plan.cities.length - 1" :aria-label="'Move ' + c.cityName + ' later'" @click="moveCity(i, 1)">↓</button>
              <button type="button" :aria-label="'Remove ' + c.cityName" @click="dropCity(i)"><AppIcon name="x" :size="14" /></button>
            </li>
          </ol>

          <p v-if="shortlist.length > 10" class="dx-sheet-note">A trip holds up to 10 places, so these are your first 10. The rest stay packed for another trip!</p>
          <p v-if="planError" class="dx-error" role="alert">{{ planError }}</p>
          <button type="submit" class="dx-cta dx-sheet-cta" :disabled="creating">{{ creating ? 'Creating your trip…' : 'Create trip →' }}</button>
        </form>
      </div>
    </transition>

    <AuthJoinModal :open="authOpen" initial-tab="signin" :reason="authReason" next="" @close="authOpen = false" @authed="startPlanning" />

    <!-- ===== Shortlist = a suitcase that fills up as you pack cities ===== -->
    <transition name="dx-tray">
      <aside v-if="shortlist.length" ref="trayEl" class="dx-tray" aria-label="Your suitcase" data-tour="shortlist-tray">
        <!-- left: the suitcase (lightly packed, then stickered, then bulging) + your packing level -->
        <div class="dx-case-wrap">
          <div ref="caseEl" class="dx-case" :class="['load-' + caseLoad, { bump: caseBump }]" aria-hidden="true">
            <svg viewBox="0 0 64 60" width="56" height="52">
              <!-- overstuffed: a sock poking out of the lid -->
              <path v-if="caseLoad === 'stuffed'" class="dx-case-sock" d="M44 16c1-6 3-10 7-10s5 4 3 7l-3 5Z" fill="#ff6b7a" stroke="#12324a" stroke-width="2.4" stroke-linejoin="round" />
              <path d="M23 16v-4a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v4" fill="none" stroke="#12324a" stroke-width="3.2" stroke-linecap="round" />
              <rect x="5" y="16" width="54" height="40" rx="9" fill="#fffaf0" stroke="#12324a" stroke-width="3.2" />
              <clipPath id="dx-case-clip"><rect x="6.6" y="17.6" width="50.8" height="36.8" rx="7.6" /></clipPath>
              <rect class="dx-case-fill" x="5" :y="56 - 40 * caseFill" width="54" :height="40 * caseFill" fill="#ffbf3c" clip-path="url(#dx-case-clip)" />
              <path d="M18 16v40M46 16v40" stroke="#12324a" stroke-width="2.6" opacity="0.5" />
              <!-- well packed: travel stickers on the side -->
              <g v-if="caseLoad !== 'light'" class="dx-case-stickers">
                <circle cx="31" cy="30" r="5.5" fill="#19b3c4" stroke="#12324a" stroke-width="1.8" />
                <rect x="24" y="40" width="12" height="8" rx="2" fill="#ff6b7a" stroke="#12324a" stroke-width="1.8" transform="rotate(-10 30 44)" />
                <path d="M52 26l1.5 3 3.2.4-2.4 2.2.6 3.2-2.9-1.6-2.9 1.6.6-3.2-2.4-2.2 3.2-.4Z" fill="#fff" stroke="#12324a" stroke-width="1.4" stroke-linejoin="round" />
              </g>
              <rect x="5" y="16" width="54" height="40" rx="9" fill="none" stroke="#12324a" stroke-width="3.2" />
            </svg>
          </div>
          <div class="dx-case-meta">
            <strong aria-live="polite">{{ shortlist.length }} place{{ shortlist.length === 1 ? '' : 's' }} packed</strong>
            <span class="dx-case-bar" :title="packTier.toGo + ' more to ' + packTier.nextName"><span :style="{ width: packTier.share * 100 + '%' }"></span></span>
            <small><b>{{ packTier.name }}</b> · {{ packTier.toGo }} to {{ packTier.nextName }}</small>
          </div>
          <transition name="dx-cheer">
            <span v-if="tierPop" class="dx-tier-pop" aria-hidden="true">{{ tierPop }} unlocked!</span>
          </transition>
        </div>
        <!-- middle: your packed places, scrolling sideways (soft fades show there's more) -->
        <ul ref="trackEl" class="dx-tray-chips" :style="{ '--fl': trackFade.left ? '28px' : '0px', '--fr': trackFade.right ? '28px' : '0px' }" @scroll="checkTrack">
          <li v-for="(c, i) in shortlistCities" :key="c.id" class="dx-chip" :style="{ '--tilt': STICKER_TILT[i % 4] }">
            <span class="dx-stamp sm"><FlagImg :code="c.cc" :size="12" /></span> {{ c.cityName }}
            <button type="button" :aria-label="'Unpack ' + c.cityName" @click="unlike(c.id)"><AppIcon name="x" :size="13" /></button>
          </li>
        </ul>
        <!-- right: plan it -->
        <button type="button" class="dx-cta" :disabled="!!dateError" @click="startPlanning">Ready to plan →</button>
      </aside>
    </transition>

    <!-- ===== Vibe quiz: 3 quick questions (tap or swipe) ===== -->
    <Teleport to="body">
      <transition name="dx-pop">
        <div v-if="quiz" class="dx-quiz-overlay" @mousedown.self="quiz = null" @keydown.esc="quiz = null">
          <section class="dx-quiz" role="dialog" aria-modal="true" aria-labelledby="dx-quiz-q">
            <button type="button" class="dx-quiz-x" aria-label="Close the quiz" @click="quiz = null"><AppIcon name="x" :size="16" /></button>
            <div class="dx-quiz-pip">
              <PlaneGuide :size="70" :mood="quiz.mood" />
              <p class="dx-quiz-bubble">{{ QUIZ[quiz.step].pip }}</p>
            </div>
            <ol class="dx-quiz-dots" aria-label="Question progress">
              <li v-for="(q, i) in QUIZ" :key="i" :class="{ done: i < quiz.step, on: i === quiz.step }"><span class="ft-sr">Question {{ i + 1 }}</span></li>
            </ol>
            <h2 id="dx-quiz-q" class="dx-quiz-q fun">{{ QUIZ[quiz.step].q }}</h2>
            <div class="dx-quiz-opts" @pointerdown="swipeStart" @pointerup="swipeEnd">
              <button v-for="(o, i) in QUIZ[quiz.step].options" :key="quiz.step + '-' + i" ref="quizBtns" type="button" class="dx-quiz-opt"
                :class="'side-' + i" @click="answer(o)">
                <DoodleIcon :name="o.doodle" :size="46" anim="" />
                <strong>{{ o.label }}</strong>
                <small>{{ o.hint }}</small>
              </button>
            </div>
            <p class="dx-quiz-foot">
              <button type="button" class="dx-link" @click="answer({ vibes: QUIZ[quiz.step].both })">Both!</button>
              <span aria-hidden="true">·</span>
              <button type="button" class="dx-link" @click="answer({ vibes: [] })">Skip</button>
              <span class="dx-quiz-swipe" aria-hidden="true">or swipe ← →</span>
            </p>
          </section>
        </div>
      </transition>
    </Teleport>

    <!-- ===== Spin result: Pip reveals where the globe landed ===== -->
    <Teleport to="body">
      <transition name="dx-reveal">
        <div v-if="reveal" class="dx-reveal-overlay" @mousedown.self="reveal = null" @keydown.esc="reveal = null">
          <section class="dx-reveal" role="dialog" aria-modal="true" aria-labelledby="dx-reveal-name" :class="'r-' + reveal.rarity.key">
            <button type="button" class="dx-quiz-x" aria-label="Close" @click="reveal = null"><AppIcon name="x" :size="16" /></button>
            <div class="dx-reveal-pip"><PlaneGuide :size="64" mood="loop" /><p class="dx-quiz-bubble">The globe has spoken!</p></div>
            <!-- The card wiggles on hover; tap it to jump to this city's card in the list -->
            <div class="dx-reveal-card" :style="photoStyle(reveal)" role="button" tabindex="0" :aria-label="'Show ' + reveal.cityName + ' in the list'"
              @click="revealToList" @keydown.enter.prevent="revealToList" @keydown.space.prevent="revealToList">
              <span v-if="reveal.rarity.label" class="dx-rarity" :class="'r-' + reveal.rarity.key">{{ reveal.rarity.label }}</span>
              <span v-if="reveal.rarity.key !== 'common'" class="dx-foil on" aria-hidden="true"></span>
              <div class="dx-reveal-body">
                <span class="dx-stamp"><FlagImg :code="reveal.cc" :size="18" /></span>
                <h2 id="dx-reveal-name" class="dx-reveal-name fun">{{ reveal.cityName }}</h2>
                <p>{{ reveal.country }} · <span class="dx-grade sm" :class="'g-' + gradeOf(reveal.score).letter">{{ gradeOf(reveal.score).letter }}</span> {{ reveal.score }} {{ gradeOf(reveal.score).label }}</p>
              </div>
            </div>
            <div class="dx-reveal-btns">
              <button type="button" class="dx-cta" :disabled="liked(reveal.id)" @click="packReveal($event)">{{ liked(reveal.id) ? 'Packed ✓' : 'Pack it' }}</button>
              <button type="button" class="dx-ghost" @click="spinAgain">Spin again</button>
            </div>
          </section>
        </div>
      </transition>
    </Teleport>

    <!-- ===== Pip flies across when you pack a city ===== -->
    <div v-if="pipFlight" :key="pipFlight" class="dx-pip-fly" aria-hidden="true"><PlaneGuide :size="70" mood="idle" /></div>

    <!-- First visit: three tip bubbles (filters, map, shortlist). Seen once per browser. -->
    <FeatureTour storage-key="chuise-tour-discover-v1" :steps="TOUR_STEPS" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import DATA from '../data/discoverCities.json'
import SIGHTS from '../data/countryAttractions.json'
import { PHOTO_CACHE, photoUrl, loadCityPhotos } from '../photoCache.js'
import { flagEmoji, codeForCountry } from '../destinations.js'
import { loadMapLibre } from '../services/maplibre.js'
import { topoFeatures, unwrapLongitudes } from '../topo.js'
import { shortlist, syncShortlist } from '../shortlist.js'
import { auth } from '../auth.js'
import AuthJoinModal from '../components/AuthJoinModal.vue'
import AppIcon from '../components/AppIcon.vue'
import DoodleIcon from '../components/DoodleIcon.vue'
import FeatureTour from '../components/FeatureTour.vue'
import FlagImg from '../components/FlagImg.vue'
import PlaneGuide from '../components/PlaneGuide.vue'

// The first-visit tour (FeatureTour). Step 3 points at the first heart until the shortlist tray exists.
const TOUCH = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches // phones: "tap", not "hover"
const TOUR_STEPS = [
  { target: '[data-tour="vibe-filters"]', icon: 'sliders', title: 'Dial in your vibe',
    body: 'Filter destinations by travel style, season and budget.', cta: 'Next (1/3) →' },
  { target: '[data-tour="map-layer"]', icon: 'map', title: 'Interactive 3D map',
    body: (TOUCH ? 'Tap' : 'Hover over') + ' a pillar to preview the city. Taller, brighter pillars match you better. Tap a country to explore it.', cta: 'Next (2/3) →' },
  { target: '[data-tour="shortlist-tray"]', fallback: '.dx-fav', icon: 'heart', title: 'Stage your itinerary',
    body: 'Like cities to collect them in your shortlist. Once ready, hit Start planning to turn them into a trip.', cta: "Got it, let's explore! (3/3)" }
]
import { notify } from '../notify.js'

const router = useRouter()
const BUDGETS = [
  { value: 1, label: '$', title: 'Up to ~$60 a day', cap: 60 },
  { value: 2, label: '$$', title: 'Up to ~$150 a day', cap: 150 },
  { value: 3, label: '$$$', title: 'Anything goes', cap: 9999 }
]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ---------- filters ----------
function iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
function inDays(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return iso(d)
}
const today = iso(new Date())
const start = ref(inDays(30))
const end = ref(inDays(37))
const budget = ref(2)
const vibes = ref([])
// ---------- continents ----------
const CONTINENT_OF = {}
const CONTINENT_LISTS = {
  Asia: ['CN', 'HK', 'ID', 'IN', 'JP', 'KH', 'KR', 'LK', 'MO', 'MV', 'MY', 'NP', 'PH', 'TH', 'TW', 'VN'],
  Europe: ['AL', 'AM', 'AT', 'AZ', 'BA', 'BG', 'CH', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GE', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LT', 'LV', 'MD', 'ME', 'MK', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI', 'SK', 'TR'],
  'Middle East': ['AE', 'BH', 'IL', 'IR', 'JO', 'KW', 'LB', 'OM', 'QA', 'SA'],
  Africa: ['EG', 'MA', 'ZA'],
  Americas: ['AR', 'BR', 'CA', 'MX', 'PE', 'US'],
  Oceania: ['AU', 'NZ']
}
for (const name in CONTINENT_LISTS) for (const cc of CONTINENT_LISTS[name]) CONTINENT_OF[cc] = name
const CONTINENT_CHIPS = [
  { key: '', label: 'All', doodle: 'compass' }, { key: 'Asia', label: 'Asia', doodle: 'pagoda' }, { key: 'Europe', label: 'Europe', doodle: 'tower' },
  { key: 'Middle East', label: 'Middle East', doodle: 'arch' }, { key: 'Africa', label: 'Africa', doodle: 'sun' },
  { key: 'Americas', label: 'Americas', doodle: 'mountain' }, { key: 'Oceania', label: 'Oceania', doodle: 'palm' }
]
const continent = ref('')

// ---------- game bits: shapes, grades, rarity ----------
const STICKER_TILT = ['-4deg', '3deg', '-2deg', '5deg'] // stickers and stamps sit a little crooked, like real ones
const STAMP_TILT = ['-3deg', '2deg', '-1.5deg', '3deg', '-2.5deg']
// Match score -> a grade: "97 · Perfect match"
function gradeOf(score) {
  if (score >= 85) return { letter: 'S', label: 'Perfect match' }
  if (score >= 72) return { letter: 'A', label: 'Great match' }
  if (score >= 58) return { letter: 'B', label: 'Good match' }
  return { letter: 'C', label: 'Worth a look' }
}
// Rarity from the data we already have: the main cities get no label (they're classics, not "common"),
// hidden gems are Rare, and a hidden gem in a less-travelled country is Legendary
const COUNTRY_POP = {}
for (const co of DATA.countries) COUNTRY_POP[co.country] = co.popularity
function rarityOf(c) {
  if (c.tier !== 'extended') return { key: 'common', label: '' }
  if (COUNTRY_POP[c.country] < 72) return { key: 'legendary', label: 'Legendary' }
  return { key: 'rare', label: 'Hidden gem' }
}
const VIBE_DOODLES = { Culture: 'pillar', Nature: 'mountain', 'Food & Nightlife': 'bowl', 'Slow Living': 'lounger' }
function vibeDoodle(v) {
  return VIBE_DOODLES[v] || 'sparkle'
}

// ---------- continents explored (a passport, kept in this browser) ----------
function readList(key) {
  try {
    const list = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(list) ? list : []
  } catch (err) {
    return []
  }
}
function saveList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch (err) { /* private mode */ }
}
const explored = ref(readList('dx-explored-v1'))
function explore(name) {
  if (!name || explored.value.includes(name)) return
  explored.value = explored.value.concat(name)
  saveList('dx-explored-v1', explored.value)
}
function pickContinent(key) {
  continent.value = key
  explore(key)
}


// ---------- budget coins: the picked coin flips ----------
const coinFlip = ref(0)
function pickBudget(value) {
  budget.value = value
  coinFlip.value = value
  setTimeout(() => { if (coinFlip.value === value) coinFlip.value = 0 }, 600)
}
// The logbook: tapping anywhere on a page opens its date picker
function openPicker(e) {
  const input = e.currentTarget.querySelector('input')
  if (e.target === input && !input.showPicker) return
  try {
    input.showPicker()
  } catch (err) {
    input.focus() // older browsers: just focus the box
  }
}

// ---------- Pip the scout: a tip about what's on screen ----------
// Each tip is { before, city, after }; the city's name is a button that flies the map there.
const tipIndex = ref(0)
const scoutMood = ref('wave')
const scoutHop = ref(false)
const scout = computed(() => {
  if (otherCountry.value) return 'Not here yet. Plan it anyway!'
  if (focusCountry.value) return 'Ooh, ' + focusCountry.value + '! Pick a city!'
  if (search.value.trim() && !visibleCities.value.length) return 'Hmm, not on my map!'
  if (!visibleCities.value.length) return 'Try another filter!'
  const tips = ["Where to? Let's fly!", 'Spin the globe!', 'Pack your faves!']
  return tips[tipIndex.value % tips.length]
})
function hopPip() {
  scoutHop.value = false
  scoutMood.value = 'idle'
  requestAnimationFrame(() => {
    scoutHop.value = true
    scoutMood.value = 'talk'
  })
}
function nextTip() {
  tipIndex.value++
  hopPip()
}

// ---------- the vibe quiz: 3 quick either/or questions ----------
const QUIZ = [
  { q: 'Mountains or museums?', pip: "Let's find your vibe! First up…", both: ['Nature', 'Culture'],
    options: [{ label: 'Mountains', hint: 'Trails, lakes, fresh air', doodle: 'mountain', vibes: ['Nature'] },
      { label: 'Museums', hint: 'Old towns, temples, art', doodle: 'pillar', vibes: ['Culture'] }] },
  { q: 'Night markets or slow brunches?', pip: 'Ooh, good pick! Next one…', both: ['Food & Nightlife', 'Slow Living'],
    options: [{ label: 'Night markets', hint: 'Street food, bars, buzz', doodle: 'bowl', vibes: ['Food & Nightlife'] },
      { label: 'Slow brunches', hint: 'Cafés, long lunches, no rush', doodle: 'lounger', vibes: ['Slow Living'] }] },
  { q: 'Packed days or easy days?', pip: 'Last one, promise!', both: ['Slow Living'],
    options: [{ label: 'Packed days', hint: 'See it all!', doodle: 'boot', vibes: [] },
      { label: 'Easy days', hint: 'A few things, done well', doodle: 'sun', vibes: ['Slow Living'] }] }
]
const quiz = ref(null) // { step, picks, mood } while it's open
function openQuiz() {
  quiz.value = { step: 0, picks: [], mood: 'wave' }
}
function answer(o) {
  const q = quiz.value
  for (const v of o.vibes) if (!q.picks.includes(v)) q.picks.push(v)
  if (q.step < QUIZ.length - 1) {
    q.step++
    q.mood = 'idle'
    requestAnimationFrame(() => { if (quiz.value) quiz.value.mood = 'talk' })
    return
  }
  // Done: the list reshuffles to the new ranking (the countries slide into place)
  vibes.value = q.picks.slice()
  quiz.value = null
  nextTick(() => feedEl.value && feedEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
// Swipe left = the left answer, swipe right = the right one
let swipeX = null
function swipeStart(e) {
  swipeX = e.clientX
}
function swipeEnd(e) {
  if (swipeX === null || !quiz.value) return
  const dx = e.clientX - swipeX
  swipeX = null
  if (Math.abs(dx) < 60) return
  answer(QUIZ[quiz.value.step].options[dx < 0 ? 0 : 1])
}

// ---------- spin the globe ----------
const spinning = ref(false)
const reveal = ref(null) // the city it landed on
let spunIds = [] // places the globe has already landed on (this visit)
function spinGlobe() {
  if (spinning.value) return
  // Any place showing right now, each with the same chance, skipping places it has already landed on
  // (once it has landed everywhere, it starts over)
  let pool = []
  for (const c of visibleCities.value) if (!spunIds.includes(c.id)) pool.push(c)
  if (!pool.length) {
    spunIds = []
    pool = visibleCities.value.slice()
  }
  if (!pool.length) return
  const pick = pool[Math.floor(Math.random() * pool.length)]
  spunIds.push(pick.id)
  spinning.value = true
  reveal.value = null
  const done = () => {
    spinning.value = false
    reveal.value = pick
    hoverId.value = pick.id
  }
  if (!map || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (map) map.jumpTo({ center: [pick.lon, pick.lat], zoom: 4.5, pitch: 50 })
    setTimeout(done, 300)
    return
  }
  // Out to the globe, a spin and a bit, then down onto the city
  const lon = map.getCenter().lng
  map.easeTo({ center: [lon + 200, 15], zoom: 0.9, pitch: 0, bearing: 0, duration: 1500, easing: (t) => t * (2 - t) })
  map.once('moveend', () => {
    if (!map) return done()
    map.flyTo({ center: [pick.lon, pick.lat], zoom: 4.8, pitch: 55, bearing: rotation.value, duration: 2200, essential: true })
    map.once('moveend', done)
  })
}
// Tapping the result card: close it and scroll the list to that city's card (it flashes)
function revealToList() {
  const city = reveal.value
  reveal.value = null
  if (mapOnly.value) toggleMapOnly() // the list was hidden: bring it back first
  // Another country is open, so this city's card isn't in the list: go back to all countries first
  if (otherCountry.value || (focusCountry.value && focusCountry.value !== city.country)) unfocus()
  setTimeout(() => goToCard(city.id), 120) // after the list has redrawn
}
function spinAgain() {
  reveal.value = null
  spinGlobe()
}
function packReveal(e) {
  if (!liked(reveal.value.id)) toggleLike(reveal.value, e)
}
// ---------- the list can be hidden, so the map gets the whole width ----------
const mapOnly = ref(false)
const search = ref('') // city or country name
const searchEl = ref(null)
const suggestOpen = ref(false)
const activeSuggest = ref(-1) // highlighted suggestion (arrow keys)
const dateError = computed(() => {
  if (!start.value || !end.value) return 'Pick both dates.'
  if (start.value < today) return 'Pick a start date from today onwards.'
  if (end.value < start.value) return 'The end date is before the start date.'
  return ''
})
// A click anywhere else closes a score's "why"
function closeVibes() {
  whyId.value = null // (a click anywhere else also closes a score's "why")
}
// ---------- why a city scores what it does ----------
const whyId = ref(null)
function reasonsFor(c) {
  const w = c.why
  const list = []
  if (c.monthFit === 1) list.push({ good: true, text: 'In season for your dates' })
  else if (w.season >= 0.5) list.push({ good: true, text: 'Close to its best season (' + monthsText(c.bestMonths) + ')' })
  else list.push({ good: false, text: 'Best in ' + monthsText(c.bestMonths) + ', not your dates' })
  const cap = BUDGETS.find((b) => b.value === budget.value).cap
  if (cap >= 9999) list.push({ good: true, text: 'Any budget (~$' + c.estDailyBudget + '/day)' })
  else if (c.estDailyBudget <= cap) list.push({ good: true, text: 'Within your budget (~$' + c.estDailyBudget + ' of $' + cap + '/day)' })
  else list.push({ good: false, text: 'Over your budget (~$' + c.estDailyBudget + ' vs $' + cap + '/day)' })
  if (vibes.value.length) {
    const hits = c.vibeTags.filter((t) => vibes.value.includes(t))
    list.push({ good: hits.length > 0, text: 'Matches ' + w.vibeHit + ' of ' + vibes.value.length + ' vibes' + (hits.length ? ' (' + hits.join(', ') + ')' : '') })
  }
  list.push({ good: w.love >= 0.55, text: w.love >= 0.55 ? 'Popular with travellers' : 'A quieter, less visited pick' })
  return list
}
function toggleVibe(key) {
  if (vibes.value.includes(key)) vibes.value = vibes.value.filter((v) => v !== key)
  else vibes.value = vibes.value.concat(key)
}
// Months (1-12) the trip touches
const tripMonths = computed(() => {
  const list = []
  if (dateError.value) return [new Date().getMonth() + 1]
  const d = new Date(start.value + 'T00:00:00')
  const last = new Date(end.value + 'T00:00:00')
  while (d <= last && list.length < 12) {
    if (!list.includes(d.getMonth() + 1)) list.push(d.getMonth() + 1)
    d.setDate(d.getDate() + 1)
  }
  return list
})

// ---------- an opened country (tap its card or its shape on the map) ----------
const focusCountry = ref(null)
const otherCountry = ref(null) // a country with no cities in our data yet
const hoverAny = ref(null)     // any country under the mouse on the map
const feedEl = ref(null)
// The sticky header's height, so the map and "scroll to" stop just below it instead of under it
const topEl = ref(null)
const topHeight = ref(112)
let topWatcher = null
// ---------- top sights of an opened country ----------
const sightPhotos = ref({})
function sightsOf(country) {
  return SIGHTS.countries[country] || []
}
// "Pantheon, Rome" / "Golden Bridge (Vietnam)" -> "Pantheon" / "Golden Bridge"
function sightName(a) {
  return a.name.replace(/ \([^)]*\)$/, '').split(', ')[0]
}
function sightStyle(a) {
  const url = sightPhotos.value[a.name]
  return url ? { backgroundImage: 'linear-gradient(180deg, rgba(0, 38, 58,0) 35%, rgba(0, 38, 58,0.92)), url(' + photoUrl(url, 500) + ')' } : null
}
// The server answers within 1.5 s; "pending" = still looking it up, so ask again in a few seconds
function loadSightPhotos(country, tries = 0) {
  let pending = 0
  for (const a of sightsOf(country)) {
    if (sightPhotos.value[a.name] !== undefined) continue
    sightPhotos.value = { ...sightPhotos.value, [a.name]: null } // null = loading ('' = no photo)
    axios.get('/api/discover/about', { params: { title: a.name } })
      .then((res) => {
        if (res.data.pending && tries < 3) {
          const copy = { ...sightPhotos.value }
          delete copy[a.name]
          sightPhotos.value = copy
          if (pending++ === 0) setTimeout(() => loadSightPhotos(country, tries + 1), 3000)
          return
        }
        sightPhotos.value = { ...sightPhotos.value, [a.name]: res.data.photo || '' }
      })
      .catch(() => {
        // couldn't ask: let it try again the next time this country opens
        const copy = { ...sightPhotos.value }
        delete copy[a.name]
        sightPhotos.value = copy
      })
  }
}
// A sight's card flies the map to the city it's near
function showSight(country, a) {
  const city = allCities.find((c) => c.country === country && c.cityName === a.city)
  if (city) showOnMap(visibleCities.value.find((c) => c.id === city.id) || city)
}

// A country's banner is its flag: a tiny picture from our server (every flag is saved there
// ahead of time), so it shows at once, for any country, in Discover or not
function flagCode(country) {
  const ours = countryOf(country)
  return ((ours && ours.cc) || codeForCountry(country) || '').toLowerCase()
}
function heroPhoto(country) {
  const code = flagCode(country)
  return code ? '/api/flag/' + code + '.svg' : null
}
function heroStyle(country) {
  const url = heroPhoto(country)
  if (!url) return null
  return { backgroundImage: 'linear-gradient(180deg, rgba(0, 38, 58,0.05) 35%, rgba(0, 38, 58,0.85)), url(' + url + ')' }
}
// Get a flag into the browser before it's needed (hovering a country on the map, opening Discover)
const flagsLoaded = new Set()
function preloadFlag(country) {
  const url = heroPhoto(country)
  if (!url || flagsLoaded.has(url)) return
  flagsLoaded.add(url)
  const img = new Image()
  img.src = url
}
function focus(name) {
  const co = countryOf(name)
  if (co) explore(CONTINENT_OF[co.cc])
  otherCountry.value = null
  focusCountry.value = name
  hoverCountry.value = null
  nextTick(() => feedEl.value && feedEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  fitCountry(name)
  preloadFlag(name)
  loadSightPhotos(name)
}
// Tapped a country we have no cities for: zoom to its shape and show the light card
function openOther(name, geometry) {
  focusCountry.value = null
  otherCountry.value = name
  nextTick(() => feedEl.value && feedEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  preloadFlag(name)
  if (map && ml && geometry) {
    const bounds = new ml.LngLatBounds()
    const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
    for (const poly of polys) for (const p of poly[0]) bounds.extend(p)
    map.fitBounds(bounds, { padding: 90, maxZoom: 6, pitch: 50, bearing: rotation.value, duration: 900 })
  }
}
function planOther() {
  router.push({ path: '/home', query: { dest: otherCountry.value, name: 'Trip to ' + otherCountry.value, start: start.value, end: end.value } })
}
// Clicking anywhere on a country card opens it (city cards, hearts and buttons keep their own action)
function openCountryCard(e, name) {
  if (focusCountry.value === name) return
  if (e.target.closest('.dx-city, .dx-sights, button, a')) return
  focus(name)
}
function unfocus() {
  const was = focusCountry.value
  otherCountry.value = null
  focusCountry.value = null
  if (map) map.flyTo({ center: [128, 8], zoom: 2, pitch: 52, bearing: rotation.value, duration: 900 })
  // Back in the list where you left off: at the country you just closed
  nextTick(() => {
    const card = was && feedEl.value ? feedEl.value.querySelector('[data-country="' + was + '"]') : null
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
// The country (or other place) that's open, for the header's "All countries › China"
const openName = computed(() => focusCountry.value || otherCountry.value)

// ---------- data: which cities show, and their match score ----------
function countryOf(name) {
  return DATA.countries.find((c) => c.country === name)
}
// How well a month fits a city's best months: in season 1, a month either side 0.6, two months away 0.25
function seasonOf(month, bestMonths) {
  let best = 0
  for (const b of bestMonths) {
    let gap = Math.abs(month - b)
    if (gap > 6) gap = 12 - gap // December is next to January
    const fit = gap === 0 ? 1 : gap === 1 ? 0.6 : gap === 2 ? 0.25 : 0
    if (fit > best) best = fit
  }
  return best
}
// Match score out of 100. Each part is between 0 and 1:
//   vibe   = share of your picked vibes the city has (only counts when you picked some)
//   season = how close your travel months are to its best months
//   budget = fits your daily budget (a little higher the more room it leaves; drops off when over)
//   love   = how popular the country is, and how high the city ranks inside it
// Base cities always show; hidden gems show for very popular countries, or when they match a vibe or your search.
const visibleCities = computed(() => {
  const list = []
  const cap = BUDGETS.find((b) => b.value === budget.value).cap
  const q = search.value.trim().toLowerCase()
  for (const c of DATA.cities) {
    const country = countryOf(c.country)
    const nameHit = !!q && (c.cityName.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
    if (q && !nameHit) continue
    // (a search looks everywhere, whatever continent is picked)
    if (continent.value && !q && CONTINENT_OF[country.cc] !== continent.value) continue
    const vibeHit = c.vibeTags.filter((t) => vibes.value.includes(t)).length
    // (an opened country, or a searched one, shows all of its cities)
    if (c.tier === 'extended' && country.popularity < 85 && !vibeHit && !nameHit && c.country !== focusCountry.value) continue

    let season = 0
    let inSeason = 0
    for (const m of tripMonths.value) {
      season += seasonOf(m, c.bestMonths)
      if (c.bestMonths.includes(m)) inSeason++
    }
    season = season / tripMonths.value.length
    const monthFit = inSeason / tripMonths.value.length

    let budgetFit = 1
    if (cap < 9999) {
      budgetFit = c.estDailyBudget <= cap ? 0.8 + 0.2 * (1 - c.estDailyBudget / cap) : Math.max(0, 1 - (c.estDailyBudget - cap) / cap)
    }
    const love = 0.6 * country.popularity / 100 + 0.4 / (1 + 0.35 * (c.popularityRank - 1))

    let score
    if (vibes.value.length) {
      const vibeFit = vibeHit / vibes.value.length
      score = 0.4 * vibeFit + 0.3 * season + 0.15 * budgetFit + 0.15 * love
    } else {
      score = 0.45 * season + 0.25 * budgetFit + 0.3 * love
    }
    // (the parts of the score, so the card can explain it)
    const why = { season, budgetFit, vibeHit, love }
    list.push({ ...c, id: (c.cityName + '-' + c.country).toLowerCase().replace(/[^a-z]+/g, '-'), cc: country.cc, score: Math.round(100 * score), monthFit, why, rarity: rarityOf(c) })
  }
  return list
})
// How many countries each continent chip has (with the other filters as they are)
const continentCounts = computed(() => {
  const seen = {}
  const counts = {}
  for (const c of DATA.cities) {
    const cc = countryOf(c.country).cc
    if (seen[cc]) continue
    seen[cc] = true
    const name = CONTINENT_OF[cc]
    if (name) counts[name] = (counts[name] || 0) + 1
  }
  return counts
})
// One group per country: its cities best first; countries ordered by their best city
const groups = computed(() => {
  const result = []
  for (const country of DATA.countries) {
    if (otherCountry.value || (focusCountry.value && country.country !== focusCountry.value)) continue
    const cities = visibleCities.value.filter((c) => c.country === country.country).sort((a, b) => b.score - a.score || a.popularityRank - b.popularityRank)
    if (!cities.length) continue
    let gems = 0
    for (const c of cities) if (c.tier === 'extended') gems++
    result.push({ ...country, cities, best: cities[0].score, gems })
  }
  result.sort((a, b) => b.best - a.best)
  return result
})
function cityById(id) {
  return visibleCities.value.find((c) => c.id === id) || allCities.find((c) => c.id === id)
}
// Every city (for shortlist chips, even if a filter hides it now)
const allCities = DATA.cities.map((c) => ({ ...c, id: (c.cityName + '-' + c.country).toLowerCase().replace(/[^a-z]+/g, '-'), cc: countryOf(c.country).cc, score: 0, rarity: rarityOf(c) }))

function flag(cc) {
  return flagEmoji(cc)
}
function monthsText(list) {
  return list.slice(0, 3).map((m) => MONTHS[m - 1]).join(', ')
}

// ---------- photos (heroImage, or Wikipedia when empty) ----------
// The links are kept in this browser (photoCache.js), so after the first visit every card has its
// photo at once; the photos themselves come from our server's copy, in card size
const photos = ref({})
function loadPhotos() {
  loadCityPhotos(() => { photos.value = { ...PHOTO_CACHE } })
  photos.value = { ...PHOTO_CACHE }
}
// A postcard's photo: the picture as it is (a navy placeholder until it loads)
function postcardPhoto(c) {
  const url = photos.value[c.id]
  return url ? { backgroundImage: 'url(' + photoUrl(url, 500) + ')' } : null
}
function photoStyle(c) {
  const url = photos.value[c.id]
  return url ? { backgroundImage: 'linear-gradient(180deg, rgba(0, 38, 58,0.05) 30%, rgba(0, 38, 58,0.92)), url(' + photoUrl(url, 500) + ')' } : null
}

// ---------- shortlist (kept in this browser) ----------
// (shared with the rest of the app: kept in this browser for guests, saved to the account once signed in)
const shortlistCities = computed(() => shortlist.value.map(cityById).filter(Boolean))
const trayEl = ref(null)
const caseEl = ref(null)
const trackEl = ref(null)
// Packing levels: the bar fills towards the next one, and after the last it rolls over every 5 places
const PACK_TIERS = [
  { at: 1, name: 'Day trip' },
  { at: 3, name: 'Getaway' },
  { at: 6, name: 'Expedition' },
  { at: 10, name: 'Grand tour' },
  { at: 15, name: 'World tour' }
]
const packTier = computed(() => {
  const n = shortlist.value.length
  let current = PACK_TIERS[0]
  let next = null
  for (const t of PACK_TIERS) {
    if (n >= t.at) current = t
    else if (!next) next = t
  }
  if (next) {
    return { name: current.name, nextName: next.name, toGo: next.at - n, share: (n - current.at) / (next.at - current.at) }
  }
  // past the last level: every 5 more places is another lap (World tour ×2, ×3, ...)
  const lap = Math.floor((n - current.at) / 5)
  const from = current.at + lap * 5
  return {
    name: current.name + (lap ? ' ×' + (lap + 1) : ''),
    nextName: current.name + ' ×' + (lap + 2),
    toGo: from + 5 - n,
    share: (n - from) / 5
  }
})
// How the suitcase looks: lightly packed (1-3), stickered (4-6), bulging (7+)
const caseLoad = computed(() => {
  const n = shortlist.value.length
  if (n >= 7) return 'stuffed'
  if (n >= 4) return 'well'
  return 'light'
})
const caseFill = computed(() => Math.min(shortlist.value.length, 7) / 7) // the yellow inside rises until it's full at 7
// Fades at the ends of the chip track, only where there's more to scroll to
const trackFade = ref({ left: false, right: false })
function checkTrack() {
  const t = trackEl.value
  if (!t) return
  trackFade.value = { left: t.scrollLeft > 4, right: t.scrollLeft + t.clientWidth < t.scrollWidth - 4 }
}
// A place was packed: "Getaway unlocked!" when you reach a new level, and the chips scroll to the newest one
const tierPop = ref('')
let tierTimer = null
watch(() => shortlist.value.length, (now, before) => {
  nextTick(checkTrack)
  if (!(now > before)) return
  for (const t of PACK_TIERS) {
    if (t.at === now && now > 1) {
      tierPop.value = t.name
      clearTimeout(tierTimer)
      tierTimer = setTimeout(() => { tierPop.value = '' }, 1800)
    }
  }
  nextTick(() => {
    const track = trackEl.value
    if (track) track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' })
    setTimeout(checkTrack, 450)
  })
})
const caseBump = ref(false) // the suitcase wobbles when something lands in it
const burstId = ref(null)   // the heart that's bursting
const popId = ref(null)     // the heart doing its squash-and-stretch pop
const pipFlight = ref(0)    // Pip flies across the screen (a new number = a new flight)
let pipTimer = null
function liked(id) {
  return shortlist.value.includes(id)
}
function unlike(id) {
  shortlist.value = shortlist.value.filter((x) => x !== id)
}
// Liking flies a little tag from the heart down into the tray
let lastTap = { id: null, at: 0 }
function toggleLike(c, event) {
  // A quick double tap would add and then remove straight away, so taps within half a second are ignored
  const now = Date.now()
  if (lastTap.id === c.id && now - lastTap.at < 500) return
  lastTap = { id: c.id, at: now }
  // the heart pops either way (restart the animation if it's still playing)
  popId.value = null
  requestAnimationFrame(() => { popId.value = c.id })
  setTimeout(() => { if (popId.value === c.id) popId.value = null }, 500)
  if (liked(c.id)) {
    unlike(c.id)
    return
  }
  shortlist.value = shortlist.value.concat(c.id)
  const from = event.currentTarget.getBoundingClientRect()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  // the heart bursts, and Pip zooms past
  burstId.value = c.id
  setTimeout(() => { if (burstId.value === c.id) burstId.value = null }, 600)
  pipFlight.value++
  clearTimeout(pipTimer)
  pipTimer = setTimeout(() => { pipFlight.value = 0 }, 1900)
  nextTick(() => {
    const box = caseEl.value || trayEl.value
    const to = box ? box.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight - 60, width: 0 }
    const tag = document.createElement('div')
    tag.className = 'dx-fly'
    tag.textContent = c.cityName
    tag.style.left = from.left + 'px'
    tag.style.top = from.top + 'px'
    document.body.appendChild(tag)
    const dx = to.left + 10 - from.left
    const dy = to.top + 14 - from.top
    tag.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx * 0.5 + 'px, ' + (dy * 0.5 - 80) + 'px) scale(1.1)', opacity: 1, offset: 0.45 },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(0.6)', opacity: 0.2 }
    ], { duration: 650, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => {
      tag.remove()
      caseBump.value = false
      requestAnimationFrame(() => { caseBump.value = true }) // it landed: squash, stretch, settle
      setTimeout(() => { caseBump.value = false }, 650)
    }
  })
}
// Saving a trip needs an account: guests get a gentle sign-in, then planning carries on by itself
const authOpen = ref(false)
const authReason = ref('')
function askToSignIn(reason) {
  authReason.value = reason
  authOpen.value = true
}
function startPlanning() {
  if (!auth.token) {
    askToSignIn('Sign in or create an account to turn your shortlist into a trip.')
    return
  }
  // Open the confirm sheet with everything filled in
  const list = shortlistCities.value.slice(0, 10) // a trip holds up to 10 places (the server's limit)
  const countries = []
  for (const c of list) if (!countries.includes(c.country)) countries.push(c.country)
  plan.value = {
    name: countries.length === 1 ? 'Trip to ' + countries[0] : 'Trip to ' + countries.slice(0, 3).join(' & '),
    cities: list.slice(),
    start: start.value,
    end: end.value
  }
  planError.value = ''
}

// ---------- confirm sheet: name, dates, city order, then create the trip ----------
const plan = ref(null) // { name, cities, start, end } while the sheet is open
const planError = ref('')
const creating = ref(false)
function moveCity(i, step) {
  const list = plan.value.cities.slice()
  const j = i + step
  if (j < 0 || j >= list.length) return
  const temp = list[i]
  list[i] = list[j]
  list[j] = temp
  plan.value.cities = list
}
function dropCity(i) {
  plan.value.cities = plan.value.cities.filter((c, k) => k !== i)
}
// Outdoor guess for a sight, from its name (only used for rain warnings later)
function looksOutdoor(name) {
  return /park|beach|lake|mount|falls|garden|bay|canyon|island|valley|gorge|river|cliff|peak|trail|reef|glacier|lagoon|forest|desert|square|street|market|bridge|harbour|coast/i.test(name)
}
async function createTrip() {
  const p = plan.value
  planError.value = ''
  if (!p.name.trim()) { planError.value = 'Give your trip a name.'; return }
  if (!p.cities.length) { planError.value = 'Keep at least one city.'; return }
  if (!p.start || !p.end || p.start < today || p.end < p.start) { planError.value = 'Check your dates: they need to be from today on, and the end after the start.'; return }
  creating.value = true
  try {
    const labels = p.cities.map((c) => c.cityName + ', ' + c.country)
    const res = await axios.post('/api/trips', { name: p.name.trim(), destinations: labels, startDate: p.start, endDate: p.end })
    const id = res.data.id
    // Start the wishlist with the top sights near the chosen cities, so the next steps aren't empty
    const wishlist = []
    for (const c of p.cities) {
      for (const a of sightsOf(c.country)) {
        if (a.city !== c.cityName || wishlist.length >= 30) continue
        wishlist.push({
          id: 'w-' + Date.now().toString(36) + wishlist.length,
          name: sightName(a), address: sightName(a) + ', ' + c.cityName + ', ' + c.country,
          outdoor: looksOutdoor(a.name), type: /museum|gallery/i.test(a.name) ? 'museum' : 'attraction',
          city: c.cityName + ', ' + c.country, votes: []
        })
      }
    }
    if (wishlist.length) {
      try {
        await axios.put('/api/trips/' + id + '/itinerary', { stops: [], wishlist, version: 0 })
      } catch (err) {
        // the trip exists; the wishlist can still be filled in on the next page
        notify('Your trip is ready, but its top sights could not be added. You can save places on the next step.')
      }
    }
    // The planned cities leave the shortlist
    const planned = p.cities.map((c) => c.id)
    shortlist.value = shortlist.value.filter((x) => !planned.includes(x))
    plan.value = null
    // new: '1' -> going Back from the first setup step asks whether to discard this trip.
    // from: the planned cities, so discarding puts them back in the shortlist
    router.push({ path: '/trip/' + id + '/setup/invite', query: { new: '1', from: planned.join(',') } })
  } catch (err) {
    planError.value = (err.response && err.response.data && err.response.data.message) || 'Could not create the trip. Is the server running?'
  }
  creating.value = false
}

// ---------- hover sync between cards and map ----------
const hoverId = ref(null)       // a city (card or pillar)
const hoverCountry = ref(null)  // a whole country card
const flashId = ref(null)
const cardEls = {}

// ---------- 3D map (MapLibre: free, no key; dark countries drawn from world-atlas) ----------
const mapEl = ref(null)
const mapError = ref('')
const tip = ref(null) // { city, x, y }
let map = null
let ml = null
let tipTimer = null
let lastHover = null

// A pillar = a small circle on the ground, extruded upwards. It shrinks as you zoom in so it stays pillar-shaped.
function circle(lon, lat, km) {
  const pts = []
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2
    pts.push([lon + (km / (111 * Math.cos(lat * Math.PI / 180))) * Math.cos(a), lat + (km / 111) * Math.sin(a)])
  }
  return [pts]
}
function pillarData() {
  const zoom = map ? map.getZoom() : 2
  const shrink = Math.pow(2, Math.max(0, zoom - 2))
  const features = []
  const points = []
  visibleCities.value.forEach((c, i) => {
    const props = { id: c.id, score: c.score, h: (40000 + c.score * 9000) / shrink }
    features.push({ type: 'Feature', id: i, properties: props, geometry: { type: 'Polygon', coordinates: circle(c.lon, c.lat, 110 / shrink) } })
    points.push({ type: 'Feature', id: i, properties: props, geometry: { type: 'Point', coordinates: [c.lon, c.lat] } })
  })
  return { pillars: { type: 'FeatureCollection', features }, points: { type: 'FeatureCollection', features: points } }
}
function indexOf(id) {
  return visibleCities.value.findIndex((c) => c.id === id)
}
// Light up the hovered pillar (and every pillar of a hovered country), mark liked ones
function paintStates() {
  if (!map || !map.getSource('dx-pillars')) return
  const country = hoverCountry.value
  visibleCities.value.forEach((c, i) => {
    const dim = !!otherCountry.value || (!!focusCountry.value && c.country !== focusCountry.value)
    const state = { hover: !dim && (c.id === hoverId.value || c.country === country), liked: liked(c.id), dim }
    map.setFeatureState({ source: 'dx-pillars', id: i }, state)
    map.setFeatureState({ source: 'dx-points', id: i }, state)
  })
  const lit = country || hoverAny.value || focusCountry.value || otherCountry.value || (hoverId.value ? cityById(hoverId.value).country : '')
  if (map.getLayer('dx-country-lit')) map.setFilter('dx-country-lit', ['in', ['get', 'name'], ['literal', mapNames(lit)]])
}
function refreshPillars() {
  if (!map || !map.getSource('dx-pillars')) return
  const data = pillarData()
  map.getSource('dx-pillars').setData(data.pillars)
  map.getSource('dx-points').setData(data.points)
  nextTick(paintStates)
}
watch(visibleCities, refreshPillars)
// The hovered city's pillar pulses (its glow grows and shrinks)
let pulseTimer = null
let pulseOn = false
watch(hoverId, (id) => {
  clearInterval(pulseTimer)
  pulseOn = false
  if (!id || !map) return
  pulseTimer = setInterval(() => {
    const i = indexOf(id)
    if (!map || i < 0 || !map.getSource('dx-points')) return
    pulseOn = !pulseOn
    map.setFeatureState({ source: 'dx-points', id: i }, { pulse: pulseOn })
  }, 500)
})
watch([hoverId, hoverCountry, hoverAny, shortlist, focusCountry, otherCountry], paintStates)

// The map's country names -> ours (and back)
const NAME_FIX = {
  'United States of America': 'United States', Macao: 'Macau', 'Czech Rep.': 'Czechia', 'Republic of Korea': 'South Korea',
  'Bosnia and Herz.': 'Bosnia and Herzegovina', Macedonia: 'North Macedonia', 'N. Macedonia': 'North Macedonia'
}
const OUR_COUNTRIES = DATA.countries.map((c) => c.country)
function ourName(mapName) {
  return NAME_FIX[mapName] || mapName
}
function mapNames(name) {
  const list = [name]
  for (const k in NAME_FIX) if (NAME_FIX[k] === name) list.push(k)
  return list
}
// A continent picked: zoom the map to its places (All: to everything shown)
watch(continent, () => nextTick(() => {
  if (!map || !ml) return
  const bounds = new ml.LngLatBounds()
  for (const c of visibleCities.value) bounds.extend([c.lon, c.lat])
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 70, maxZoom: 5, pitch: 50, bearing: rotation.value, duration: 900 })
}))
// Widen the map (hide the list) or bring the list back; the map redraws at its new size
function toggleMapOnly() {
  mapOnly.value = !mapOnly.value
  nextTick(() => {
    if (map) map.resize()
    setTimeout(() => map && map.resize(), 320) // after the size change animates
  })
}
// Zoom to a country's cities, keeping the 3D tilt
function fitCountry(name) {
  if (!map || !ml) return
  const bounds = new ml.LngLatBounds()
  for (const c of allCities) if (c.country === name) bounds.extend([c.lon, c.lat])
  if (bounds.isEmpty()) return
  map.fitBounds(bounds, { padding: 90, maxZoom: 6, pitch: 50, bearing: rotation.value, duration: 900 })
}

async function loadOutlines() {
  for (const host of ['https://unpkg.com/', 'https://cdn.jsdelivr.net/npm/']) {
    try {
      const res = await fetch(host + 'world-atlas@2.0.2/countries-50m.json')
      // (Antarctica is left out: no trips there, and it wraps the whole bottom of the map)
      if (res.ok) return unwrapLongitudes(topoFeatures(await res.json(), 'countries').filter((f) => f.properties.name !== 'Antarctica'))
    } catch (err) {
      // try the next host
    }
  }
  return []
}

async function buildMap() {
  try {
    ml = await loadMapLibre()
  } catch (err) {
    mapError.value = 'The 3D map could not load. Everything else still works.'
    return
  }
  // Opening animation: start out in space looking at the whole globe, then fly down to the usual tilted view
  // (skipped for people who turn animations off)
  const intro = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  map = new ml.Map({
    container: mapEl.value,
    style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#001d2c' } }] },
    center: intro ? [60, 22] : [128, 8],
    zoom: intro ? 0.4 : 2,
    pitch: intro ? 0 : 52,
    bearing: rotation.value, antialias: true, attributionControl: false
  })
  map.on('style.load', () => {
    // Zoomed out it's a round globe; from zoom 2 in it's the normal flat map (it blends between the two)
    map.setProjection({ type: ['interpolate', ['linear'], ['zoom'], 1.2, 'vertical-perspective', 2, 'mercator'] })
    // A soft glow around the globe, gone once you're zoomed in
    map.setSky({
      'sky-color': '#001d2c', 'horizon-color': '#0b3a52', 'sky-horizon-blend': 0.5,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 2, 0]
    })
  })
  map.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-right')
  map.on('load', async () => {
    const countries = await loadOutlines()
    if (countries.length) {
      map.addSource('dx-countries', { type: 'geojson', data: { type: 'FeatureCollection', features: countries } })
      map.addLayer({ id: 'dx-land', type: 'fill', source: 'dx-countries', paint: { 'fill-color': '#0f4566' } })
      map.addLayer({ id: 'dx-country-lit', type: 'fill', source: 'dx-countries', filter: ['==', ['get', 'name'], ''], paint: { 'fill-color': '#edae49', 'fill-opacity': 0.24 } })
      map.addLayer({ id: 'dx-borders', type: 'line', source: 'dx-countries', paint: { 'line-color': '#4a7a96', 'line-width': 0.6 } })
      // Countries are tappable: hover tints them, a tap opens them
      map.on('mousemove', 'dx-land', (e) => {
        if (lastHover) return // a pillar is under the mouse
        const name = ourName(e.features[0].properties.name)
        map.getCanvas().style.cursor = 'pointer' // every country can be tapped
        hoverAny.value = name
        preloadFlag(name) // so its banner is already there if it's tapped
        hoverCountry.value = OUR_COUNTRIES.includes(name) ? name : null
      })
      map.on('mouseleave', 'dx-land', () => {
        hoverAny.value = null
        hoverCountry.value = null
        if (!lastHover) map.getCanvas().style.cursor = ''
      })
      map.on('click', 'dx-land', (e) => {
        if (map.queryRenderedFeatures(e.point, { layers: ['dx-pillars'] }).length) return // the pillar handles it
        const name = ourName(e.features[0].properties.name)
        if (OUR_COUNTRIES.includes(name)) focus(name)
        else openOther(name, e.features[0].geometry)
      })
    } else {
      mapError.value = 'Country outlines could not load, so pillars float on a plain background.'
    }
    const data = pillarData()
    map.addSource('dx-points', { type: 'geojson', data: data.points })
    map.addSource('dx-pillars', { type: 'geojson', data: data.pillars })
    const hover = ['boolean', ['feature-state', 'hover'], false]
    const isLiked = ['boolean', ['feature-state', 'liked'], false]
    // Aurora glow on the ground under each pillar
    map.addLayer({
      id: 'dx-glow', type: 'circle', source: 'dx-points',
      paint: {
        'circle-color': '#edae49', 'circle-blur': 1, 'circle-pitch-alignment': 'map',
        'circle-radius': ['case', ['all', hover, ['boolean', ['feature-state', 'pulse'], false]], 52, hover, 32, isLiked, 16, 10],
        'circle-opacity': ['case', hover, 0.75, isLiked, 0.45, 0.18],
        'circle-radius-transition': { duration: 450 }, 'circle-opacity-transition': { duration: 250 }
      }
    })
    map.addLayer({
      id: 'dx-pillars', type: 'fill-extrusion', source: 'dx-pillars',
      paint: {
        'fill-extrusion-color': ['case', ['boolean', ['feature-state', 'dim'], false], '#0a2a3d', hover, '#edae49', isLiked, '#f3c26f',
          ['interpolate', ['linear'], ['get', 'score'], 0, '#30638e', 55, '#00798c', 100, '#edae49']],
        'fill-extrusion-height': ['*', ['get', 'h'], ['case', ['boolean', ['feature-state', 'dim'], false], 0.35, hover, 1.3, 1]],
        'fill-extrusion-opacity': 0.92
      }
    })
    paintStates()
    // Fly in from space (unless you've already moved the map, e.g. tapped a continent)
    if (intro && !map.isMoving() && map.getZoom() < 1) {
      map.easeTo({
        center: [128, 8], zoom: 2, pitch: 52, bearing: rotation.value, duration: 2800, essential: true,
        easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) // slow start, slow finish
      })
    }

    // Hovering a pillar: light it up and show the glass tooltip; click jumps to its card
    map.on('mousemove', 'dx-pillars', (e) => {
      const id = e.features[0].properties.id
      map.getCanvas().style.cursor = 'pointer'
      if (id !== lastHover) {
        lastHover = id
        hoverId.value = id
      }
      showTip(id)
    })
    map.on('mouseleave', 'dx-pillars', () => {
      map.getCanvas().style.cursor = ''
      lastHover = null
      dropTip()
    })
    map.on('click', 'dx-pillars', (e) => goToCard(e.features[0].properties.id))
    map.on('zoomend', refreshPillars)
    // Rotating with the mouse moves the slider too
    map.on('rotate', () => { if (map) rotation.value = Math.round(map.getBearing()) })
    map.on('rotateend', rotateMap)
    map.on('move', () => { if (map && tip.value) showTip(tip.value.city.id) })
  })
}
function showTip(id) {
  clearTimeout(tipTimer)
  const c = cityById(id)
  if (!c || !map) return
  const p = map.project([c.lon, c.lat])
  tip.value = { city: c, x: p.x, y: p.y }
}
function dropTip() {
  clearTimeout(tipTimer)
  tipTimer = setTimeout(() => {
    tip.value = null
    if (!lastHover) hoverId.value = null
  }, 250)
}
// Tapping a city card: fly the map to it, light its pillar and show its tooltip
function showOnMap(c) {
  if (!map) return
  hoverId.value = c.id
  lastHover = c.id // keeps it lit until the mouse moves onto something else
  // On phones the map sits above the list: bring it into view first
  const box = mapEl.value.getBoundingClientRect()
  if (box.bottom < 0 || box.top > window.innerHeight) mapEl.value.scrollIntoView({ behavior: 'smooth', block: 'center' })
  map.flyTo({ center: [c.lon, c.lat], zoom: Math.max(map.getZoom(), 5.5), pitch: 55, bearing: rotation.value, duration: 1200, essential: true })
  map.once('moveend', () => {
    showTip(c.id)
    lastHover = null
  })
}
// ---------- rotation slider ----------
function readRotation() {
  try {
    const saved = Number(localStorage.getItem('dxRotation'))
    return Number.isFinite(saved) && localStorage.getItem('dxRotation') !== null ? saved : -12
  } catch (err) {
    return -12
  }
}
const rotation = ref(readRotation())
function rotateMap() {
  if (map) map.rotateTo(rotation.value, { duration: 0 })
  try { localStorage.setItem('dxRotation', String(rotation.value)) } catch (err) { /* private mode */ }
}
function goToCard(id) {
  const el = cardEls[id]
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  flashId.value = id
  setTimeout(() => { if (flashId.value === id) flashId.value = null }, 1200)
}

function onKey(e) {
  if (e.key === 'Escape' && (quiz.value || reveal.value)) {
    quiz.value = null
    reveal.value = null
    return
  }
  if (e.key === 'Escape' && whyId.value) {
    whyId.value = null
    return
  }
  if (e.key === 'Escape' && (focusCountry.value || otherCountry.value)) unfocus()
  // "/" jumps to the search box (unless you're already typing somewhere)
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)
  if (e.key === '/' && !typing && searchEl.value) {
    e.preventDefault()
    searchEl.value.focus()
  }
}

// ---------- search suggestions ----------
// Countries and cities whose name contains what's typed; names that start with it come first
const suggestions = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return []
  const starts = []
  const contains = []
  for (const co of DATA.countries) {
    if (!co.country.toLowerCase().includes(q)) continue
    let n = 0
    for (const c of DATA.cities) if (c.country === co.country) n++
    const sg = { kind: 'country', key: 'country-' + co.country, label: co.country, cc: co.cc, sub: n + ' place' + (n === 1 ? '' : 's') + ' to explore' }
    if (co.country.toLowerCase().startsWith(q)) starts.push(sg)
    else contains.push(sg)
  }
  for (const c of allCities) {
    if (!c.cityName.toLowerCase().includes(q)) continue
    const sg = { kind: 'city', key: c.id, label: c.cityName, cc: c.cc, sub: c.country, city: c }
    if (c.cityName.toLowerCase().startsWith(q)) starts.push(sg)
    else contains.push(sg)
  }
  return starts.concat(contains).slice(0, 6)
})
function pickSuggest(sg) {
  suggestOpen.value = false
  activeSuggest.value = -1
  search.value = ''
  if (searchEl.value) searchEl.value.blur()
  focus(sg.kind === 'country' ? sg.label : sg.city.country)
  // A city: once the country is open, fly to the city too
  if (sg.kind === 'city') setTimeout(() => showOnMap(cityById(sg.city.id)), 950)
}
function onSearchKey(e) {
  const n = suggestions.value.length
  if (e.key === 'ArrowDown' && n) {
    e.preventDefault()
    suggestOpen.value = true
    activeSuggest.value = (activeSuggest.value + 1) % n
  } else if (e.key === 'ArrowUp' && n) {
    e.preventDefault()
    activeSuggest.value = activeSuggest.value <= 0 ? n - 1 : activeSuggest.value - 1
  } else if (e.key === 'Enter') {
    if (activeSuggest.value >= 0 && activeSuggest.value < n) pickSuggest(suggestions.value[activeSuggest.value])
    else if (n === 1) pickSuggest(suggestions.value[0])
    else suggestOpen.value = false // keep the filtered list
  } else if (e.key === 'Escape') {
    e.stopPropagation()
    if (suggestOpen.value && n) suggestOpen.value = false
    else clearSearch()
  }
}
function clearSearch() {
  search.value = ''
  activeSuggest.value = -1
  if (searchEl.value) searchEl.value.focus()
}
function closeSuggest() {
  setTimeout(() => { suggestOpen.value = false }, 120)
}
// A new filter: Pip bounces and starts again from the first tip
watch([budget, continent, vibes, start, end, focusCountry], () => {
  tipIndex.value = 0
  hopPip()
})

onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.addEventListener('click', closeVibes)
  document.body.classList.add('dx-body')
  if (auth.token) syncShortlist() // picks saved on another device show up here too
  loadPhotos()
  setTimeout(checkTrack, 300) // packed places from last time: show the fade if they don't all fit
  for (const c of DATA.countries) preloadFlag(c.country) // every country banner, ready before it's opened
  buildMap()
  if (topEl.value && window.ResizeObserver) {
    topWatcher = new ResizeObserver(() => { topHeight.value = topEl.value ? topEl.value.offsetHeight : 112 })
    topWatcher.observe(topEl.value)
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('click', closeVibes)
  document.body.classList.remove('dx-body')
  if (topWatcher) topWatcher.disconnect()
  clearTimeout(tipTimer)
  clearTimeout(pipTimer)
  clearTimeout(tierTimer)
  clearInterval(pulseTimer)
  // Forget the map first, so nothing touches it while it is being taken down
  const old = map
  map = null
  try {
    if (old) old.remove()
  } catch (err) {
    // the map was still loading; nothing to clean up
  }
})
</script>

<style scoped>
.dx {
  --bg: #001d2c;
  --panel: #0f4566;
  --line: rgba(255, 255, 255, 0.16);
  --text: #f6f1e7;
  --muted: #b4c3cf;
  --emerald: #edae49;
  --font-fun: 'Lilita One', var(--font-display); /* chunky display font: city names and headings only */
  color: var(--text);
  padding: 16px 0 32px;
}
.dx.has-tray {
  padding-bottom: 110px;
}
.glass {
  background: rgba(14, 64, 94, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--line);
  border-radius: 18px;
}

/* ===== Explorer mission control (the header) ===== */
/* Cream, tactile and friendly. Ink is navy, accents teal and gold. */
.dx-top {
  --text: #12324a;
  --muted: #5a6b78;
  --line: #efdcbc;
  position: sticky;
  top: 8px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px 14px;
  margin-bottom: 16px;
  border-radius: 28px;
  background:
    radial-gradient(circle, rgba(18, 50, 74, 0.07) 1.1px, transparent 1.3px) 0 0 / 20px 20px,
    linear-gradient(180deg, #fffaf0, #fbf1dd);
  color: var(--text);
  box-shadow: 0 2px 0 rgba(255, 255, 255, 0.9) inset, 0 6px 0 #d7c3a0, 0 26px 50px -22px rgba(0, 0, 0, 0.6);
}
.dx-row1,
.dx-row2,
.dx-row3 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.dx-row1 {
  gap: 16px;
}
/* title */
.dx-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.dx-back {
  flex: none;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fbf5ea;
  color: #12324a;
  font-size: 24px;
  text-decoration: none;
  box-shadow: 0 4px 0 #e6d3b1;
  transition: transform 0.12s, box-shadow 0.12s;
}
.dx-back:hover {
  color: #12324a;
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #e6d3b1;
}
.dx-back:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #e6d3b1;
}
.dx-crumbs {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--muted);
}
.dx-crumb {
  padding: 0;
  border: 0;
  background: none;
  color: #0f8391;
  font-size: 15px;
  font-weight: 800;
}
.dx-crumb:hover {
  text-decoration: underline;
}
.dx-crumb:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 2px;
  border-radius: 4px;
}
.dx-title {
  font-size: clamp(1.6rem, 2.6vw, 2.1rem);
  line-height: 1.05;
  margin: 0;
  color: #12324a;
}
.dx-sub {
  margin: 2px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
/* Pip the scout + speech bubble */
.dx-scout {
  flex: none;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}
.dx-scout-pip {
  flex: none;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  animation: dx-scout-float 3.2s ease-in-out infinite;
}
.dx-scout-pip.hop {
  animation: dx-scout-hop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), dx-scout-float 3.2s ease-in-out 0.6s infinite;
}
@keyframes dx-scout-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
@keyframes dx-scout-hop {
  0% { transform: translateY(0) scale(1); }
  35% { transform: translateY(-14px) scale(1.08, 0.94) rotate(-6deg); }
  65% { transform: translateY(0) scale(0.95, 1.05); }
  100% { transform: translateY(0) scale(1); }
}
.dx-scout-pip:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 2px;
  border-radius: 16px;
}
.dx-scout-bubble {
  position: relative;
  margin: 0;
  padding: 7px 12px;
  white-space: nowrap;
  border-radius: 18px;
  background: #fbf5ea;
  color: #12324a;
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.4;
  box-shadow: 0 3px 0 #ead8b6, 0 10px 20px -12px rgba(18, 50, 74, 0.4);
}
.dx-scout-bubble::before {
  content: '';
  position: absolute;
  right: -6px;
  top: 50%;
  width: 12px;
  height: 12px;
  margin-top: -6px;
  background: #fbf5ea;
  border-radius: 0 0 0 3px;
  transform: rotate(45deg);
}
.dx-tipswap-enter-active {
  transition: opacity 0.2s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dx-tipswap-leave-active {
  transition: opacity 0.12s, transform 0.12s;
}
.dx-tipswap-enter-from,
.dx-tipswap-leave-to {
  opacity: 0;
  transform: scale(0.92) translateX(-6px);
}
.ft-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
/* search: high-contrast cream with a chunky soft border */
.dx-search {
  position: relative;
  flex: 1 1 220px;
  min-width: 0;
}
.dx-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  line-height: 0;
  pointer-events: none;
}
.dx-search-input {
  box-sizing: border-box;
  width: 100%;
  height: 54px;
  padding: 0 50px 0 50px;
  border: 2.5px solid #efdcbc;
  border-radius: 18px;
  background: #fbf5ea;
  color: #12324a;
  font-size: 15.5px;
  font-weight: 600;
  box-shadow: inset 0 3px 0 rgba(18, 50, 74, 0.04), 0 3px 0 #efdcbc;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.dx-search-input::placeholder {
  color: #8a99a5;
  font-weight: 500;
}
.dx-search-input:focus {
  outline: none;
  border-color: #19b3c4;
  box-shadow: 0 0 0 4px rgba(25, 179, 196, 0.2), 0 3px 0 #0f8391;
}
.dx-search.open .dx-search-input {
  border-radius: 18px 18px 0 0;
}
.dx-search-clear,
.dx-search-kbd {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}
.dx-search-clear {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f4ead8;
  color: #12324a;
}
.dx-search-clear:hover,
.dx-search-clear:focus-visible {
  background: #19b3c4;
  color: #fff;
  outline: none;
}
.dx-search-kbd {
  right: 14px;
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
/* suggestions drop down from the search */
.dx-suggest {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% - 3px);
  z-index: 40;
  margin: 0;
  padding: 6px;
  list-style: none;
  border: 2.5px solid #19b3c4;
  border-top: 0;
  border-radius: 0 0 18px 18px;
  background: #fbf5ea;
  box-shadow: 0 24px 44px -12px rgba(0, 0, 0, 0.45);
}
.dx-sg {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  border-radius: 12px;
  cursor: pointer;
}
.dx-sg.active {
  background: #fff3dc;
}
.dx-sg-flag {
  flex-shrink: 0;
}
.dx-sg-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.dx-sg-text strong {
  font-size: 15px;
  color: #12324a;
}
.dx-sg-text small {
  font-size: 12.5px;
  color: #5a6b78;
}
.dx-sg-kind {
  padding: 2px 9px;
  border-radius: 7px;
  background: #f4ead8;
  font-size: 11.5px;
  font-weight: 800;
  color: #5a6b78;
}
.dx-sg.active .dx-sg-kind {
  background: #19b3c4;
  color: #fff;
}
@media (max-width: 560px) {
  .dx-search-kbd,
  .dx-sg-kind {
    display: none;
  }
}
.dx-link {
  border: 0;
  background: none;
  padding: 0;
  color: var(--emerald);
  font-weight: 700;
  text-decoration: underline;
}
/* dates: a pocket logbook, two pages joined by a ring */
.dx-logbook {
  display: flex;
  align-items: stretch;
  padding: 4px;
  border-radius: 16px;
  background: #24407a;
  box-shadow: 0 4px 0 #182c57;
}
.dx-logpage {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  padding: 5px 10px 5px 12px;
  border-radius: 11px;
  background:
    repeating-linear-gradient(180deg, transparent 0 13px, rgba(25, 179, 196, 0.25) 13px 14px),
    #fffaf0;
  cursor: pointer;
  transition: background-color 0.15s, transform 0.15s;
}
.dx-logpage:hover {
  transform: translateY(-1px);
}
.dx-logpage:focus-within {
  box-shadow: 0 0 0 3px #19b3c4;
}
.dx-logpage small {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #d94b5b;
}
.dx-logpage input {
  width: 128px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #12324a;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  color-scheme: light;
  outline: none;
}
.dx-logpage input::-webkit-calendar-picker-indicator {
  display: none; /* the whole page opens the picker */
}
.dx-logbook-ring {
  flex: none;
  width: 10px;
  margin: 6px -1px;
  background: radial-gradient(circle, #c9ced6 3px, transparent 3.5px) 50% 0 / 10px 12px repeat-y;
}
/* budget: three coins */
.dx-coins {
  display: flex;
  gap: 6px;
  padding: 5px;
  border-radius: 16px;
  background: #f1e5cf;
  box-shadow: inset 0 2px 4px rgba(18, 50, 74, 0.12);
}
.dx-coin {
  width: 46px;
  height: 46px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffffff, #dfe4ea 60%, #b8c1cc);
  color: #5a6b78;
  font: inherit;
  font-weight: 900;
  font-size: 13px;
  cursor: pointer;
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.6), 0 3px 0 #9aa6b2;
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s;
}
.dx-coin-face {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px dashed rgba(18, 50, 74, 0.18);
}
.dx-coin:hover {
  transform: translateY(-3px);
}
.dx-coin:active {
  transform: translateY(2px);
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.6), 0 1px 0 #9aa6b2;
}
.dx-coin.on {
  background: radial-gradient(circle at 35% 30%, #fff3c4, #ffc94d 55%, #e09a1c);
  color: #6b3f00;
  transform: translateY(-3px);
  box-shadow: inset 0 0 0 3px rgba(255, 255, 255, 0.5), 0 4px 0 #b9770f, 0 0 16px rgba(255, 191, 60, 0.6);
}
.dx-coin.on .dx-coin-face {
  border-color: rgba(107, 63, 0, 0.35);
}
.dx-coin.flip {
  animation: dx-coin-flip 0.55s cubic-bezier(0.34, 1.3, 0.64, 1);
}
@keyframes dx-coin-flip {
  0% { transform: translateY(0) rotateY(0); }
  50% { transform: translateY(-12px) rotateY(180deg); }
  100% { transform: translateY(-3px) rotateY(360deg); }
}
.dx-coin:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 2px;
}
/* the vibe button: navy, so it stands out on the cream */
.dx-top .dx-quiz-btn {
  padding: 12px 16px;
  background: #12324a;
  color: #fff;
  box-shadow: 0 4px 0 #0b1f2e;
}
.dx-top .dx-quiz-btn:hover {
  box-shadow: 0 6px 0 #0b1f2e;
}
.dx-top .dx-quiz-btn:active {
  box-shadow: 0 1px 0 #0b1f2e;
}
.dx-signin {
  padding: 10px 16px;
  border: 2.5px solid #12324a;
  border-radius: 14px;
  background: transparent;
  color: #12324a;
  font-weight: 800;
  font-size: 14px;
}
.dx-signin:hover {
  background: #fbf5ea;
}
.dx-error {
  width: 100%;
  margin: 0;
  color: #c43a4b;
  font-size: 13px;
  font-weight: 700;
}

/* Split */
.dx-split {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.dx-feed {
  scroll-margin-top: calc(var(--dx-top-h, 112px) + 20px);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dx-country {
  scroll-margin-top: calc(var(--dx-top-h, 112px) + 20px);
  padding: 18px;
  /* warm cream cards (the map stays dark) */
  --text: #12324a;
  --muted: #5a6b78;
  --line: rgba(18, 50, 74, 0.12);
  background: #fffaf0;
  color: var(--text);
  border: 0;
  border-radius: 24px;
  box-shadow: 0 2px 0 rgba(255, 255, 255, 0.8) inset, 0 18px 36px -18px rgba(0, 0, 0, 0.45);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  transition: box-shadow 0.2s, transform 0.2s;
}
.dx-country.lit {
  box-shadow: 0 0 0 3px #ffbf3c, 0 22px 40px -18px rgba(0, 0, 0, 0.5);
}
.dx-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dx-country-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}
.dx-allbtn {
  align-self: flex-start;
  padding: 8px 16px;
  color: var(--text);
  font-weight: 700;
  border-radius: 999px;
}
.dx-allbtn:hover {
  color: var(--emerald);
  border-color: rgba(237, 174, 73, 0.5);
}
.dx-country.focused {
  padding-top: 0;
  overflow: hidden;
  border-color: rgba(237, 174, 73, 0.35);
}
.dx-hero {
  height: 200px;
  margin: 0 -18px 14px;
  display: flex;
  align-items: flex-end;
  padding: 16px;
  background: linear-gradient(160deg, #0f4566, #0f4566) center / cover no-repeat;
}
.dx-hero {
  position: relative;
}
.dx-hero.nophoto {
  height: 120px;
}
.dx-hero-back {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  padding: 7px 14px;
  background: rgba(0, 38, 58, 0.7);
  backdrop-filter: blur(8px);
  color: #fff; /* on the dark banner (the card around it is cream) */
  font-weight: 800;
  font-size: 13px;
  transition: color 0.15s, border-color 0.15s;
}
.dx-hero-back:hover {
  color: var(--emerald);
  border-color: var(--emerald);
}
.dx-hero-back:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.6);
  outline-offset: 2px;
}
.dx-hero-name {
  margin: 0;
  color: #fff; /* on the dark photo, inside the cream card */
  font-family: var(--font-display);
  font-size: 2.2rem;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
}
.dx-country:not(.focused) {
  cursor: pointer;
}
.dx-country-btn {
  border: 0;
  background: none;
  padding: 0;
  color: inherit;
  text-align: left;
}
.dx-explore {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  color: var(--emerald);
  opacity: 0;
  transition: opacity 0.15s;
}
.dx-country:hover .dx-explore,
.dx-country-btn:focus-visible .dx-explore {
  opacity: 1;
}
.dx-other-cta {
  margin-top: 14px;
}
.dx-tagline.big {
  font-size: 15px;
  color: #dde6ec;
  margin: 0;
}
.dx-allbtn:focus-visible,
.dx-country-btn:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.6);
  outline-offset: 3px;
}
/* Top sights row */
.dx-sights {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.dx-sights-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  margin: 0 0 10px;
}
.dx-sights-row {
  list-style: none;
  margin: 0;
  padding: 2px 2px 10px;
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}
.dx-sights-row li {
  flex: 0 0 160px;
  scroll-snap-align: start;
}
.dx-sight {
  --text: #f6f1e7;
  position: relative;
  width: 100%;
  height: 190px;
  display: flex;
  align-items: flex-end;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: linear-gradient(160deg, #0f4566, #0f4566) center / cover no-repeat;
  color: var(--text);
  text-align: left;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}
/* Photo still on its way: a soft moving shine */
.dx-sight.loading {
  background: linear-gradient(110deg, #0f4566 30%, #1b5a80 50%, #0f4566 70%) 0 0 / 220% 100%;
  animation: dx-shine 1.4s linear infinite;
}
@keyframes dx-shine {
  to { background-position: -220% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .dx-sight.loading { animation: none; }
}
.dx-sight:hover {
  transform: translateY(-3px);
  border-color: var(--emerald);
  box-shadow: 0 12px 26px rgba(237, 174, 73, 0.15);
}
.dx-sight-rank {
  position: absolute;
  top: 8px;
  left: 8px;
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 38, 58, 0.75);
  color: var(--emerald);
  font-weight: 800;
  font-size: 13px;
  backdrop-filter: blur(6px);
}
.dx-sight-text strong {
  display: block;
  font-family: var(--font-display);
  font-size: 1rem;
  line-height: 1.15;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}
.dx-sight-text small {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: #dde6ec;
}
.dx-sight:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.6);
  outline-offset: 2px;
}
.dx-country-name {
  font-family: var(--font-display);
  font-size: 1.35rem;
  margin: 0;
}
.dx-tagline {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--muted);
}
.dx-country-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.dx-gems {
  font-size: 11px;
  color: var(--muted);
}

/* City cards: a swipeable row */
.dx-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 4px 2px 10px;
  scrollbar-width: thin;
}
.dx-city.flash {
  animation: dx-flash 1.2s ease;
}
@keyframes dx-flash {
  0%, 100% { box-shadow: 0 0 0 0 rgba(237, 174, 73, 0); }
  30% { box-shadow: 0 0 0 4px rgba(237, 174, 73, 0.7); }
}
/* Heart icon: white outline, filled red once it's in your shortlist */
@keyframes dx-pop {
  50% { transform: scale(1.35); }
}
/* "Why 94?": the score's parts, over the card */
.dx-why {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  z-index: 3;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(0, 29, 44, 0.94);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  cursor: default;
}
.dx-why-title {
  margin: 0 0 6px;
  font-weight: 800;
  font-size: 14px;
  color: #fff;
}
.dx-why ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
}
.dx-why li.good {
  color: #f6f1e7;
}
.dx-why li.meh {
  color: var(--muted);
}
.dx-why-how {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--muted);
}

.dx-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 26px 20px;
  border-radius: 24px;
  background: #fffaf0;
  color: #12324a;
  text-align: center;
  font-weight: 600;
}
.dx-empty p {
  margin: 0;
}

/* Confirm sheet */
.dx-sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 38, 58, 0.55);
  backdrop-filter: blur(4px);
}
.dx-sheet {
  position: relative;
  width: min(480px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 22px 20px 18px;
  display: flex;
  flex-direction: column;
  background: rgba(10, 53, 80, 0.95);
  box-shadow: 0 -10px 50px rgba(0, 0, 0, 0.5);
  animation: dx-sheet-up 0.25s cubic-bezier(.2, .8, .2, 1);
}
@keyframes dx-sheet-up {
  from { transform: translateY(30px); opacity: 0; }
}
.dx-sheet-x {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  color: var(--muted);
}
.dx-sheet-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  margin: 0 0 8px;
}
.dx-sheet-label {
  display: block;
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}
.dx-sheet-input {
  width: 100%;
}
.dx-route {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dx-route li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 6px 6px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--line);
}
.dx-route-n {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--emerald);
  color: #001d2c;
  font-size: 12px;
  font-weight: 800;
}
.dx-route-name {
  flex: 1;
  font-weight: 600;
}
.dx-route button {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.16);
  color: var(--text);
}
.dx-route button:disabled {
  opacity: 0.3;
}
.dx-sheet-cta {
  margin-top: 18px;
  width: 100%;
}
.dx-sheet-x:focus-visible,
.dx-route button:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.6);
  outline-offset: 2px;
}

/* Map */
/* The map column (sticky) */
.dx-mapcol {
  position: sticky;
  top: calc(var(--dx-top-h, 112px) + 20px);
}
/* "Expand map" / "Show list": a glass pill over the map's top-left corner (the zoom buttons are top-right).
   It's sticky, so it stays on screen while the page scrolls; the negative margin lays it over the map. */
.dx-widen {
  position: sticky;
  top: calc(var(--dx-top-h, 112px) + 32px);
  z-index: 6;
  margin: 12px 0 -50px 12px;
  width: max-content;
  display: flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 14px 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(10, 53, 80, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #f6f1e7;
  font-size: 13.5px;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.dx-widen:hover,
.dx-widen[aria-pressed="true"] {
  background: #edae49;
  border-color: #edae49;
  color: #001d2c;
}
.dx-widen:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}
.dx-split.map-only {
  grid-template-columns: minmax(0, 1fr);
}
/* Continents: passport stamps. Faded until explored, inked (teal) once you've been; the picked one pops gold. */
.dx-conts {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.dx-cont {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 2.5px dashed #c9b894;
  background: transparent;
  color: #8a99a5;
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transform: rotate(var(--tilt, 0deg));
  transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
}
.dx-cont :deep(.dz) {
  filter: grayscale(1);
  opacity: 0.6;
  transition: filter 0.3s, opacity 0.3s;
}
.dx-cont.inked {
  border-style: solid;
  border-color: #19b3c4;
  color: #0f6e7b;
  background: rgba(25, 179, 196, 0.08);
}
.dx-cont.inked :deep(.dz),
.dx-cont.on :deep(.dz) {
  filter: none;
  opacity: 1;
}
.dx-cont:hover {
  transform: rotate(0deg) translateY(-3px) scale(1.04);
}
.dx-cont:active {
  transform: scale(0.94);
}
.dx-cont.on {
  border: 2.5px solid #12324a;
  background: #ffbf3c;
  color: #12324a;
  transform: rotate(0deg) translateY(-4px);
  box-shadow: 0 5px 0 #12324a;
  animation: dx-stamp-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes dx-stamp-pop {
  0% { transform: rotate(var(--tilt, 0deg)) scale(1); }
  45% { transform: rotate(-6deg) translateY(-6px) scale(1.12); }
  100% { transform: rotate(0deg) translateY(-4px) scale(1); }
}
.dx-cont-n {
  min-width: 20px;
  padding: 0 6px;
  border-radius: 6px;
  background: rgba(18, 50, 74, 0.08);
  font-size: 11.5px;
  text-align: center;
}
.dx-cont.on .dx-cont-n {
  background: rgba(18, 50, 74, 0.16);
}
.dx-cont:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 2px;
}
/* Medium screens: keep the header short (it stays at the top): the stamps scroll sideways instead of wrapping */
@media (max-width: 1279px) {
  .dx-conts {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    padding: 6px 2px 8px;
  }
  .dx-conts::-webkit-scrollbar { display: none; }
  .dx-cont { flex: none; }
  .dx-scout-bubble { font-size: 12.5px; }
}
/* Phones: just Pip, no bubble (tap him and he still bounces) */
@media (max-width: 560px) {
  .dx-row1 { flex-wrap: nowrap; gap: 8px; } /* Pip stays on the title's row */
  .dx-brand { flex: 1; }
  .dx-scout-bubble { display: none; }
  .dx-scout-pip :deep(.pg) { width: 42px; height: 33px; }
}
.dx-mapwrap {
  position: relative;
  height: calc(100vh - var(--dx-top-h, 112px) - 40px);
  min-height: 420px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: radial-gradient(circle at 50% 45%, #04131d 0%, #01080d 60%, #000306 100%); /* space, behind the globe */
}
.dx-map {
  position: absolute;
  inset: 0;
}
.dx-maperr {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 12px;
  margin: 0;
  padding: 10px 12px;
  font-size: 13px;
}
.dx-rotate {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 12px;
  border-radius: 999px;
}
.dx-rot-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}
.dx-rot-range {
  width: 120px;
  accent-color: var(--emerald);
}
.dx-rot-reset {
  width: 28px;
  height: 28px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: var(--emerald);
  font-size: 12px;
  font-weight: 800;
}
.dx-rot-reset:disabled {
  color: var(--muted);
  opacity: 0.6;
}
.dx-rot-range:focus-visible,
.dx-rot-reset:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.6);
  outline-offset: 2px;
}
.dx-tip {
  pointer-events: none;
  position: absolute;
  z-index: 5;
  width: 220px;
  transform: translate(-50%, calc(-100% - 18px));
  overflow: hidden;
  padding: 0;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
}
.dx-tip-photo {
  height: 96px;
  background: linear-gradient(160deg, #0f4566, #0f4566) center / cover no-repeat;
}
.dx-tip-body {
  display: flex;
  flex-direction: column;
  padding: 10px 12px 4px;
}
.dx-tip-body small {
  color: var(--muted);
}
.dx-tip-hint {
  margin: 0;
  padding: 0 12px 10px;
  font-size: 11px;
  color: var(--emerald);
}
.dx-pop-enter-active,
.dx-pop-leave-active {
  transition: opacity 0.15s ease;
}
.dx-pop-enter-from,
.dx-pop-leave-to {
  opacity: 0;
}

/* Shortlist = a suitcase dock: suitcase + level on the left, chips scrolling in the middle, plan button on the right */
.dx-tray {
  position: fixed;
  left: 50%;
  bottom: 18px;
  z-index: 1200;
  transform: translateX(-50%);
  width: min(1040px, calc(100% - 32px));
  height: 84px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px 0 14px;
  border-radius: 24px;
  background: #fffaf0;
  color: #12324a;
  box-shadow: 0 4px 0 #d7c3a0, 0 22px 50px -10px rgba(0, 0, 0, 0.55);
}
.dx-case-wrap {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.dx-case {
  flex: none;
  line-height: 0;
  transform-origin: 50% 100%;
}
/* something just dropped in: squash, stretch, settle */
.dx-case.bump {
  animation: dx-case-bump 0.6s cubic-bezier(0.34, 1.4, 0.64, 1);
}
@keyframes dx-case-bump {
  0% { transform: scale(1, 1); }
  25% { transform: scale(1.15, 0.85); }
  50% { transform: scale(0.92, 1.1) rotate(-3deg); }
  75% { transform: scale(1.04, 0.97) rotate(2deg); }
  100% { transform: scale(1, 1); }
}
/* well packed: travel stickers pop on */
.dx-case-stickers {
  transform-box: fill-box;
  transform-origin: center;
  animation: dx-sticker-on 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes dx-sticker-on {
  from { transform: scale(0); opacity: 0; }
}
/* overstuffed: bulging, a sock poking out, and it wobbles while you hover the dock */
.dx-case.load-stuffed svg {
  transform: scale(1.07, 1.02);
}
.dx-tray:hover .dx-case.load-stuffed:not(.bump) {
  animation: dx-case-wobble 0.9s ease-in-out infinite;
}
@keyframes dx-case-wobble {
  0%, 100% { transform: rotate(0) scale(1); }
  25% { transform: rotate(-4deg) scale(1.03, 0.98); }
  75% { transform: rotate(4deg) scale(0.98, 1.03); }
}
.dx-case-sock {
  transform-box: fill-box;
  transform-origin: 0 100%;
  animation: dx-sock 1.4s ease-in-out infinite alternate;
}
@keyframes dx-sock {
  to { transform: rotate(-12deg); }
}
.dx-case-fill {
  transition: y 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dx-case-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 132px;
}
.dx-case-meta strong {
  font-family: var(--font-fun);
  font-weight: 400;
  font-size: 1.1rem;
  line-height: 1;
}
.dx-case-meta small {
  font-size: 11px;
  font-weight: 700;
  color: #5a6b78;
  white-space: nowrap;
}
.dx-case-meta small b {
  color: #d94b5b;
  font-weight: 900;
}
.dx-case-bar {
  display: block;
  height: 8px;
  border-radius: 6px;
  background: #efe3cc;
  overflow: hidden;
}
.dx-case-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #19b3c4, #ffbf3c);
  transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
/* "Getaway unlocked!" */
.dx-tier-pop {
  position: absolute;
  left: 50%;
  top: -22px;
  padding: 3px 10px;
  border-radius: 8px;
  background: #ffbf3c;
  color: #12324a;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
  transform: translateX(-50%) rotate(-4deg);
  box-shadow: 0 3px 0 #b9770f;
}
.dx-cheer-enter-active {
  transition: opacity 0.2s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dx-cheer-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.dx-cheer-enter-from {
  opacity: 0;
  transform: translate(-50%, 12px) scale(0.6);
}
.dx-cheer-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px) rotate(-4deg);
}
/* the chips: one row that scrolls sideways, with soft fades at the ends when there's more */
.dx-tray-chips {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  list-style: none;
  margin: 0;
  padding: 10px 8px;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 var(--fl, 0px), #000 calc(100% - var(--fr, 0px)), transparent);
  mask-image: linear-gradient(90deg, transparent, #000 var(--fl, 0px), #000 calc(100% - var(--fr, 0px)), transparent);
}
.dx-tray-chips::-webkit-scrollbar {
  display: none;
}
/* each packed place is a little luggage label; a new one stamps in */
.dx-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 10px;
  border-radius: 6px 12px 12px 6px;
  background: #fbf5ea;
  border: 2px solid #efdcbc;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  transform: rotate(var(--tilt, 0deg));
  animation: dx-chip-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes dx-chip-in {
  0% { transform: scale(1.6) rotate(-14deg); opacity: 0; }
  60% { transform: scale(0.92) rotate(var(--tilt, 0deg)); opacity: 1; }
  100% { transform: scale(1) rotate(var(--tilt, 0deg)); }
}
/* an easy-to-tap × */
.dx-chip button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: #f4ead8;
  color: #12324a;
}
.dx-chip button:hover {
  background: #ffd3d6;
}
.dx-sheet-note {
  margin: 10px 0 0;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 191, 60, 0.15);
  font-size: 13px;
  font-weight: 600;
}
.dx-cta {
  flex-shrink: 0;
  border: 0;
  border-radius: 16px;
  padding: 12px 20px;
  font-weight: 900;
  background: linear-gradient(180deg, #ffd36e, #ffbf3c 55%, #f5a922);
  color: #12324a;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 4px 0 #b9770f;
  transition: transform 0.12s, box-shadow 0.12s;
}
.dx-cta:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 6px 0 #b9770f;
}
.dx-cta:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 1px 0 #b9770f;
}
.dx-cta:disabled {
  opacity: 0.5;
}
.dx-tray-enter-active,
.dx-tray-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.dx-tray-enter-from,
.dx-tray-leave-to {
  transform: translate(-50%, 120%);
  opacity: 0;
}

.dx-back:focus-visible,
.dx-seg button:focus-visible,
.dx-vibe:focus-visible,
.dx-chip button:focus-visible,
.dx-cta:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.6);
  outline-offset: 2px;
}

/* ---------- chunky display font ---------- */
.fun {
  font-family: var(--font-fun);
  font-weight: 400;
  letter-spacing: 0.01em;
}
/* ---------- stamps (flags), stickers (vibes), luggage tags (price) ---------- */
/* A flag as a postage stamp: perforated edge (little holes in a cream frame) */
.dx-stamp {
  display: inline-flex;
  vertical-align: middle;
  padding: 4px;
  background: radial-gradient(circle, transparent 1.6px, #fffaf0 2px) -3.5px -3.5px / 7px 7px;
  filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.35));
  transform: rotate(-3deg);
}
.dx-stamp.sm {
  padding: 3px;
  background-size: 5px 5px;
  background-position: -2.5px -2.5px;
}
.dx-stamp :deep(.fl) {
  border-radius: 0;
  box-shadow: none;
}
.dx-sticker {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 2.5px solid #fff;
  border-radius: 10px;
  background: #ffe3a1;
  color: #12324a;
  font: inherit;
  font-size: 12.5px;
  font-weight: 800;
  white-space: nowrap;
  transform: rotate(var(--tilt, 0deg));
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
button.dx-sticker {
  cursor: pointer;
}
button.dx-sticker:hover {
  transform: rotate(0deg) scale(1.06);
}
.dx-sticker.sm {
  padding: 2px 7px;
  border-width: 2px;
  border-radius: 8px;
  font-size: 10.5px;
  background: #fff3dc;
}
.dx-sticker.sm.hit {
  background: #ffbf3c;
}
/* price as a luggage tag: a notched end with a hole and a bit of string */
/* ---------- grades + XP bar ---------- */
.dx-grade {
  flex: none;
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  font-family: var(--font-fun);
  font-size: 1.25rem;
  line-height: 1;
  color: #12324a;
  background: #dde6ec;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.15);
  transform: rotate(-4deg);
}
.dx-grade.sm {
  width: 30px;
  height: 30px;
  font-size: 1.05rem;
}
.dx-grade.g-S {
  background: linear-gradient(135deg, #ffe08a, #ffbf3c 50%, #ff9d4d);
}
.dx-grade.g-A {
  background: #8fcbff;
}
.dx-grade.g-B {
  background: #b9ebc8;
}
@keyframes dx-xp-fill {
  from { transform: scaleX(0); }
}
/* ---------- rarity ---------- */
.dx-rarity {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(0, 29, 44, 0.72);
  color: #dde6ec;
}
.dx-rarity.r-rare {
  background: linear-gradient(135deg, #5fb8ff, #8f7dff);
  color: #fff;
}
.dx-rarity.r-legendary {
  background: linear-gradient(135deg, #ffe08a, #ffbf3c 45%, #ff8a5c);
  color: #3a2300;
  box-shadow: 0 0 14px rgba(255, 191, 60, 0.6);
}
/* foil / holo shimmer that sweeps across Rare and Legendary cards on hover */
.dx-foil {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0;
  mix-blend-mode: color-dodge;
  background: linear-gradient(115deg, transparent 20%, rgba(143, 203, 255, 0.55) 38%, rgba(195, 176, 255, 0.6) 46%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 201, 77, 0.55) 56%, transparent 75%) 0 0 / 250% 250%;
  transition: opacity 0.25s;
}
.r-legendary .dx-foil {
  background-image: linear-gradient(115deg, transparent 18%, rgba(255, 224, 138, 0.7) 36%, rgba(255, 122, 133, 0.5) 44%, rgba(255, 255, 255, 0.8) 50%, rgba(143, 203, 255, 0.55) 57%, rgba(255, 224, 138, 0.7) 64%, transparent 80%);
}
.dx-city:hover .dx-foil,
.dx-city:focus-visible .dx-foil,
.dx-foil.on {
  opacity: 1;
  animation: dx-holo 1.6s ease-in-out infinite alternate;
}
@keyframes dx-holo {
  from { background-position: 100% 100%; }
  to { background-position: 0 0; }
}
/* ---------- cards deal in like a hand of cards ---------- */
@keyframes dx-deal {
  from { opacity: 0; transform: translate(-40px, 30px) rotate(-10deg) scale(0.85); }
}
/* ---------- countries slide to their new place when the ranking changes ---------- */
.dx-shuffle-move {
  transition: transform 0.6s cubic-bezier(0.34, 1.3, 0.64, 1);
}
.dx-shuffle-enter-active {
  transition: opacity 0.35s, transform 0.35s;
}
.dx-shuffle-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.dx-shuffle-leave-active {
  display: none; /* leaving countries just go, so the rest can slide up */
}
/* ---------- heart burst ---------- */
.dx-burst {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.dx-burst i {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 7px;
  height: 7px;
  margin: -3.5px;
  border-radius: 50%;
  background: #ff6b7a;
  animation: dx-burst 0.55s ease-out forwards;
}
.dx-burst i:nth-child(even) {
  background: #ffbf3c;
}
@keyframes dx-burst {
  from { transform: rotate(var(--a)) translateY(0) scale(1); opacity: 1; }
  to { transform: rotate(var(--a)) translateY(-28px) scale(0.3); opacity: 0; }
}
/* ---------- vibe quiz button + stickers in the header ---------- */
.dx-vibebox {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.dx-quiz-btn,
.dx-spin,
.dx-ghost {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border: 0;
  border-radius: 14px;
  background: #fffaf0;
  color: #12324a;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 0 #d7c3a0;
  transition: transform 0.12s, box-shadow 0.12s;
}
.dx-quiz-btn:hover,
.dx-spin:hover:not(:disabled),
.dx-ghost:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #d7c3a0;
}
.dx-quiz-btn:active,
.dx-spin:active:not(:disabled),
.dx-ghost:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #d7c3a0;
}
/* ---------- spin the globe ---------- */
.dx-spin {
  position: absolute;
  left: 50%;
  top: 14px;
  translate: -50% 0;
  z-index: 4;
  background: linear-gradient(180deg, #ffd36e, #ffbf3c 55%, #f5a922);
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 4px 0 #b9770f;
}
.dx-spin:hover:not(:disabled) {
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.6), 0 6px 0 #b9770f;
}
.dx-spin:disabled {
  cursor: progress;
}
.dx-spinning {
  animation: dx-spin 0.8s linear infinite;
}
@keyframes dx-spin {
  to { transform: rotate(360deg); }
}
/* ---------- quiz + spin result pop-ups ---------- */
.dx-quiz-overlay,
.dx-reveal-overlay {
  --font-fun: 'Lilita One', var(--font-display);
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: grid;
  place-items: center;
  padding: 16px;
  overflow-y: auto;
  background: rgba(0, 20, 32, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.dx-quiz,
.dx-reveal {
  position: relative;
  width: min(520px, 100%);
  padding: 22px 22px 18px;
  border-radius: 28px;
  background: #fffaf0;
  color: #12324a;
  box-shadow: 0 6px 0 #d7c3a0, 0 40px 80px -24px rgba(0, 0, 0, 0.6);
  animation: dx-quiz-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes dx-quiz-in {
  from { opacity: 0; transform: translateY(20px) scale(0.9); }
}
.dx-quiz-x {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 3;
  cursor: pointer;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 12px;
  background: #f4ead8;
  color: #12324a;
}
.dx-quiz-pip,
.dx-reveal-pip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 40px;
}
.dx-quiz-pip :deep(.pg),
.dx-reveal-pip :deep(.pg),
.dx-empty :deep(.pg) {
  flex: none;
}
.dx-quiz-bubble {
  position: relative;
  margin: 0;
  padding: 8px 13px;
  border-radius: 16px;
  background: #fbf5ea;
  font-size: 13.5px;
  font-weight: 700;
  box-shadow: 0 3px 0 rgba(18, 50, 74, 0.12), 0 8px 16px -8px rgba(18, 50, 74, 0.3);
}
.dx-quiz-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  list-style: none;
  margin: 14px 0 6px;
  padding: 0;
}
.dx-quiz-dots li {
  width: 30px;
  height: 7px;
  border-radius: 5px;
  background: #efe3cc;
  transition: background 0.3s;
}
.dx-quiz-dots li.done,
.dx-quiz-dots li.on {
  background: #ffbf3c;
}
.dx-quiz-q {
  margin: 6px 0 14px;
  text-align: center;
  font-size: clamp(1.5rem, 4vw, 1.9rem);
}
.dx-quiz-opts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  touch-action: pan-y;
}
.dx-quiz-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 18px 10px 14px;
  border: 0;
  border-radius: 22px;
  background: #fbf5ea;
  color: #12324a;
  font: inherit;
  cursor: pointer;
  box-shadow: 0 5px 0 #ecd6b0, 0 14px 24px -14px rgba(18, 50, 74, 0.4);
  animation: dx-opt-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transition: transform 0.15s, box-shadow 0.15s;
}
.dx-quiz-opt.side-0 {
  --tilt: -3deg;
  background: #e9f5ff;
}
.dx-quiz-opt.side-1 {
  --tilt: 3deg;
  background: #fff1dc;
  animation-delay: 0.08s;
}
@keyframes dx-opt-in {
  from { opacity: 0; transform: translateY(18px) rotate(var(--tilt)) scale(0.9); }
}
.dx-quiz-opt:hover {
  transform: translateY(-3px) rotate(var(--tilt));
  box-shadow: 0 8px 0 #ecd6b0, 0 18px 28px -14px rgba(18, 50, 74, 0.4);
}
.dx-quiz-opt:active {
  transform: translateY(4px);
  box-shadow: 0 1px 0 #ecd6b0;
}
.dx-quiz-opt strong {
  font-family: var(--font-fun);
  font-weight: 400;
  font-size: 1.25rem;
}
.dx-quiz-opt small {
  color: #5a6b78;
  font-size: 12.5px;
  font-weight: 600;
}
.dx-quiz-foot {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 14px 0 0;
  color: #8a99a5;
  font-size: 13px;
}
.dx-quiz-foot .dx-link {
  color: #24407a;
  font-weight: 800;
}
.dx-quiz-swipe {
  margin-left: 6px;
}
.dx-quiz-opt:focus-visible,
.dx-quiz-btn:focus-visible,
.dx-spin:focus-visible,
.dx-ghost:focus-visible,
.dx-sticker:focus-visible,
.dx-quiz-x:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
}
/* spin result: a big rarity card */
.dx-reveal-card {
  position: relative;
  height: 230px;
  margin: 14px 0;
  border-radius: 22px;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  background: linear-gradient(160deg, #24407a, #12324a) center / cover no-repeat;
  color: #fff;
  animation: dx-flip 0.7s cubic-bezier(0.25, 1.2, 0.4, 1) 0.15s both;
}
@keyframes dx-flip {
  from { transform: perspective(800px) rotateY(90deg) scale(0.8); opacity: 0; }
}
.dx-reveal-card {
  cursor: pointer;
}
.dx-reveal-card:hover,
.dx-reveal-card:focus-visible {
  animation: dx-wiggle 0.6s ease-in-out;
}
.dx-reveal-card:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 3px;
}
@keyframes dx-wiggle {
  0%, 100% { transform: rotate(0) scale(1); }
  20% { transform: rotate(-2.5deg) scale(1.02); }
  40% { transform: rotate(2deg) scale(1.02); }
  60% { transform: rotate(-1.5deg) scale(1.02); }
  80% { transform: rotate(1deg) scale(1.01); }
}
.r-rare .dx-reveal-card {
  box-shadow: 0 0 0 3px #8f7dff;
}
.r-legendary .dx-reveal-card {
  box-shadow: 0 0 0 3px #ffbf3c, 0 0 30px rgba(255, 191, 60, 0.5);
}
.dx-reveal-body {
  position: relative;
  z-index: 2;
  padding: 16px;
}
.dx-reveal-name {
  margin: 6px 0 2px;
  font-size: 2.3rem;
  line-height: 1;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
}
.dx-reveal-body p {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 14px;
}
.dx-reveal-btns {
  display: flex;
  gap: 10px;
}
.dx-reveal-btns .dx-cta,
.dx-reveal-btns .dx-ghost {
  flex: 1;
  justify-content: center;
}
.dx-reveal-enter-active {
  transition: opacity 0.25s;
}
.dx-reveal-leave-active {
  transition: opacity 0.2s;
}
.dx-reveal-enter-from,
.dx-reveal-leave-to {
  opacity: 0;
}
/* ---------- Pip zooms across when you pack a city ---------- */
.dx-pip-fly {
  position: fixed;
  left: 0;
  bottom: 110px;
  z-index: 1300;
  pointer-events: none;
  animation: dx-pip-fly 1.8s cubic-bezier(0.45, 0, 0.55, 1) forwards;
}
@keyframes dx-pip-fly {
  0% { transform: translate(-120px, 40px) rotate(-8deg); }
  45% { transform: translate(45vw, -60px) rotate(4deg); }
  100% { transform: translate(calc(100vw + 40px), -10px) rotate(-6deg); }
}

/* ===== City postcards ===== */
/* A cream paper frame with the photo in the top part, tilted a little; it straightens and lifts on hover */
.dx-row {
  gap: 18px;
  padding: 22px 8px 20px; /* room for the stamp and bookmark when a card lifts */
}
.dx-city {
  --ring: 0 0 0 0 transparent;
  position: relative;
  flex: 0 0 224px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  padding: 10px 10px 0;
  border-radius: 20px;
  background: #fffaf0;
  color: #12324a;
  cursor: pointer;
  outline: none;
  transform: rotate(var(--tilt, 0deg));
  box-shadow: var(--ring), inset 0 2px 0 rgba(255, 255, 255, 0.9), 0 5px 0 #e3cfa9, 0 18px 28px -16px rgba(18, 50, 74, 0.55);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s;
}
.dx-city.r-rare {
  --ring: 0 0 0 3px #8f7dff;
}
.dx-city.r-legendary {
  --ring: 0 0 0 3px #ffbf3c, 0 0 22px rgba(255, 191, 60, 0.45);
}
.dx-city:hover,
.dx-city.lit,
.dx-city:focus-visible {
  transform: rotate(0deg) translateY(-8px);
  box-shadow: var(--ring), inset 0 2px 0 rgba(255, 255, 255, 0.9), 0 7px 0 #e3cfa9, 0 28px 34px -16px rgba(18, 50, 74, 0.6);
}
.dx-city:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 4px;
}
.dx-city.deal {
  animation: dx-deal 0.55s cubic-bezier(0.25, 1.2, 0.4, 1) both;
  animation-delay: calc(var(--i, 0) * 70ms);
}
.dx-city.deal.flash {
  animation: dx-flash 1.2s ease;
}
/* the photo, with rounded inner corners */
.dx-photo {
  position: relative;
  height: 150px;
  border-radius: 13px;
  background: linear-gradient(160deg, #24407a, #12324a) center / cover no-repeat;
  box-shadow: inset 0 0 0 1px rgba(18, 50, 74, 0.12);
}
.dx-photo .dx-foil {
  border-radius: inherit;
}
.dx-photo .dx-rarity {
  top: 14px;
  left: 52px; /* beside the heart */
}
/* favourite: a round, tactile heart button in the photo's top-left corner */
.dx-fav {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 4;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1.5px solid rgba(18, 50, 74, 0.12);
  border-radius: 50%;
  background: #fffaf0;
  cursor: pointer;
  box-shadow: 0 3px 0 rgba(18, 50, 74, 0.12), 0 6px 14px -4px rgba(18, 50, 74, 0.45);
  transition: transform 0.15s, box-shadow 0.2s, border-color 0.2s, background 0.2s;
}
.dx-fav svg {
  overflow: visible;
}
.dx-fav path {
  fill: transparent;
  stroke: #12324a;
  transition: fill 0.2s, stroke 0.2s;
}
.dx-fav:hover {
  transform: scale(1.08);
}
.dx-fav:hover path {
  stroke: #ff5a6e;
}
.dx-fav:active {
  transform: scale(0.92);
}
/* saved: coral heart, warm border and glow */
.dx-fav.on {
  border-color: #ff8a98;
  background: #fff1f2;
  box-shadow: 0 3px 0 rgba(255, 90, 110, 0.25), 0 0 0 3px rgba(255, 90, 110, 0.18), 0 6px 16px -4px rgba(255, 90, 110, 0.6);
}
.dx-fav.on path {
  fill: #ff5a6e;
  stroke: #e0405a;
}
/* tapped: squash, stretch, settle */
.dx-fav.pop {
  animation: dx-fav-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes dx-fav-pop {
  0% { transform: scale(1); }
  30% { transform: scale(1.25, 0.85); }
  55% { transform: scale(0.9, 1.15); }
  75% { transform: scale(1.06, 0.96); }
  100% { transform: scale(1); }
}
.dx-fav:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 2px;
}
/* the match grade: a serrated postage stamp with a wavy postmark */
.dx-poststamp {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 4;
  padding: 3px;
  border: 0;
  background: radial-gradient(circle, transparent 1.7px, #fffaf0 2.1px) -3.5px -3.5px / 7px 7px;
  cursor: pointer;
  filter: drop-shadow(0 3px 3px rgba(18, 50, 74, 0.35));
  transform: rotate(5deg);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dx-poststamp:hover,
.dx-poststamp[aria-expanded="true"] {
  transform: rotate(0deg) scale(1.08);
}
.dx-poststamp:focus-visible {
  outline: 3px solid #19b3c4;
  outline-offset: 2px;
}
.dx-poststamp-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 39px;
  height: 44px;
  background: #dde6ec;
  border: 1.5px solid rgba(18, 50, 74, 0.25);
  color: #12324a;
  line-height: 1;
}
.dx-poststamp-face strong {
  font-family: var(--font-fun);
  font-weight: 400;
  font-size: 1.4rem;
}
.dx-poststamp-face small {
  margin-top: 1px;
  font-size: 9.5px;
  font-weight: 900;
}
.dx-poststamp.g-S .dx-poststamp-face {
  background: linear-gradient(135deg, #ffe08a, #ffbf3c 55%, #ff9d4d);
}
.dx-poststamp.g-A .dx-poststamp-face {
  background: #8fcbff;
}
.dx-poststamp.g-B .dx-poststamp-face {
  background: #b9ebc8;
}
.dx-postmark {
  position: absolute;
  left: -10px;
  bottom: -6px;
  width: 38px;
  height: 18px;
  color: rgba(36, 64, 122, 0.7);
  transform: rotate(-10deg);
  pointer-events: none;
}
/* souvenir stickers over the photo's bottom edge */
.dx-photo .dx-tags {
  display: none; /* (stickers now sit under the city name) */
}
/* stickers under the name: compact rounded pills */
.dx-city .dx-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 12px;
}
.dx-city .dx-sticker.sm {
  border-radius: 999px;
  padding: 2px 8px 2px 6px;
  box-shadow: 0 2px 4px rgba(18, 50, 74, 0.18);
}
/* bottom strip: when to go on the left, price on the right */
.dx-card-foot {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dx-sticker.sm.v-pillar { background: #ffe3a1; }
.dx-sticker.sm.v-mountain { background: #c9f0d6; }
.dx-sticker.sm.v-bowl { background: #ffd3d6; }
.dx-sticker.sm.v-lounger { background: #d9e9ff; }
.dx-sticker.sm.hit {
  box-shadow: 0 0 0 2px #12324a, 0 3px 6px rgba(0, 0, 0, 0.3); /* matches your vibe */
}
/* the open bottom margin */
.dx-city-body {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 14px 4px 12px;
}
.dx-city-name {
  margin: 0 0 8px;
  font-size: 1.55rem;
  line-height: 1.05;
  color: #12324a;
}
.dx-season {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 4px 9px 4px 6px;
  border-radius: 999px;
  background: #f1e7d5;
  font-size: 11.5px;
  font-weight: 800;
  color: #5a6b78;
  white-space: nowrap;
}
.dx-season.good {
  background: #d7f2f4;
  color: #0f6e7b;
}
/* the price: a punched luggage tag tucked into the corner */
.dx-luggage {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  padding: 4px 8px 4px 18px;
  background: #ffbf3c;
  color: #12324a;
  font-size: 13px;
  font-weight: 900;
  clip-path: polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%);
  transform: rotate(-5deg);
}
.dx-luggage small {
  font-size: 9.5px;
  font-weight: 800;
  color: rgba(18, 50, 74, 0.7);
}
.dx-luggage::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 50%;
  width: 6px;
  height: 6px;
  margin-top: -3px;
  border-radius: 50%;
  background: #fffaf0;
  box-shadow: inset 0 0 0 1.5px rgba(18, 50, 74, 0.45);
}
.dx-city .dx-why {
  z-index: 6;
}

@media (max-width: 960px) {
  .dx-split { grid-template-columns: minmax(0, 1fr); } /* minmax: the swipe rows mustn't stretch the page sideways */
  .dx-mapcol { position: relative; top: 0; order: -1; }
  .dx-mapwrap { height: 340px; min-height: 0; }
  /* Narrow screens: "Expand map" makes the map tall (the list hides) */
  .map-only .dx-mapwrap { height: calc(100vh - 140px); min-height: 360px; }
  .dx-widen { top: 12px; } /* (the filters don't stay at the top here) */
  .dx-conts { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; padding: 6px 2px 8px; }
  .dx-conts::-webkit-scrollbar { display: none; }
  .dx-cont { flex: none; }
  .dx-top { position: relative; z-index: 25; } /* not sticky, but search suggestions still sit above the map */
  .dx-feed, .dx-country { scroll-margin-top: 16px; } /* the header scrolls away here */
  .dx-tray { flex-wrap: wrap; height: auto; padding: 10px 12px 12px; row-gap: 6px; } /* suitcase + chips on one row, the button below */
  .dx-cta { width: 100%; }
  .dx-spin { padding: 10px; border-radius: 50%; } /* a round icon button, so it clears "Expand map" */
  .dx-spin-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .dx.has-tray { padding-bottom: 170px; } /* the tray is taller once its button wraps */
  .dx-search { flex-basis: 100%; }
}
/* Small phones: dates share one row, a shorter map, a slimmer tray */
@media (max-width: 420px) {
  .dx-top { padding: 12px; border-radius: 22px; }
  .dx-logbook { flex: 1 1 100%; }
  .dx-logpage { flex: 1; min-width: 0; }
  .dx-logpage input { width: 100%; font-size: 13px; }
  .dx-scout-bubble { font-size: 12.5px; }
  .dx-coin { width: 40px; height: 40px; font-size: 12px; }
  .dx-top .dx-quiz-btn { flex: 1; justify-content: center; padding: 11px 12px; }
  .dx-mapwrap { height: 280px; }
  .dx-tray { bottom: 10px; width: calc(100% - 20px); padding: 8px 10px 10px; gap: 8px; }
  .dx-case-meta { min-width: 0; }
  .dx-case-meta small { display: none; }
  .dx-cta { padding: 9px 14px; font-size: 14px; }
  .dx-city { flex-basis: 200px; }
}
@media (prefers-reduced-motion: reduce) {
  .dx-city, .dx-heart, .dx-cta, .dx-vibe { transition: none; }
  .dx-city.flash, .dx-heart.on, .dx-fav.pop, .dx-chip, .dx-city.deal, .dx-xp-bar span, .dx-case.bump, .dx-case-sock, .dx-case-stickers, .dx-tray:hover .dx-case.load-stuffed, .dx-quiz, .dx-reveal, .dx-reveal-card, .dx-quiz-opt, .dx-spinning { animation: none; }
  .dx-foil { display: none; }
  .dx-scout-pip, .dx-scout-pip.hop, .dx-coin.flip, .dx-cont.on { animation: none; }
  .dx-shuffle-move { transition: none; }
}
</style>

<!-- Things added outside this component (page background, the flying tag, MapLibre controls) -->
<style>
body.dx-body {
  background: radial-gradient(900px 420px at 70% -120px, rgba(237, 174, 73, 0.1), transparent 70%), #001d2c fixed;
  background-color: #001d2c;
}
.dx-fly {
  position: fixed;
  z-index: 2000;
  pointer-events: none;
  padding: 5px 12px;
  border-radius: 6px 12px 12px 6px;
  background: #fffaf0;
  color: #12324a;
  font-weight: 800;
  font-size: 13px;
  white-space: nowrap;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}
.dx-mapwrap .maplibregl-ctrl-group {
  background: rgba(10, 53, 80, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.16);
}
.dx-mapwrap .maplibregl-ctrl-group button + button {
  border-top-color: rgba(255, 255, 255, 0.16);
}
.dx-mapwrap .maplibregl-ctrl-icon {
  filter: invert(1);
}
</style>
