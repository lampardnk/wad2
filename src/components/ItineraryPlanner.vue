<template>
  <section class="ip" aria-label="Itinerary planner">
    <!-- ===== Day navigator =====
         Where you are ("Day 8 of 15"), ‹ › to step, a scrolling strip that keeps the open day in view
         (faded edges = more days that way), "All days" grid to jump anywhere, and Add/Remove that never scroll away. -->
    <div class="ip-daynav">
      <div class="ip-daynav-top">
        <p class="ip-daynav-where" aria-live="polite">
          <template v-if="dayList.length && dayShown"><strong>Day {{ dayIndex + 1 }}</strong> of {{ dayList.length }} · {{ longDate(dayShown) }}</template>
          <template v-else>No days yet</template>
        </p>
        <div class="ip-daynav-actions">
          <div class="ip-allwrap">
            <button type="button" class="ip-small" :aria-expanded="gridOpen" aria-haspopup="dialog" @click.stop="gridOpen = !gridOpen">
              <span aria-hidden="true">▦</span> All days
            </button>
            <!-- Grid of every day: jump straight to one -->
            <div v-if="gridOpen" class="ip-grid" role="dialog" aria-label="All days" @click.stop @keydown.esc="gridOpen = false">
              <p class="ip-grid-key"><span class="ip-load"><i style="width: 60%"></i></span> how full · <i class="ip-flag inline"></i> something to check</p>
              <button v-for="(d, n) in dayList" :key="d" type="button" class="ip-grid-day" :class="{ on: d === dayShown, today: isTodayDate(d) }"
                :aria-current="d === dayShown ? 'date' : null" @click="pickDay(d); gridOpen = false">
                <strong>{{ n + 1 }}</strong>
                <span>{{ weekday(d) }} {{ dayOfMonth(d) }}</span>
                <small>{{ countFor(d) ? countFor(d) + ' stop' + (countFor(d) === 1 ? '' : 's') : '—' }}</small>
                <span class="ip-load" :title="loadText(d)"><i :class="{ over: loadOf(d) > 1 }" :style="{ width: Math.min(100, loadOf(d) * 100) + '%' }"></i></span>
                <i v-if="issuesOn(d)" class="ip-flag" :aria-label="issuesOn(d) + ' to check'"></i>
              </button>
            </div>
          </div>
          <button v-if="sampleMode || canAddDay" type="button" class="ip-small add" title="Add a day at the end of the trip" @click="askAddDay">+ Add day</button>
          <button v-if="(sampleMode || canAddDay) && dayList.length > 1" type="button" class="ip-small remove"
            :title="'Remove the last day (Day ' + dayList.length + ')'" :aria-label="'Remove the last day, Day ' + dayList.length" @click="askRemoveDay">− Day {{ dayList.length }}</button>
        </div>
      </div>

      <div class="ip-strip-row">
        <button type="button" class="ip-arrow" :disabled="dayIndex <= 0" aria-label="Previous day" @click="stepDay(-1)">‹</button>
        <div class="ip-strip-wrap" :class="{ 'fade-l': fadeL, 'fade-r': fadeR }">
          <div ref="stripEl" class="ip-days" role="tablist" aria-label="Trip days" @scroll.passive="updateFades" @keydown="onDayKey">
            <button v-for="(d, n) in dayList" :key="d" :ref="(el) => { if (el) dayEls[d] = el }" type="button" role="tab" class="ip-day"
              :class="{ on: d === dayShown, today: isTodayDate(d), weekend: isWeekend(d), flagged: issuesOn(d) }" :aria-selected="d === dayShown"
              :tabindex="d === dayShown ? 0 : -1" :title="longDate(d) + (countFor(d) ? ' · ' + countFor(d) + ' stops' : ' · nothing planned') + (issuesOn(d) ? ' · ' + issuesOn(d) + ' to check' : '')"
              @click="pickDay(d)">
              <small>{{ weekday(d) }}</small>
              <strong>{{ dayOfMonth(d) }}</strong>
              <span class="ip-day-n">Day {{ n + 1 }}</span>
              <span class="ip-day-dots" aria-hidden="true">
                <i v-for="k in Math.min(countFor(d), 4)" :key="k"></i>
              </span>
            </button>
          </div>
        </div>
        <button type="button" class="ip-arrow" :disabled="dayIndex >= dayList.length - 1" aria-label="Next day" @click="stepDay(1)">›</button>
      </div>
    </div>

    <!-- Confirm before adding or removing a day (says exactly what will happen) -->
    <transition name="ip-fade">
      <div v-if="confirm" class="ip-overlay" @click.self="confirm = null" @keydown.esc="confirm = null">
        <div ref="dialogEl" class="ip-dialog" role="alertdialog" aria-modal="true" aria-labelledby="ip-dialog-title" :aria-describedby="confirm.lines.length ? 'ip-dialog-body' : null" tabindex="-1">
          <span class="ip-dialog-icon" :class="{ danger: confirm.danger }" aria-hidden="true"><AppIcon :name="confirm.danger ? 'trash' : confirm.kind === 'city' ? 'compass' : confirm.kind === 'full' ? 'clock' : 'calendar'" :size="22" /></span>
          <h3 id="ip-dialog-title" class="ip-dialog-title">{{ confirm.title }}</h3>
          <ul v-if="confirm.lines.length" id="ip-dialog-body" class="ip-dialog-list">
            <li v-for="(line, k) in confirm.lines" :key="k">{{ line }}</li>
          </ul>
          <div class="ip-dialog-btns">
            <button type="button" class="ip-outline" @click="confirm = null">Cancel</button>
            <button v-if="confirm.alt" type="button" class="ip-outline" @click="doConfirmAlt">{{ confirm.alt }}</button>
            <button ref="confirmBtn" type="button" class="ip-cta" :class="{ danger: confirm.danger }" @click="doConfirm">{{ confirm.button }}</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Done message with Undo -->
    <transition name="ip-fade">
      <div v-if="toast" class="ip-toast" role="status">
        <span>{{ toast.text }}</span>
        <button v-if="toast.undo" type="button" class="ip-toast-undo" @click="runUndo">Undo</button>
        <button type="button" class="ip-toast-x" aria-label="Close" @click="toast = null"><AppIcon name="x" :size="16" /></button>
      </div>
    </transition>

    <!-- ===== Actions ===== -->
    <div class="ip-bar">
      <button type="button" class="ip-cta" :class="{ busy: phase }" :disabled="!!phase || stopRows.length < 2" @click="optimize" data-testid="optimize-route">
        <span v-if="phase" class="ip-spin" aria-hidden="true"></span><AppIcon v-else name="sparkles" :size="16" />
        {{ phaseText }}
      </button>
      <span class="ip-totals" title="Getting between today's stops">
        <span><AppIcon name="footprints" :size="15" /> {{ totals.walkKm }} km</span>
        <span title="Minutes on transit, in taxis or on bikes"><AppIcon name="train" :size="15" /> {{ totals.transitMin }} min</span>
      </span>
      <!-- Only shows up when something on this day needs a look -->
      <div v-if="issues.length" class="ip-issues-wrap">
        <button type="button" class="ip-issues-btn" :aria-expanded="issuesOpen" aria-haspopup="dialog" @click.stop="issuesOpen = !issuesOpen">
          <AppIcon name="alert" :size="15" /> {{ issues.length }} to check
        </button>
        <div v-if="issuesOpen" class="ip-issues" role="dialog" aria-label="Things to check" @click.stop @keydown.esc="issuesOpen = false">
          <p class="ip-issues-title">Things to check on Day {{ dayIndex + 1 }}</p>
          <ul>
            <li v-for="x in issues" :key="x.key">
              <span class="ip-issue-icon" aria-hidden="true"><AppIcon v-if="lineIcon(x.icon)" :name="lineIcon(x.icon)" :size="15" /><template v-else>{{ x.icon }}</template></span>
              <button type="button" class="ip-issue-text" :title="'Open ' + x.it.stop.name" @click="openSheet(x.it, x.section)">
                <strong>{{ x.it.stop.name }}</strong>
                <small>{{ x.text }}</small>
              </button>
              <button type="button" class="ip-issue-fix" @click="x.fix">{{ x.fixLabel }}</button>
            </li>
          </ul>
          <button v-if="stopRows.length > 1" type="button" class="ip-outline small ip-issues-all" @click="issuesOpen = false; optimize()"><AppIcon name="sparkles" :size="15" /> Let Optimize Route sort these out</button>
        </div>
      </div>
      <!-- List or map of this day's stops (the sliding highlight shows which one you're on) -->
      <div class="ip-views" :class="{ right: view === 'map' }" role="group" aria-label="Show this day as">
        <span class="ip-views-thumb" aria-hidden="true"></span>
        <button type="button" :class="{ on: view === 'list' }" :aria-pressed="view === 'list'" title="See the day as a timeline" @click="view = 'list'">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
            <path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" />
          </svg>
          List
        </button>
        <button type="button" :class="{ on: view === 'map' }" :aria-pressed="view === 'map'" title="See the day's stops on a map" @click="view = 'map'">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14.1 5.6a2 2 0 0 0 1.8 0l3.6-1.8A1 1 0 0 1 21 4.6v12.8a1 1 0 0 1-.6.9l-4.5 2.3a2 2 0 0 1-1.8 0l-4.2-2.1a2 2 0 0 0-1.8 0l-3.6 1.8A1 1 0 0 1 3 19.4V6.6a1 1 0 0 1 .6-.9l4.5-2.3a2 2 0 0 1 1.8 0z" /><path d="M15 5.8v15M9 3.2v15" />
          </svg>
          Map
        </button>
      </div>
    </div>
    <p v-if="sampleMode" class="ip-sample">Sample Kyoto day · not saved · <button type="button" class="ip-link" @click="leaveSample">Back to my trip</button></p>
    <p class="visually-hidden" role="status" aria-live="polite">{{ phase ? phaseText : liveText }}</p>

    <!-- ===== Optimize preview ===== -->
    <transition name="ip-pop">
      <div v-if="preview" class="ip-preview" :class="{ same: !preview.better }">
        <p class="mb-0 fw-semibold">
          {{
            preview.better
              ? preview.summary
              : preview.hasWarnings
                ? 'No better route found, but this day still has warnings.'
                : 'Your day is already in a good order.'
          }}
        </p>
        <div class="ip-preview-btns">
          <button v-if="preview.better" type="button" class="ip-cta small" @click="applyPreview">Apply</button>
          <button type="button" class="ip-outline small" @click="preview = null">{{ preview.better ? 'Dismiss' : 'OK' }}</button>
        </div>
      </div>
    </transition>

    <div class="ip-body" :class="{ 'drawer-closed': !drawerOpen }">
      <div class="ip-main">
        <!-- ===== List: numbered timeline ===== -->
        <template v-if="view === 'list'">
          <!-- An empty day: say what to do, and the two ways to do it -->
          <div v-if="!stopRows.length" class="ip-start">
            <span class="ip-start-icon" aria-hidden="true"><AppIcon name="map-pin" :size="20" /></span>
            <div class="ip-start-text">
              <strong>Nothing planned for Day {{ dayIndex + 1 }} yet</strong>
              <small v-if="picks.length">Add one of your saved places, or find new ones to visit.</small>
              <small v-else>Find places to visit and save them. Then add them to this day.</small>
            </div>
            <div class="ip-start-btns">
              <button v-if="picks.length" type="button" class="ip-cta small" @click="showSaved">
                Choose from {{ picks.length }} saved place{{ picks.length === 1 ? '' : 's' }}
              </button>
              <button type="button" :class="picks.length ? 'ip-outline small' : 'ip-cta small'" @click="addPlace">Find new places</button>
            </div>
          </div>

          <p v-if="stopRows.length > 1 && !previewing" class="ip-reorder-hint">
            <AppIcon name="swap" :size="14" /> Drag a stop by its dots, or use the arrows, to change the order. Times update by themselves.
          </p>
          <!-- More planned than the day has time for: say so once, with a fix -->
          <div v-if="overflow" class="ip-overflow" role="status">
            <span class="ip-overflow-icon" aria-hidden="true"><AppIcon name="clock" :size="18" /></span>
            <span class="ip-overflow-text">
              <strong>Day {{ dayIndex + 1 }} is too full</strong>
              <small>{{ dayEndReason }}. {{ overflow.count }} stop{{ overflow.count === 1 ? '' : 's' }} won't fit.</small>
            </span>
            <button type="button" class="ip-cta small" @click="overflowOpen = true">Choose where they go</button>
          </div>
          <ol class="ip-list" :class="{ dragging: !!drag }">
            <!-- Where the day starts: your hotel, or the airport on the day you land -->
            <li v-if="!sampleMode" class="ip-anchor-row start">
              <!-- Day 1: landing comes first, so the flight goes above the hotel -->
              <button v-if="dayIndex === 0 && !arrivalToday" type="button" class="ip-flight-card" @click="editAnchor('arrive')">
                <span class="ip-flight-icon" aria-hidden="true"><AppIcon name="plane" :size="18" /></span>
                <span class="ip-anchor-text">
                  <strong>Landing today?</strong>
                  <small>Add your flight and the day starts after you land</small>
                </span>
                <span class="ip-flight-btn">Add flight</span>
              </button>
              <button type="button" class="ip-anchor" :class="{ empty: !startAnchor }" @click="editAnchor('start')">
                <span class="ip-anchor-icon" aria-hidden="true"><AppIcon :name="startAnchor && startAnchor.kind === 'arrive' ? 'plane' : 'door'" :size="16" /></span>
                <span class="ip-anchor-text">
                  <small>{{ startCaption }}</small>
                  <strong>{{ startAnchor ? startAnchor.name : 'Add where you\'re staying' }}</strong>
                </span>
                <span class="ip-anchor-edit">{{ startAnchor ? 'Change' : 'Add' }}</span>
              </button>
              <button v-if="startLeg" type="button" class="ip-leg clickable" :aria-label="'Getting to ' + stopRows[0].stop.name + ': ' + anchorLegText(startLeg)" @click="openAnchorLeg('start')">
                <AppIcon :name="modeIcon(startLeg.mode)" :size="13" /> {{ anchorLegText(startLeg) }}<AppIcon name="chevron" :size="12" class="ip-leg-go" />
              </button>
            </li>
            <template v-for="(it, i) in timeline" :key="it.stop.id">
              <!-- Between stops: how to get there, or a drop slot while dragging -->
              <li class="ip-gap" :class="{ active: dropAt === i, first: i === 0 }"
                @dragover.prevent="dropAt = i" @dragleave="dropAt = null" @drop.prevent="dropInto(slotOf(i))">
                <span v-if="drag" class="ip-drop">Drop here</span>
                <!-- How to get here: the suggested (or the group's chosen) way. Tap to see every way and change it. -->
                <button v-else-if="i > 0 && legText(it)" type="button" class="ip-leg" :class="{ picked: legEntry(it).picked, clickable: it.mode !== 'unknown' }"
                  :disabled="it.mode === 'unknown'" :aria-label="'Getting to ' + it.stop.name + ': ' + legText(it) + (it.mode !== 'unknown' ? '. See other ways' : '')"
                  @click="openLeg(it)">
                  <AppIcon :name="legIcon(it)" :size="13" /> {{ legText(it) }}<span v-if="legNote(it)" class="ip-leg-why">· {{ legNote(it) }}</span>
                  <AppIcon v-if="it.mode !== 'unknown'" name="chevron" :size="12" class="ip-leg-go" />
                </button>
              </li>

              <!-- Lunch / dinner break (kept free when no meal is planned) -->
              <li v-if="it.stop.virtual" class="ip-stop ip-meal-row">
                <span class="ip-num meal" aria-hidden="true">{{ it.stop.icon }}</span>
                <div class="ip-meal">
                  <span class="ip-when">{{ formatHour(it.start) }} <small>· {{ durationText(it.stop.duration) }}</small></span>
                  <strong class="ip-meal-name">{{ it.stop.name }}</strong>
                  <button type="button" class="ip-link" @click="openEat(it, i)">Find somewhere to eat</button>
                </div>
              </li>

              <li v-else class="ip-stop" :class="{ moving: drag && drag.item.id === it.stop.id, 'menu-open': durFor === it.stop.id }">
                <span class="ip-num" :style="{ background: numberColor(numberOf(it)) }" aria-hidden="true">{{ numberOf(it) + 1 }}</span>

                <article class="ip-card" :class="{ locked: it.stop.locked, moved: wasAt(it) !== null, 'rain-warning-card': isRainAffected(it) }"
                  :draggable="!it.stop.locked && !previewing" @dragstart="startDrag($event, 'stop', it.stop)" @dragend="endDrag"
                  @dragover.prevent="overCard($event, i)" @drop.prevent="dropInto(slotOf(dropAt == null ? i : dropAt))">
                  <!-- Move: drag the dots, or tap the arrows (works on phones and keyboards too) -->
                  <div v-if="!it.stop.locked && !previewing" class="ip-move">
                    <button type="button" class="ip-move-btn" :disabled="numberOf(it) === 0"
                      :aria-label="'Move ' + it.stop.name + ' earlier'" title="Move earlier" @click="moveStop(numberOf(it), numberOf(it) - 1)">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
                    </button>
                    <span class="ip-handle" title="Drag to move" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
                    </span>
                    <button type="button" class="ip-move-btn" :disabled="numberOf(it) === stopRows.length - 1"
                      :aria-label="'Move ' + it.stop.name + ' later'" title="Move later" @click="moveStop(numberOf(it), numberOf(it) + 1)">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                  </div>
                  <span v-else-if="it.stop.locked" class="ip-move ip-move-locked" title="Locked to its time: unlock to move it" aria-hidden="true">
                    <AppIcon name="lock" :size="14" />
                  </span>

                  <div class="ip-thumb" :class="'cat-' + categoryOf(it.stop).key" :style="thumbStyle(it.stop)" aria-hidden="true">
                    <span v-if="!photos[photoKey(it.stop)]">{{ categoryOf(it.stop).icon }}</span>
                  </div>

                  <div class="ip-info">
                    <span class="ip-when">
                      {{ formatHour(it.start) }}
                      <!-- Tap the duration to change it; the rest of the day re-times -->
                      <span class="ip-dur-wrap">
                        <button type="button" class="ip-dur" :disabled="previewing" :aria-expanded="durFor === it.stop.id"
                          :aria-label="'How long at ' + it.stop.name + ': ' + durationText(it.stop.duration) + '. Change'"
                          title="Change how long you stay" @click.stop="toggleDur(it.stop.id)">
                          <AppIcon name="clock" :size="13" /> {{ durationText(it.stop.duration) }} <span aria-hidden="true">▾</span>
                        </button>
                        <span v-if="durFor === it.stop.id" class="ip-dur-menu" role="dialog" :aria-label="'Time at ' + it.stop.name" @click.stop @keydown.esc="durFor = null">
                          <span class="ip-dur-step">
                            <button type="button" aria-label="15 minutes less" :disabled="(it.stop.duration || 1) <= 0.25" @click="setDuration(it.stop, (it.stop.duration || 1) - 0.25)">−</button>
                            <strong>{{ durationText(it.stop.duration) }}</strong>
                            <button type="button" aria-label="15 minutes more" @click="setDuration(it.stop, (it.stop.duration || 1) + 0.25)">+</button>
                          </span>
                          <span class="ip-dur-picks">
                            <button v-for="h in DURATION_PICKS" :key="h.value" type="button" :class="{ on: Math.abs((it.stop.duration || 1) - h.value) < 0.01 }"
                              @click="setDuration(it.stop, h.value); durFor = null">{{ h.label }}</button>
                          </span>
                        </span>
                      </span>
                      <small v-if="wasAt(it) !== null" class="ip-was">was {{ formatHour(wasAt(it)) }}</small>
                    </span>
                    <h4 class="ip-name">{{ it.stop.name }}</h4>
                    <p v-if="it.stop.kind === 'flight' && it.stop.flight" class="ip-flight-times">
                      <AppIcon name="plane" :size="13" /> Takes off {{ formatHour(hourOf(it.stop.flight.dep)) }} · lands {{ formatHour(hourOf(it.stop.flight.arr)) }}<template v-if="it.stop.flight.number"> · {{ it.stop.flight.number }}</template>
                      · be at the airport {{ it.stop.flight.intl ? '2.5 h' : '1.5 h' }} before
                    </p>
                    <div class="ip-chips">
                      <span v-if="live && live.id === it.stop.id" class="ip-live-badge" :class="live.state">{{ live.state === 'now' ? '● Now' : 'Up next' }}</span>
                      <span class="ip-chip">{{ categoryOf(it.stop).label }}</span>
                      <!-- Weather and crowds at this stop's time: tap for the details and options -->
                      <template v-if="!previewing">
                        <button type="button" class="ip-sig" :class="weatherOf(it).tone" :title="weatherOf(it).title"
                          :aria-label="'Weather at ' + it.stop.name + ': ' + weatherOf(it).title" @click="openSheet(it, 'weather')">
                          <span aria-hidden="true">{{ weatherOf(it).icon }}</span> {{ weatherOf(it).text }}
                        </button>
                        <button type="button" class="ip-sig" :class="crowdOf(it).tone" :title="crowdOf(it).title"
                          :aria-label="'Crowds at ' + it.stop.name + ': ' + crowdOf(it).title" @click="openSheet(it, 'crowd')">
                          <AppIcon name="users" :size="14" /> {{ crowdOf(it).text }}
                        </button>
                        <!-- Notes the crew left on this stop -->
                        <button v-if="!sampleMode" type="button" class="ip-sig" :aria-label="'Notes on ' + it.stop.name" @click="openSheet(it, 'notes')">
                          <AppIcon name="message" :size="14" /> Notes
                        </button>
                      </template>
                      <span v-for="(p, k) in cardPills(it)" :key="k" class="ip-pill" :class="p.kind"><AppIcon v-if="lineIcon(p.icon)" :name="lineIcon(p.icon)" :size="13" /><template v-else>{{ p.icon }}</template> {{ p.text }}</span>
                    </div>

                    <!-- On the day: finish early or stay longer, and the rest of the day follows -->
                    <div v-if="live && live.id === it.stop.id && live.state === 'now' && !previewing" class="ip-live">
                      <button type="button" class="ip-live-btn done" @click="finishNow(it)"><AppIcon name="check" :size="15" /> I'm done</button>
                      <button type="button" class="ip-live-btn" @click="stayLonger(it)">+15 min</button>
                    </div>
                  </div>

                  <div class="ip-side">
                    <!-- Red circled ✕ = remove from this day (it goes back to Saved places, not deleted) -->
                    <button type="button" class="ip-back" :disabled="previewing" :aria-label="'Remove ' + it.stop.name + ' from this day (back to saved places)'"
                      title="Remove from this day (back to Saved places)" @click="unschedule(it.stop)">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#d1495b" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9.5" /><path d="M9 9l6 6M15 9l-6 6" />
                      </svg>
                    </button>
                    <button v-if="it.stop.kind !== 'flight'" type="button" class="ip-lock" :class="{ on: it.stop.locked }" :aria-pressed="it.stop.locked" :disabled="previewing"
                      :aria-label="(it.stop.locked ? 'Unlock ' : 'Lock ') + it.stop.name" :title="it.stop.locked ? 'Fixed time (reservation)' : 'Lock this time'"
                      @click="toggleLock(it.stop)"><AppIcon :name="it.stop.locked ? 'lock' : 'unlock'" :size="17" /></button>
                    <button type="button" class="ip-go" :aria-label="'Show ' + it.stop.name + ' on the map'" title="Show on map" @click="openOnMap(it.stop)">
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    </button>
                  </div>
                </article>
              </li>
            </template>
            <li class="ip-gap end" :class="{ active: dropAt === timeline.length, show: drag }"
              @dragover.prevent="dropAt = timeline.length" @dragleave="dropAt = null" @drop.prevent="dropInto(stopRows.length)">
              <span v-if="drag" class="ip-drop">Drop here</span>
            </li>
            <!-- Where the day ends: back to the hotel, or the airport on the day you fly home -->
            <li v-if="!sampleMode && stopRows.length" class="ip-anchor-row end">
              <button v-if="endLeg" type="button" class="ip-leg clickable" :aria-label="'Getting to ' + endAnchor.name + ': ' + anchorLegText(endLeg)" @click="openAnchorLeg('end')">
                <AppIcon :name="modeIcon(endLeg.mode)" :size="13" /> {{ anchorLegText(endLeg) }}<AppIcon name="chevron" :size="12" class="ip-leg-go" />
              </button>
              <!-- Last day, nothing set yet: one question, two answers (the flight home first: most people fly out) -->
              <div v-if="isLastDay && !endAnchor" class="ip-end-choice" role="group" aria-labelledby="ip-end-q">
                <p id="ip-end-q" class="ip-end-q">Where does the day end?</p>
                <div class="ip-end-options">
                  <button type="button" class="ip-end-option main" @click="editAnchor('depart')">
                    <span class="ip-flight-icon" aria-hidden="true"><AppIcon name="plane" :size="18" /></span>
                    <span class="ip-anchor-text">
                      <strong>Flight home</strong>
                      <small>The day ends in time to get to the airport</small>
                    </span>
                  </button>
                  <button type="button" class="ip-end-option" @click="editAnchor('end')">
                    <span class="ip-anchor-icon" aria-hidden="true"><AppIcon name="door" :size="16" /></span>
                    <span class="ip-anchor-text">
                      <strong>Back to the hotel</strong>
                      <small>Staying on, or flying out another day</small>
                    </span>
                  </button>
                </div>
              </div>
              <template v-else>
                <button type="button" class="ip-anchor" :class="{ empty: !endAnchor }" @click="editAnchor('end')">
                  <span class="ip-anchor-icon" aria-hidden="true"><AppIcon :name="endAnchor && endAnchor.kind === 'depart' ? 'plane' : 'door'" :size="16" /></span>
                  <span class="ip-anchor-text">
                    <small>{{ endCaption }}</small>
                    <strong>{{ endAnchor ? endAnchor.name : 'Add where you\'re staying' }}</strong>
                  </span>
                  <span class="ip-anchor-edit">{{ endAnchor ? 'Change' : 'Add' }}</span>
                </button>
                <!-- Last day ending at the hotel: switching to the flight home is one tap -->
                <button v-if="isLastDay && endAnchor && endAnchor.kind === 'stay'" type="button" class="ip-end-switch" @click="editAnchor('depart')">
                  <AppIcon name="plane" :size="14" /> Flying home today? Add your flight
                </button>
              </template>
            </li>
          </ol>

          <button v-if="stopRows.length" type="button" class="ip-add-stop" @click="openAddSheet">
            <span aria-hidden="true">⊕</span> Add stop
          </button>

          <!-- ===== Demo: simulate weather conditions ===== -->
          <section v-if="stopRows.length" class="ip-weather-sim">
            <div class="ip-sim-heading">
              <div>
                <h4>Simulate weather conditions</h4>
                <p>Test how the itinerary responds to a change in weather.</p>
              </div>
              <span class="ip-sim-badge">Demo</span>
            </div>

            <div class="ip-sim-fields">
              <div class="ip-sim-field">
                <label for="ip-sim-stop">Itinerary stop</label>
                <CustomDropdown id="ip-sim-stop" v-model="simulationStopId" :options="simStopOptions" block
                  placeholder="Choose a stop" aria-label="Itinerary stop" />
              </div>

              <div class="ip-sim-field">
                <label for="ip-sim-weather">Simulate weather</label>
                <CustomDropdown id="ip-sim-weather" v-model="simulationCondition" :options="SIM_WEATHER" block
                  aria-label="Simulate weather" />
              </div>
            </div>

            <div class="ip-sim-actions">
              <button
                type="button"
                class="ip-sim-button"
                @click="applyWeatherSimulation"
              >
                Simulate weather
              </button>

              <button
                v-if="weatherSimulation"
                type="button"
                class="ip-sim-reset"
                @click="resetWeatherSimulation"
              >
                Reset
              </button>
            </div>

            <div v-if="weatherSimulation" class="ip-sim-active">
              🧪 Simulating
              <strong>{{ weatherSimulation.condition === 'Rain' ? 'rainy' : 'sunny' }}</strong>
              weather at
              <strong>{{ weatherSimulation.stopName }}</strong>.
              <div
                v-if="weatherSimulation?.condition === 'Rain'"
                class="ip-weather-alternatives"
              >
                <div class="ip-alt-heading">
                  <strong>☀️ Try a clearer time</strong>
                  <span>
                    Move this stop to a time without simulated rain.
                  </span>
                </div>

                <div
                  v-if="clearTimeOptions.length > 0"
                  class="ip-alt-options"
                >
                  <!-- The whole card is the button -->
                  <button
                    v-for="option in clearTimeOptions"
                    :key="option.hour"
                    type="button"
                    class="ip-alt-option"
                    :class="{ chosen: weatherMovePreview && weatherMovePreview.toHour === option.hour }"
                    :aria-label="'Preview moving it to ' + formatHour(option.hour) + (option.requiresAdjustment ? ', moves ' + option.conflicts.join(', ') : ', no conflicts')"
                    @click="previewWeatherMove(option)"
                  >
                    <span class="ip-alt-body">
                      <span class="ip-alt-time">
                        {{ formatHour(option.hour) }}
                      </span>

                      <span>
                        ☀️ {{ option.temp }}°
                      </span>

                      <span
                        v-if="option.requiresAdjustment"
                        class="ip-alt-conflict"
                      >
                        ⚠️ Requires itinerary adjustment:
                        {{ option.conflicts.join(', ') }}
                      </span>

                      <span
                        v-else
                        class="ip-alt-clear"
                      >
                        ✓ No itinerary conflicts
                      </span>
                    </span>

                    <span class="ip-preview-btn" aria-hidden="true">
                      Preview →
                    </span>
                  </button>
                </div>

                <div
                  v-else
                  class="ip-alt-empty"
                >
                  No suitable clear time is available today.
                </div>

                <div
                  v-if="weatherMovePreview"
                  class="ip-move-preview"
                >
                  <div class="ip-preview-title">
                    <strong>Proposed itinerary change</strong>
                  </div>

                  <p>
                    Move
                    <strong>{{ weatherMovePreview.stopName }}</strong>
                    from
                    <strong>{{ formatHour(weatherMovePreview.fromHour) }}</strong>
                    to
                    <strong>{{ formatHour(weatherMovePreview.toHour) }}</strong>.
                  </p>

                  <p>
                    ☀️ Expected weather:
                    {{ weatherMovePreview.temp }}°
                  </p>

                  <div
                    v-if="weatherMovePreview.requiresAdjustment"
                    class="ip-preview-warning"
                  >
                    ⚠️ This would affect:
                    <strong>
                      {{ weatherMovePreview.conflicts.join(', ') }}
                    </strong>
                  </div>
                  <div
                    v-if="weatherMovePreview.cascade?.length"
                    class="ip-cascade-preview"
                  >
                    <strong>Suggested adjustments</strong>

                    <div
                      v-for="item in weatherMovePreview.cascade"
                      :key="item.id"
                      class="ip-cascade-item"
                    >
                      <span>
                        {{ item.name }}
                      </span>

                      <span v-if="item.toHour != null">
                        {{ formatHour(item.fromHour) }}
                        →
                        <strong>{{ formatHour(item.toHour) }}</strong>
                      </span>

                      <span
                        v-else
                        class="ip-cascade-unavailable"
                      >
                        No available time found
                      </span>
                    </div>
                  </div>

                  <div
                    v-else
                    class="ip-preview-safe"
                  >
                    ✓ No other itinerary stops need adjustment.
                  </div>

                  <div
                    v-if="
                      weatherMovePreview.requiresAdjustment &&
                      !weatherMovePreview.cascadeFeasible
                    "
                    class="ip-preview-impossible"
                  >
                    ⚠️ <strong>This replan cannot be completed safely.</strong>
                    At least one affected stop has no available time today.
                  </div>

                  <div
                    v-else-if="weatherMovePreview.cascadeFeasible"
                    class="ip-preview-feasible"
                  >
                    ✓ <strong>This replan is feasible.</strong>
                  </div>

                  <div class="ip-preview-actions">
                    <button
                      type="button"
                      class="ip-preview-cancel"
                      @click="weatherMovePreview = null"
                    >
                      Cancel
                    </button>

                    <button
                      v-if="weatherMovePreview.cascadeFeasible"
                      type="button"
                      class="ip-preview-apply"
                      @click="applyWeatherReplan"
                    >
                      Apply changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- demo for crowd status -->
          <section v-if="stopRows.length" class="ip-weather-sim">
            <!-- Heading & Demo Badge -->
            <div class="ip-sim-heading">
              <div>
                <h4>Simulate crowd conditions</h4>
                <p>Test how the itinerary responds to live crowd level changes.</p>
              </div>
              <span class="ip-sim-badge">Demo</span>
            </div>

            <!-- Form Controls -->
            <div class="ip-sim-fields">
              <div class="ip-sim-field">
                <label for="ip-crowd-stop">Itinerary stop</label>
                <CustomDropdown id="ip-crowd-stop" v-model="demoStopId" :options="simStopOptions" block placeholder="Choose a stop" aria-label="Itinerary stop" />
              </div>

              <div class="ip-sim-field">
                <label for="ip-crowd-level">Simulate crowd level</label>
                <CustomDropdown id="ip-crowd-level" v-model="simulationCrowdLevel" :options="SIM_CROWD" block aria-label="Simulate crowd level" />
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="ip-sim-actions">
              <button type="button" class="ip-sim-button" @click="applyCrowdSimulation">
                Simulate crowd
              </button>

              <button v-if="crowdSimulation" type="button" class="ip-sim-reset" @click="resetCrowdSimulation">
                Reset
              </button>
            </div>
          </section>
        </template>

        <!-- ===== Map: numbered pins, the route, and the picked stop ===== -->
        <div v-else class="ip-mapview">
          <div ref="mapEl" class="ip-map" role="region" aria-label="Map of the day"></div>
          <p v-if="mapError" class="ip-empty">{{ mapError }}</p>
          <p v-else-if="unmapped.length" class="ip-muted" role="status">
            Not on the map yet: {{ unmapped.join(', ') }}. We're still looking {{ unmapped.length === 1 ? 'it' : 'them' }} up; adding an address under Details helps.
          </p>

          <article v-if="selected" class="ip-detail">
            <div class="ip-detail-photo" :class="'cat-' + categoryOf(selected.stop).key" :style="thumbStyle(selected.stop)">
              <span class="ip-num sm" :style="{ background: numberColor(selectedIndex) }">{{ selectedIndex + 1 }}</span>
              <span v-if="!photos[photoKey(selected.stop)]" class="ip-detail-icon" aria-hidden="true">{{ categoryOf(selected.stop).icon }}</span>
            </div>
            <div class="ip-detail-info">
              <h4 class="ip-detail-name">{{ selected.stop.name }}</h4>
              <p class="ip-detail-line"><AppIcon name="clock" :size="15" /> {{ formatHour(selected.start) }} – {{ formatHour(selected.start + (selected.stop.duration || 1)) }}</p>
              <p v-if="hoursText(selected.stop)" class="ip-detail-line"><AppIcon name="door" :size="15" /> {{ hoursText(selected.stop) }}</p>
              <span class="ip-chip">{{ categoryOf(selected.stop).label }}</span>
              <div class="ip-detail-btns">
                <button type="button" class="ip-step" :disabled="selectedIndex <= 0" aria-label="Previous stop" @click="stepSelected(-1)">‹</button>
                <a class="ip-directions" :href="directionsUrl(selected.stop)" target="_blank" rel="noopener"><AppIcon name="compass" :size="16" /> Get directions</a>
                <button type="button" class="ip-step" :disabled="selectedIndex >= stopRows.length - 1" aria-label="Next stop" @click="stepSelected(1)">›</button>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- ===== Saved places (unscheduled) ===== -->
      <aside ref="drawerEl" class="ip-drawer" :class="{ target: drag && drag.kind === 'stop', flash: drawerFlash }" @dragover.prevent @drop.prevent="dropOnDrawer">
        <button type="button" class="ip-drawer-head" :aria-expanded="drawerOpen" @click="drawerOpen = !drawerOpen">
          <span class="ip-drawer-icon" aria-hidden="true"><AppIcon name="map-pin" :size="20" /></span>
          <span class="ip-drawer-title">
            <strong>{{ unscheduled.length }} saved place{{ unscheduled.length === 1 ? '' : 's' }}</strong>
            <small v-if="votingOn && unscheduled.length">{{ picks.length }} ready to add · {{ waiting.length }} waiting for votes</small>
            <small v-else>Not on a day yet</small>
          </span>
          <span class="ip-chev" aria-hidden="true">{{ drawerOpen ? '−' : '+' }}</span>
        </button>
        <div v-show="drawerOpen" class="ip-drawer-body">
          <p v-if="drag && drag.kind === 'stop'" class="ip-unschedule">Drop here to unschedule</p>
          <p v-else-if="!unscheduled.length" class="ip-muted">Places you save in Places → Wishlist wait here.</p>
          <!-- Group trips: only places most of the group voted for can go on a day -->
          <p v-else-if="votingOn" class="ip-vote-rule">
            <AppIcon name="thumbs-up" :size="15" />
            <span>Only <strong>group picks</strong> can go on a day: places {{ needed }} of {{ travellers.length }} travellers voted for.</span>
          </p>
          <!-- One group per destination -->
          <p v-if="votingOn && unscheduled.length && !picks.length && !(drag && drag.kind === 'stop')" class="ip-muted">
            No group picks yet. Vote on the places below, and they can be added once {{ needed }} people say yes.
          </p>
          <section v-for="g in savedGroups" :key="g.city" class="ip-group" :aria-label="'Saved in ' + g.label">
            <h5 class="ip-group-head">
              <span aria-hidden="true">{{ g.flag }}</span> {{ g.label }} <span class="ip-group-count">{{ g.items.length }}</span>
            </h5>
            <!-- The whole card adds it to the end of the day (the + does the same, for keyboards) -->
            <div v-for="w in g.items" :key="w.id" class="ip-wish clickable" draggable="true" :title="'Add ' + w.name + ' to the end of the day'"
              @dragstart="startDrag($event, 'wish', w)" @dragend="endDrag" @click="wishClick(w, $event)">
              <div class="ip-thumb sm" :class="'cat-' + categoryOf(w).key" :style="thumbStyle(w)" aria-hidden="true">
                <span v-if="!photos[photoKey(w)]">{{ categoryOf(w).icon }}</span>
              </div>
              <div class="ip-wish-text">
                <span class="ip-wish-name">{{ w.name }}</span>
                <small>{{ categoryOf(w).label }}</small>
              </div>
              <button type="button" class="ip-add" :aria-label="'Add ' + w.name + ' to the end of the day'" title="Add to the end of the day"
                @click="scheduleWish(w, stopRows.length)">+</button>
            </div>
          </section>
          <!-- Not enough votes yet: shown, but can't be added (no drag, no +) -->
          <section v-if="waiting.length && !(drag && drag.kind === 'stop')" class="ip-group ip-waiting" aria-label="Waiting for votes">
            <h5 class="ip-group-head">
              <AppIcon name="clock" :size="13" /> Waiting for votes <span class="ip-group-count">{{ waiting.length }}</span>
            </h5>
            <div v-for="w in waiting" :key="w.id" class="ip-wish waiting">
              <div class="ip-thumb sm" :class="'cat-' + categoryOf(w).key" :style="thumbStyle(w)" aria-hidden="true">
                <span v-if="!photos[photoKey(w)]">{{ categoryOf(w).icon }}</span>
              </div>
              <div class="ip-wish-text">
                <span class="ip-wish-name">{{ w.name }}</span>
                <small>{{ (w.votes || []).length }} of {{ needed }} votes needed</small>
              </div>
              <button type="button" class="ip-vote" :aria-label="'Vote on ' + w.name + ' in Group decisions'" @click="emit('go-vote')">Vote</button>
            </div>
          </section>
        </div>
      </aside>
    </div>
    <!-- Places to eat for a lunch/dinner break -->
    <EatDrawer :open="!!eat" :context="eat || {}" @close="eat = null" @add="addMeal" />
    <StopSheet :open="!!sheetItem" :stop="sheetStop || {}" :start="sheetItem ? sheetItem.start : 0"
      :duration="sheetItem ? sheetItem.stop.duration || 1 : 1" :section="sheet ? sheet.section : 'crowd'"
      :day-name="dayNameShown" :day-label="'Day ' + (dayIndex + 1) + ' · ' + longDate(dayShown)" :selected-date="dayShown"
      :day-options="dayOptions" :weather="dayBlocks" :typical="typical" :crowd="sheetItem ? crowdOf(sheetItem) : {}"
      :wet="sheetItem ? weatherOf(sheetItem).tone === 'bad' : false"
      :quieter="sheetItem ? quieterTimes(sheetItem) : []" :dry="sheetItem ? dryTimes(sheetItem) : []"
      :indoor-picks="indoorPicks" :can-change-day="!sampleMode"
      @close="closeSheet" @move-time="sheetMoveTime" @move-day="sheetMoveDay" @swap="sheetSwap" @edit="sheetEdit" />
    <!-- Getting from one stop to the next: every way, and choosing one -->
    <LegSheet :leg="legView" @close="closeLeg" @choose="chooseTravel" />
    <!-- Your hotel in this city, or your airport -->
    <AnchorSheet :anchor="anchorEdit" @close="anchorEdit = null" @save="saveAnchor" @remove="removeAnchor" />
    <!-- Add stop: saved places, your hotels, a flight, or finding new places -->
    <AddStopSheet :open="addOpen" :day-label="'Day ' + (dayIndex + 1) + ' · ' + longDate(dayShown)" :hotels="hotelChoices" :places="placeChoices"
      :near="dayCity || destinations[0] || ''" @close="addOpen = false" @find="addOpen = false; addPlace()"
      @add-place="addFromSheet" @add-hotel="addHotelStop" @add-flight="addFlight" />
    <OverflowSheet :open="overflowOpen" :rows="overflowRows" :days="otherDays" :day-number="dayIndex + 1" :reason="dayEndReason"
      :can-add-day="canAddDay" @close="overflowOpen = false" @apply="moveOverflow" @add-day="overflowOpen = false; askAddDay()" />
  </section>
</template>

<script setup>
// Itinerary planner: day pills, a numbered timeline with photos and commute lines, a map of the day,
// and an "Unscheduled" drawer.
// Drag (HTML5) stops to reorder, wishlist places onto the timeline, or stops back to the drawer.
// Times are worked out by dayOptimizer.js: flexible stops follow each other, locked ones keep their time.
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { optimizeDay, scheduleInOrder, scheduleAsIs, travelMatrix, warningsFor, rainFromBlocks, haversineKm, addMealBreaks, defaultDuration, crowdAt, rainDuring,
  travelOptions, recommendTravel, travelBetween, legKey, TRAVEL_MODES, DEFAULT_TRAVEL, exitOf } from '../dayOptimizer.js'
import { PLANNER_SAMPLE } from '../dayOptimizerSample.js'
import { loadLeaflet } from '../services/leaflet.js'
import EatDrawer from './EatDrawer.vue'
import StopSheet from './StopSheet.vue'
import { codeForDestination, flagEmoji } from '../destinations.js'
import AppIcon from './AppIcon.vue'
import LegSheet from './LegSheet.vue'
import AnchorSheet from './AnchorSheet.vue'
import OverflowSheet from './OverflowSheet.vue'
import CustomDropdown from './CustomDropdown.vue'
import AddStopSheet from './AddStopSheet.vue'

const props = defineProps({
  days: { type: Array, default: () => [] },
  selectedDate: { type: String, default: '' },
  stops: { type: Array, default: () => [] },            // the selected day's stops (itinerary store)
  wishlist: { type: Array, default: () => [] },         // the trip's wishlist
  scheduledNames: { type: Array, default: () => [] },   // names already on any day (hidden from the drawer)
  dayName: { type: String, default: '' },
  weatherBlocks: { type: Array, default: () => [] },
  typical: { type: Object, default: null }, // { month, place, temp, rainyDays }: usual weather when there's no forecast yet
  prefs: { type: Object, default: () => ({ dayStart: 8, dayEnd: 23 }) },
  canAddDay: { type: Boolean, default: false },
  destinations: { type: Array, default: () => [] },     // the trip's cities (helps place stops on the map)
  dayCounts: { type: Object, default: () => ({}) },      // { '2026-10-22': 3 } stops per day
  dayIssues: { type: Object, default: () => ({}) },     // { '2026-10-22': { issues: 2, load: 0.8 } } for the day strip
  travellers: { type: Array, default: () => [] },       // everyone on the trip (for the majority vote rule)
  me: { type: String, default: '' },                    // my traveller name (shown on travel choices I make)
  dayCity: { type: String, default: '' },               // the trip city this day is in (e.g. 'Osaka, Japan')
  dayCities: { type: Object, default: () => ({}) },     // { '2026-10-22': 'Osaka, Japan' } for every day
  stays: { type: Array, default: () => [] },            // hotels by date: [{ from, name, address, lat, lon }]
  dayStay: { type: Object, default: null },             // tonight's hotel (where the day ends)
  morningStay: { type: Object, default: null },         // last night's hotel (where the day starts)
  myFlight: { type: Object, default: () => ({}) }       // { arrival: { date, time, flight, place }, departure: {...} } (mine, from Crew)
})
const emit = defineEmits(['select-day', 'add-day', 'remove-day', 'undo-day', 'add-place', 'apply', 'lock', 'schedule', 'unschedule', 'status', 'duration', 'move-day', 'swap', 'edit', 'go-vote', 'travel', 'save-stay', 'save-flight', 'move-stops', 'notice'])
// ---------- sample Kyoto day (local only) ----------
const sampleMode = ref(false)
const sample = ref({ days: [], day: '', stops: [], wishlist: [] })
function startSample() {
  sample.value = {
    days: PLANNER_SAMPLE.days.slice(),
    day: PLANNER_SAMPLE.days[0],
    stops: PLANNER_SAMPLE.stops.map((s) => ({ ...s })),
    wishlist: PLANNER_SAMPLE.wishlist.map((w) => ({ ...w }))
  }
  sampleMode.value = true
  preview.value = null
}
function leaveSample() {
  sampleMode.value = false
  preview.value = null
}

const dayList = computed(() => (sampleMode.value ? sample.value.days : props.days))
const dayShown = computed(() => (sampleMode.value ? sample.value.day : props.selectedDate))
function pickDay(d) {
  preview.value = null
  if (sampleMode.value) sample.value.day = d
  else emit('select-day', d)
}
// ---------- day navigator ----------
const stripEl = ref(null)
const dayEls = {}
const fadeL = ref(false)
const fadeR = ref(false)
const gridOpen = ref(false)
const issuesOpen = ref(false)
function closeGrid() {
  gridOpen.value = false
  issuesOpen.value = false
}
document.addEventListener('click', closeGrid)
onBeforeUnmount(() => document.removeEventListener('click', closeGrid))

function updateFades() {
  const el = stripEl.value
  if (!el) return
  fadeL.value = el.scrollLeft > 4
  fadeR.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}
// Keep the open day in the middle of the strip
function centerDay(smooth = true) {
  nextTick(() => {
    const el = stripEl.value
    const btn = dayEls[dayShown.value]
    if (!el || !btn) return
    el.scrollTo({ left: Math.max(0, btn.offsetLeft - (el.clientWidth - btn.offsetWidth) / 2), behavior: smooth ? 'smooth' : 'auto' })
    setTimeout(updateFades, smooth ? 350 : 0)
  })
}
watch(dayShown, () => centerDay())
watch(() => dayList.value.length, () => centerDay(false))
onMounted(() => {
  centerDay(false)
  window.addEventListener('resize', updateFades)
})
onBeforeUnmount(() => window.removeEventListener('resize', updateFades))

function stepDay(step) {
  const d = dayList.value[dayIndex.value + step]
  if (d) pickDay(d)
}
// ← → move between days, Home/End jump to the first/last (standard tab keys)
function onDayKey(e) {
  let i = dayIndex.value
  if (e.key === 'ArrowRight') i++
  else if (e.key === 'ArrowLeft') i--
  else if (e.key === 'Home') i = 0
  else if (e.key === 'End') i = dayList.value.length - 1
  else return
  e.preventDefault()
  const d = dayList.value[Math.max(0, Math.min(dayList.value.length - 1, i))]
  pickDay(d)
  nextTick(() => dayEls[d] && dayEls[d].focus())
}

function countFor(d) {
  if (sampleMode.value) {
    let n = 0
    for (const st of sample.value.stops) if (st.date === d) n++
    return n
  }
  return props.dayCounts[d] || 0
}
const weekday = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-SG', { weekday: 'short' })
const dayOfMonth = (d) => new Date(d + 'T00:00:00').getDate()
const isWeekend = (d) => [0, 6].includes(new Date(d + 'T00:00:00').getDay())
function isTodayDate(d) {
  const t = new Date()
  return d === t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0')
}

// ---------- adding / removing days (confirm first, undo after) ----------
const dayIndex = computed(() => Math.max(0, dayList.value.indexOf(dayShown.value)))
const confirm = ref(null)   // { kind, title, lines, button, danger }
const toast = ref(null)     // { text, undo }
const dialogEl = ref(null)
const confirmBtn = ref(null)
let toastTimer = null
let sampleUndo = null

function shiftDate(d, days) {
  const date = new Date(d + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
function longDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
}

function openConfirm(c) {
  confirm.value = c
  nextTick(() => confirmBtn.value && confirmBtn.value.focus())
}

function askAddDay() {
  const last = dayList.value[dayList.value.length - 1]
  const next = shiftDate(last, 1)
  openConfirm({
    kind: 'add',
    title: 'Add Day ' + (dayList.value.length + 1) + ' (' + longDate(next) + ')?',
    lines: [],
    button: 'Add Day ' + (dayList.value.length + 1),
    danger: false
  })
}

// Only the last day can be removed, so no other day's date ever changes
function askRemoveDay() {
  const n = dayList.value.length
  const date = dayList.value[n - 1]

  // Get the stops on the day being removed.
  const stopsOnDay = sampleMode.value
    ? sample.value.stops.filter((s) => s.date === date)
    : props.stops.filter((s) => s.date === date)

  // A day containing a locked booking cannot be removed.
  const lockedStops = stopsOnDay.filter((s) => s.locked)

  if (lockedStops.length > 0) {
    emit(
      'notice',
      'Day ' + n +
        ' cannot be removed because it contains ' +
        lockedStops.length +
        ' locked booking' +
        (lockedStops.length === 1 ? '' : 's') +
        '. Unlock or move the booking first.'
    )
    return
  }

  if (stopsOnDay.length > 0) {
    emit(
      'notice',
      stopsOnDay.length +
        (stopsOnDay.length === 1 ? ' stop is' : ' stops are') +
        ' planned outside the shortened trip dates. Move ' +
        (stopsOnDay.length === 1 ? 'it' : 'them') +
        ' in the itinerary first.'
    )
    return
  }

  const count = stopsOnDay.length
  const lines = []

  if (count) {
    lines.push(
      count +
        ' stop' +
        (count === 1 ? '' : 's') +
        ' on this day go back to Saved places (nothing is deleted).'
    )
  }

  openConfirm({
    kind: 'remove',
    title: 'Remove Day ' + n + ' (' + longDate(date) + ')?',
    lines,
    button: 'Remove Day ' + n,
    danger: true,
    date
  })
}

function doConfirm() {
  const c = confirm.value
  confirm.value = null
  if (c.kind === 'city') return scheduleWish(c.wish, c.slot, true)
  if (c.kind === 'full') {
    // The day was full: the place goes on the suggested day instead
    if (!c.date) return scheduleWish(c.wish, c.slot, true, true)
    emit('schedule', c.wish, [], c.date)
    return showToast(c.wish.name + ' added to ' + dayLabel(c.date), false)
  }
  preview.value = null
  if (c.kind === 'add') {
    const n = dayList.value.length + 1
    if (sampleMode.value) {
      sampleUndo = JSON.stringify(sample.value)
      sample.value.days.push(shiftDate(dayList.value[dayList.value.length - 1], 1))
    } else {
      emit('add-day')
    }
    showToast('Day ' + n + ' added')
  } else {
    const n = dayList.value.length
    if (sampleMode.value) {
      sampleUndo = JSON.stringify(sample.value)
      removeSampleDay(c.date)
    } else {
      emit('remove-day', c.date)
    }
    showToast('Day ' + n + ' removed')
  }
}

// "Add anyway" in the day-is-full question
function doConfirmAlt() {
  const c = confirm.value
  confirm.value = null
  if (c.kind === 'full') scheduleWish(c.wish, c.slot, true, true)
}

function removeSampleDay(date) {
  const s = sample.value
  const keep = []
  for (const stop of s.stops) {
    if (stop.date === date) s.wishlist.push({ id: 'pw-' + stop.id, name: stop.name, outdoor: stop.outdoor, lat: stop.lat, lon: stop.lon, address: stop.address })
    else keep.push(stop.date > date ? { ...stop, date: shiftDate(stop.date, -1) } : stop)
  }
  s.stops = keep
  s.days.pop()
  if (!s.days.includes(s.day)) s.day = s.days[s.days.length - 1]
}

function showToast(text, undo = true) {
  toast.value = { text, undo }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 8000)
}

// Undo in the toast: a time move undoes itself here, day changes are undone by the parent
function runUndo() {
  const u = toast.value && toast.value.undo
  if (typeof u === 'function') {
    toast.value = null
    u()
  } else {
    undoDay()
  }
}

function undoDay() {
  toast.value = null
  if (sampleMode.value) {
    if (sampleUndo) sample.value = JSON.parse(sampleUndo)
    sampleUndo = null
  } else {
    emit('undo-day')
  }
  liveText.value = 'Undone'
}
// "Choose from saved places" on an empty day: open the panel and bring it into view (it's below the day on phones)
// It lights up for a few seconds, so it's clear where to look,
// and only scrolls when it isn't already on screen (on a wide screen it's right beside the day)
const drawerEl = ref(null)
const drawerFlash = ref(false)
let flashTimer = null
function showSaved() {
  drawerOpen.value = true
  drawerFlash.value = false
  clearTimeout(flashTimer)
  nextTick(() => {
    const el = drawerEl.value
    if (!el) return
    drawerFlash.value = true
    flashTimer = setTimeout(() => { drawerFlash.value = false }, 4000)
    const box = el.getBoundingClientRect()
    if (box.top < 70 || box.top > window.innerHeight - 160) {
      el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    }
    const first = el.querySelector('.ip-add')
    if (first) first.focus({ preventScroll: true })
  })
}
// ---------- Add stop (the sheet) ----------
const addOpen = ref(false)
function openAddSheet() {
  if (sampleMode.value) return addPlace()
  addOpen.value = true
}
// Your hotels (each once), e.g. back to the hotel for your bags before an evening flight
const hotelChoices = computed(() => {
  const list = []
  for (const st of props.stays || []) {
    if (list.some((h) => h.name === st.name)) continue
    list.push({ name: st.name, address: st.address || '', lat: st.lat, lon: st.lon, sub: st.from ? 'From ' + longDate(st.from) : 'Your hotel' })
  }
  return list
})
const placeChoices = computed(() => {
  const list = []
  for (const w of picks.value) list.push({ ...w, icon: categoryOf(w).icon, sub: categoryOf(w).label + (w.city ? ' · ' + w.city.split(', ')[0] : '') })
  return list
})
function addFromSheet(w) {
  addOpen.value = false
  scheduleWish(w, stopRows.value.length)
}
function addHotelStop(h) {
  addOpen.value = false
  scheduleWish({ id: 'hotel-' + h.name, name: h.name, address: h.address || null, lat: h.lat, lon: h.lon, duration: 0.5, kind: 'hotel' }, stopRows.value.length, true)
}
// A flight midway through the trip: a locked block from "be at the airport" until you've collected your bags
function addFlight(f) {
  addOpen.value = false
  const before = f.intl ? 2.5 : 1.5
  const after = f.intl ? 0.75 : 0.5
  const dep = hourOf(f.dep)
  let arr = hourOf(f.arr)
  if (arr <= dep) arr += 24 // lands after midnight
  const start = Math.max(0, Math.floor((dep - before) * 4) / 4)
  const duration = Math.min(23.75 - start, Math.ceil((arr + after - start) * 4) / 4)
  const short = (name) => name.replace(/ (International )?Airport.*$/i, '').split(',')[0]
  const w = {
    id: 'flight-' + Date.now().toString(36), name: 'Flight ' + short(f.from.name) + ' → ' + short(f.to.name),
    address: null, duration, kind: 'flight', locked: true, lat: f.from.lat, lon: f.from.lon,
    flight: { from: f.from, to: f.to, dep: f.dep, arr: f.arr, number: f.number, intl: f.intl }
  }
  // Only the flight gets a time: the rest of the day stays as planned, and anything that clashes
  // with the flight is flagged (Optimize Route or "Day is too full" can then move it)
  emit('schedule', w, [{ id: '__new', hour: start }])
  showToast(w.name + ' added. Staying somewhere new tonight? Change the hotel at the end of the day.', false)
}

function addPlace() {
  if (sampleMode.value) drawerOpen.value = true
  else emit('add-place')
}

// ---------- coordinates + photos (fetched once per place, shared by every planner) ----------
const coords = ref({})
const photos = ref({})
const photoKey = (s) => (s.name || '').toLowerCase()

// The trip city a place belongs to, so the lookup searches there (not another place with the same name)
function nearFor(s) {
  if (s.city) return s.city
  const list = sampleMode.value ? sample.value.wishlist : props.wishlist
  const match = list.find((w) => w.name.toLowerCase() === (s.name || '').toLowerCase())
  if (match && match.city) return match.city
  return props.destinations.length === 1 ? props.destinations[0] : ''
}
// What to look a stop up by: its address, or (no address) its name in the trip's city.
// Breaks like "Lunch" are not real places, so they're skipped.
const MEAL_ONLY = /^(breakfast|brunch|lunch|dinner|supper)( break)?$/i
function placeText(s) {
  if (s.address) return s.address
  if (!s.name || MEAL_ONLY.test(s.name.trim())) return ''
  const near = nearFor(s)
  return s.name + (near ? ', ' + near : '')
}
const coordKey = (s) => placeText(s) + '|' + nearFor(s)
function coordsFor(s) {
  return placeText(s) ? coords.value[coordKey(s)] : null
}

const locateTries = {} // how many times each place has been looked up
function locate(list) {
  for (const s of list) {
    if (!placeText(s) || s.lat != null) continue
    const key = coordKey(s)
    if (coords.value[key] !== undefined) continue
    coords.value = { ...coords.value, [key]: null }
    locateTries[key] = (locateTries[key] || 0) + 1
    axios.get('/api/safety/locate', { params: { place: placeText(s), near: nearFor(s) || undefined }, timeout: 20000, background: true })
      .then((res) => {
        if (res.data && res.data.lat != null) coords.value = { ...coords.value, [key]: { lat: res.data.lat, lon: res.data.lon } }
      })
      .catch((err) => {
        // "Not found" stays not found. A busy map server: try again in 20 seconds (3 tries at most)
        if (err.response && err.response.status === 404) return
        if (locateTries[key] >= 3) return
        setTimeout(() => {
          const copy = { ...coords.value }
          delete copy[key]
          coords.value = copy
          locate([s])
        }, 20000)
      })
  }
}
function loadPhotos(list) {
  for (const s of list) {
    const key = photoKey(s)
    // Only real places (with an address) get a photo search; "Dinner" etc. keep their icon
    if (!s.address || photos.value[key] !== undefined) continue
    photos.value = { ...photos.value, [key]: null }
    axios.get('/api/places/photo', { params: { destination: s.name.slice(0, 80), size: 'thumb' }, background: true })
      .then((res) => { if (res.data.url) photos.value = { ...photos.value, [key]: res.data.url } })
      .catch(() => {})
  }
}

// ---------- the day's stops, in the shape the optimizer wants ----------
function crowdCurve(forecast) {
  const day = forecast && forecast.days && forecast.days[props.dayName]
  if (!day || !day.raw) return null
  const curve = new Array(24).fill(0)
  for (let k = 0; k < 24; k++) curve[(k + 6) % 24] = day.raw[k] || 0
  return curve
}
function toWork(s) {
  // A flight: a locked block from one airport to another (the next stop is reached from where it lands)
  if (s.kind === 'flight' && s.flight) {
    return {
      id: s.id, name: s.name, address: null, hour: s.hour, outdoor: false, locked: true, kind: 'flight', flight: s.flight,
      duration: s.duration || 2, lat: s.flight.from.lat, lon: s.flight.from.lon, endLat: s.flight.to.lat, endLon: s.flight.to.lon,
      crowd: null, popular: false, open: null, close: null, transitSecs: 0, travelMode: null, travelFrom: null, travelBy: ''
    }
  }
  const c = s.lat != null ? { lat: s.lat, lon: s.lon } : coordsFor(s)
  const day = s.forecast && s.forecast.days && s.forecast.days[props.dayName]
  return {
    id: s.id, name: s.name, address: s.address || null, hour: s.hour, outdoor: !!s.outdoor, locked: !!s.locked, kind: s.kind || null,
  transitSecs: s.transitSecs || 0,
    // Your own time if you set one, else the place's typical visit time, else a guess from what it is
    duration: s.duration || (s.forecast && s.forecast.durationDefault) || defaultDuration(s),
    lat: c ? c.lat : null, lon: c ? c.lon : null,
    crowd: crowdCurve(s.forecast), popular: !!c || !!s.address, // a place we found on the map gets the typical crowd curve
    open: day && !day.closed ? day.open : null, close: day && !day.closed ? day.close : null,
    // How the group chose to get here (only counts when coming from that same stop)
    travelMode: s.travel ? s.travel.mode : null, travelFrom: s.travel ? s.travel.from : null, travelBy: s.travel ? s.travel.by : ''
  }
}
const work = computed(() => {
  const list = sampleMode.value ? sample.value.stops.filter((s) => s.date === sample.value.day) : props.stops
  return list.map(toWork)
})
const unscheduled = computed(() => {
  if (sampleMode.value) return sample.value.wishlist
  const taken = props.scheduledNames.map((n) => n.toLowerCase())
  return props.wishlist.filter((w) => !taken.includes(w.name.toLowerCase()))
})
// Saved places grouped by destination (e.g. Tokyo, Kyoto), in the order they first appear.
// Places saved before multi-city trips have no city and go under "Other places".
// ---------- majority vote rule ----------
// On a group trip (2+ travellers), a saved place can only go on a day once more than half voted for it.
// Solo trips skip voting: everything saved can be added.
const votingOn = computed(() => !sampleMode.value && props.travellers.length >= 2)
const needed = computed(() => Math.floor(props.travellers.length / 2) + 1) // 3 travellers -> 2, 4 -> 3
function isPick(w) {
  return !votingOn.value || (w.votes || []).length >= needed.value
}
const picks = computed(() => {
  const list = []
  for (const w of unscheduled.value) if (isPick(w)) list.push(w)
  return list
})
const waiting = computed(() => {
  const list = []
  for (const w of unscheduled.value) if (!isPick(w)) list.push(w)
  return list
})

const savedGroups = computed(() => {
  const groups = []
  for (const w of picks.value) {
    const city = w.city || ''
    let g = groups.find((x) => x.city === city)
    if (!g) {
      g = {
        city,
        label: city ? city.split(', ')[0] : 'Other places',
        flag: city ? flagEmoji(codeForDestination(city)) : '📍',
        items: []
      }
      groups.push(g)
    }
    g.items.push(w)
  }
  // Places without a city go last
  groups.sort((a, b) => (a.city ? 0 : 1) - (b.city ? 0 : 1))
  return groups
})

watch([work, unscheduled], () => {
  const all = props.stops.concat(unscheduled.value)
  locate(all)
  loadPhotos(sampleMode.value ? sample.value.stops.concat(sample.value.wishlist) : all)
}, { immediate: true })

// ---------- demo weather simulation ----------
const simulationStopId = ref('')
// For the two dropdowns (the app's own CustomDropdown, like everywhere else)
const SIM_WEATHER = [{ value: 'Rain', label: 'Rainy', icon: '🌧️' }, { value: 'Clear', label: 'Sunny', icon: '☀️' }]
const simStopOptions = computed(() => {
  const list = []
  for (const it of stopRows.value) list.push({ value: it.stop.id, label: it.stop.name, description: formatHour(it.start) })
  return list
})
const simulationCondition = ref('Rain')
const weatherSimulation = ref(null)
const weatherMovePreview = ref(null)



function originalWeatherForStop(stopId) {
  const it = stopRows.value.find(
    (row) => row.stop.id === stopId
  )

  if (!it) return null

  const hour = Math.floor(it.start)

  return props.weatherBlocks.find(
    (block) =>
      hour >= block.time &&
      hour < block.time + (block.span || 3)
  ) || null
}

watch(simulationStopId, (stopId) => {
  const original = originalWeatherForStop(stopId)

  if (!original) {
    simulationCondition.value = 'Rain'
    return
  }

  // Automatically suggest the opposite condition.
  simulationCondition.value =
    original.rain ? 'Clear' : 'Rain'
})

function applyWeatherSimulation() {
  const it = stopRows.value.find(
    (row) => row.stop.id === simulationStopId.value
  )

  if (!it) return

  weatherSimulation.value = {
    stopId: it.stop.id,
    stopName: it.stop.name,
    start: it.start,
    duration: it.stop.duration || 1,
    condition: simulationCondition.value
  }
}

function previewWeatherMove(option) {
  if (!weatherSimulation.value) return

  const it = stopRows.value.find(
    (row) => row.stop.id === weatherSimulation.value.stopId
  )

  if (!it) return

  const cascade = previewCascadeForMove(
    it,
    option.hour
  )
  
  const cascadeFeasible = cascade.every(
    (item) => item.toHour != null
  )

  weatherMovePreview.value = {
    stopId: it.stop.id,
    stopName: it.stop.name,
    fromHour: it.start,
    toHour: option.hour,
    temp: option.temp,
    conflicts: option.conflicts,
    requiresAdjustment: option.requiresAdjustment,
    cascade,
    cascadeFeasible
  }
}

function applyWeatherReplan() {
  const preview = weatherMovePreview.value

  if (!preview || !preview.cascadeFeasible) return

  const changes = [
    {
      id: preview.stopId,
      hour: preview.toHour
    },

    ...preview.cascade
      .filter((item) => item.toHour != null)
      .map((item) => ({
        id: item.id,
        hour: item.toHour
      }))
  ]

  save(changes)

  weatherMovePreview.value = null
  weatherSimulation.value = null
}

function resetWeatherSimulation() {
  weatherSimulation.value = null
  weatherMovePreview.value = null
}

const effectiveWeatherBlocks = computed(() => {
  if (!weatherSimulation.value) {
    return props.weatherBlocks
  }

  const sim = weatherSimulation.value

  return props.weatherBlocks.map((block) => {
    const overlaps =
      block.time < sim.start + sim.duration &&
      block.time + (block.span || 3) > sim.start

    if (!overlaps) {
      return block
    }

    const rainy = sim.condition === 'Rain'

    return {
      ...block,
      condition: rainy ? 'Rain' : 'Clear',
      rain: rainy,
      demoSimulation: true
    }
  })
})


const rain = computed(() =>
  (effectiveWeatherBlocks.value.length && !sampleMode.value
    ? rainFromBlocks(effectiveWeatherBlocks.value)
    : null)
)

// ---------- transport (Settings → Transport, plus live routes) ----------
const realLegs = ref({}) // legKey -> { walk: { min, km }, taxi: {...}, ... } from /api/travel/leg
const asking = ref({})   // legKey -> true while it's being looked up
const travelPrefs = computed(() => ({
  modes: props.prefs.travelModes && props.prefs.travelModes.length ? props.prefs.travelModes : DEFAULT_TRAVEL.modes,
  maxWalk: props.prefs.maxWalk || DEFAULT_TRAVEL.maxWalk,
  priority: props.prefs.travelPriority || DEFAULT_TRAVEL.priority,
  group: Math.max(1, props.travellers.length),
  real: realLegs.value
}))
// Real travel times for one leg (in the background lane; kept by the server, so it's quick next time)
function fetchLeg(a, b) {
  a = exitOf(a) // after a flight: from the airport it lands at
  if (!a || !b || a.lat == null || b.lat == null || sampleMode.value) return
  const key = legKey(a, b)
  if (realLegs.value[key] || asking.value[key]) return
  asking.value = { ...asking.value, [key]: true }
  axios.get('/api/travel/leg', { params: { from: a.lat + ',' + a.lon, to: b.lat + ',' + b.lon }, background: true, timeout: 30000 })
    .then((res) => {
      if (res.data && Object.keys(res.data).length) realLegs.value = { ...realLegs.value, [key]: res.data }
    })
    .catch(() => {})
    .finally(() => {
      const copy = { ...asking.value }
      delete copy[key]
      asking.value = copy
    })
}
// Preferences are constraints for Optimize; they do not change saved itinerary times by themselves.
const opts = computed(() => ({
  dayStart: props.prefs.dayStart || 8,
  dayEnd: Math.min(24, props.prefs.dayEnd || 23),
  buffer: props.prefs.travelBuffer || 0,
  crowdWeight: { low: 0.5, medium: 1, high: 2 }[props.prefs.crowdSensitivity] || 1
}))
// ---------- where the day starts and ends (hotel or airport) ----------
const cityName = computed(() => (props.dayCity ? props.dayCity.split(', ')[0] : ''))
// Tonight's hotel and last night's (they differ on the day you change hotel)
const dayStay = computed(() => (sampleMode.value ? null : props.dayStay))
const morningStay = computed(() => (sampleMode.value ? null : props.morningStay || props.dayStay))
const changingHotel = computed(() => !!(dayStay.value && morningStay.value && dayStay.value.from === dayShown.value && morningStay.value.from !== dayStay.value.from))
const arrivalToday = computed(() => {
  const a = props.myFlight && props.myFlight.arrival
  return !sampleMode.value && a && a.date === dayShown.value ? a : null
})
const departureToday = computed(() => {
  const d = props.myFlight && props.myFlight.departure
  return !sampleMode.value && d && d.date === dayShown.value ? d : null
})
// A flight home in the small hours of tomorrow (e.g. 3:50 AM): you go to the airport tonight
const departureTonight = computed(() => {
  const d = props.myFlight && props.myFlight.departure
  const next = dayList.value[dayIndex.value + 1]
  if (sampleMode.value || !d || !next || d.date !== next || !d.place) return null
  return hourOf(d.time) - 2.5 < opts.value.dayStart ? d : null
})
function hourOf(hhmm) {
  const parts = (hhmm || '0:0').split(':').map(Number)
  return parts[0] + parts[1] / 60
}
// The two ends of the day as map points (the planner travels from / to them)
const startAnchor = computed(() => {
  const a = arrivalToday.value
  if (a && a.place) return { id: '@start', kind: 'arrive', name: a.place.name, lat: a.place.lat, lon: a.place.lon, hour: hourOf(a.time), flight: a.flight }
  const m = morningStay.value
  if (m) return { id: '@start', kind: 'stay', name: m.name, lat: m.lat, lon: m.lon }
  return null
})
const endAnchor = computed(() => {
  const d = departureToday.value
  // early = you have to be at the airport before your day would even start: no time for plans today
  if (d && d.place) return { id: '@end', kind: 'depart', name: d.place.name, lat: d.place.lat, lon: d.place.lon, hour: hourOf(d.time), flight: d.flight, early: hourOf(d.time) - 2.5 < opts.value.dayStart }
  // tonight = the early flight is tomorrow, so today ends at the airport (hour past midnight, e.g. 27.8 = 3:50 AM)
  const t = departureTonight.value
  if (t) return { id: '@end', kind: 'depart', name: t.place.name, lat: t.place.lat, lon: t.place.lon, hour: 24 + hourOf(t.time), flight: t.flight, tonight: true }
  if (dayStay.value) return { id: '@end', kind: 'stay', name: dayStay.value.name, lat: dayStay.value.lat, lon: dayStay.value.lon }
  return null
})
const anchorList = computed(() => [startAnchor.value, endAnchor.value].filter(Boolean))
const isLastDay = computed(() => dayList.value.length > 1 && dayIndex.value === dayList.value.length - 1)
const startCaption = computed(() => {
  const a = startAnchor.value
  if (a && a.kind === 'arrive') return 'You land at ' + formatHour(a.hour) + (a.flight ? ' · ' + a.flight : '')
  if (a && changingHotel.value) return 'Check out of your hotel'
  return a ? 'Day starts at your hotel' : 'Where does the day start?'
})
const endCaption = computed(() => {
  const a = endAnchor.value
  if (a && a.kind === 'depart' && a.tonight) return 'Overnight to the airport · flight home at ' + formatHour(a.hour) + ' tomorrow' + (a.flight ? ' · ' + a.flight : '')
  if (a && a.kind === 'depart' && a.early) return 'Flight home at ' + formatHour(a.hour) + (a.flight ? ' · ' + a.flight : '') + ' · at the airport by ' + formatHour(a.hour - 2)
  if (a && a.kind === 'depart') return 'Flight home at ' + formatHour(a.hour) + (a.flight ? ' · ' + a.flight : '') + ' · be there 2 h before'
  if (a && changingHotel.value) return 'Check in at your new hotel'
  return a ? 'Back to your hotel' : 'Where does the day end?'
})
// The day's hours with the flights: start 45 min after landing (passport and bags),
// and finish in time to be at the airport 2 hours before take-off (plus getting there)
const dayOpts = computed(() => {
  const o = { ...opts.value }
  const s = startAnchor.value
  const e = endAnchor.value
  if (s && s.kind === 'arrive') o.dayStart = Math.max(o.dayStart, Math.ceil((s.hour + 0.75) * 4) / 4)
  // Leave for the airport 2.5 h before take-off. If that's before the day starts (a 3:50 AM flight),
  // there's no time for plans at all; a flight early tomorrow only matters if you'd leave before the day ends
  if (e && e.kind === 'depart') o.dayEnd = Math.min(o.dayEnd, Math.max(o.dayStart, e.hour - 2.5))
  if (s) o.from = s
  if (e) o.end = e
  return o
})

// ---------- a day that's too full ----------
// Why the day ends when it does (shown in the banner and the question)
const dayEndReason = computed(() => {
  const e = endAnchor.value
  const s = startAnchor.value
  if (e && e.kind === 'depart' && e.early) return 'Your flight home leaves at ' + formatHour(e.hour) + ', so there\'s no time for plans today'
  if (e && e.kind === 'depart' && e.tonight) return 'You head to the airport tonight for your ' + formatHour(e.hour) + ' flight, and your day ends at ' + formatHour(dayOpts.value.dayEnd)
  if (e && e.kind === 'depart') return 'You need to leave for your ' + formatHour(e.hour) + ' flight by ' + formatHour(dayOpts.value.dayEnd)
  if (s && s.kind === 'arrive') return 'You land at ' + formatHour(s.hour) + ' and your day ends at ' + formatHour(dayOpts.value.dayEnd)
  return 'Your day ends at ' + formatHour(dayOpts.value.dayEnd)
})
function endsLate(items) {
  for (const it of items) {
    if (!it.stop.virtual && it.start + (it.stop.duration || 1) > dayOpts.value.dayEnd + 0.01) return true
  }
  return false
}
function dayLabel(d) {
  return 'Day ' + (dayList.value.indexOf(d) + 1) + ' (' + longDate(d) + ')'
}
// The best other day for a stop: same city, the most free time (nearest day if it's a tie)
// free = hours already promised to other moves, so two stops don't both take the same last gap
function bestDayFor(stop, taken) {
  const here = dayList.value.indexOf(dayShown.value)
  const city = props.dayCity
  let best = null
  let bestFree = 0
  for (const d of dayList.value) {
    if (d === dayShown.value) continue
    const info = props.dayIssues[d]
    if (!info || info.free == null) continue
    const other = props.dayCities[d]
    if (city && other && other !== city) continue
    const free = info.free - (taken[d] || 0)
    if (free < (stop.duration || 1)) continue
    const closer = best && Math.abs(dayList.value.indexOf(d) - here) < Math.abs(dayList.value.indexOf(best) - here)
    if (!best || free > bestFree + 0.01 || (Math.abs(free - bestFree) <= 0.01 && closer)) {
      best = d
      bestFree = free
    }
  }
  return best
}
// Which stop to take off first: an outdoor place that would be in the dark (after 6 PM), else the one that ends last
function stopToMove(items) {
  let pick = null
  for (const it of items) {
    if (it.stop.virtual || it.stop.locked) continue
    if (it.stop.outdoor && it.start >= 18) return it.stop
    if (!pick || it.start > pick.start) pick = it
  }
  return pick ? pick.stop : null
}
// The stops that don't fit, and the day each one could go to
const overflow = computed(() => {
  if (previewing.value || sampleMode.value || !endsLate(current.value)) return null
  let keep = current.value.map((it) => it.stop)
  const out = []
  for (let n = 0; n < 20; n++) {
    const items = retime(keep)
    if (!endsLate(items)) break
    const stop = stopToMove(items)
    if (!stop) break
    out.push(stop)
    keep = keep.filter((x) => x.id !== stop.id)
  }
  const moves = []
  const stuck = []
  const taken = {}
  for (const stop of out) {
    const date = bestDayFor(stop, taken)
    if (date) {
      taken[date] = (taken[date] || 0) + (stop.duration || 1)
      moves.push({ stop, date })
    } else {
      stuck.push(stop)
    }
  }
  return { count: out.length || 1, moves, stuck }
})

// The "where should these go?" panel: one row per stop, set to our suggested day
const overflowOpen = ref(false)
const overflowRows = computed(() => {
  const rows = []
  if (!overflow.value) return rows
  for (const m of overflow.value.moves) rows.push(overflowRow(m.stop, m.date))
  for (const stop of overflow.value.stuck) rows.push(overflowRow(stop, null))
  return rows
})
function overflowRow(stop, suggested) {
  return { id: stop.id, name: stop.name, duration: stop.duration || 1, photo: photos.value[photoKey(stop)] || null, icon: categoryOf(stop).icon, suggested }
}
// Every other day, with its free time (and its city when it's not this day's city)
const otherDays = computed(() => {
  const list = []
  for (const d of dayList.value) {
    if (d === dayShown.value) continue
    const info = props.dayIssues[d] || {}
    const city = props.dayCities[d] || ''
    list.push({
      date: d,
      label: 'Day ' + (dayList.value.indexOf(d) + 1) + ' · ' + longDate(d),
      free: info.free == null ? 0 : info.free,
      otherCity: city && props.dayCity && city !== props.dayCity ? city.split(', ')[0] : ''
    })
  }
  return list
})
// moves = [{ id, date }] where date is a day or 'saved' (back to Saved places)
function moveOverflow(moves) {
  overflowOpen.value = false
  emit('move-stops', moves)
  let days = 0
  let saved = 0
  for (const m of moves) {
    if (m.date === 'saved') saved++
    else days++
  }
  const parts = []
  if (days) parts.push(days + ' stop' + (days === 1 ? '' : 's') + ' moved to other days')
  if (saved) parts.push(saved + ' back in Saved places')
  showToast(parts.join(', '))
}

const matrix = computed(() => travelMatrix(work.value.concat(anchorList.value), travelPrefs.value))
const current = computed(() => scheduleAsIs(work.value, matrix.value))

// ---------- optimize ----------
const preview = ref(null)
const previewing = computed(() => !!(preview.value && preview.value.better))
// stopRows = the real stops in time order; timeline = the same plus lunch/dinner breaks (for showing)
const stopRows = computed(() => (previewing.value ? preview.value.after.items.filter((it) => !it.stop.virtual) : current.value))
watch(stopRows, (rows) => {
  if (!rows.length) {
    simulationStopId.value = ''
    return
  }

  const stillExists = rows.some(
    (it) => it.stop.id === simulationStopId.value
  )

  if (!stillExists) {
    simulationStopId.value = rows[0].stop.id
  }
}, { immediate: true })

const timeline = computed(() => (previewing.value ? preview.value.after.items : addMealBreaks(current.value, work.value, opts.value)))
// (here, not next to overflow: watching it reads previewing, which only exists from this point)
watch(overflow, (o) => { if (!o) overflowOpen.value = false })
// Look up real travel times for each leg of the day as it's shown
watch(() => stopRows.value.map((x) => x.stop.id + ':' + x.stop.lat).join() + '|' + anchorList.value.map((a) => a.lat).join(), () => {
  const rows = stopRows.value
  for (let k = 1; k < rows.length; k++) fetchLeg(rows[k - 1].stop, rows[k].stop)
  if (rows.length && startAnchor.value) fetchLeg(startAnchor.value, rows[0].stop)
  if (rows.length && endAnchor.value) fetchLeg(rows[rows.length - 1].stop, endAnchor.value)
}, { immediate: true })
// Getting from the hotel/airport to the first stop, and from the last stop back
const startLeg = computed(() => {
  const first = stopRows.value[0]
  if (!startAnchor.value || !first || first.stop.lat == null || startAnchor.value.lat == null) return null
  return travelBetween(startAnchor.value, first.stop, travelPrefs.value)
})
const endLeg = computed(() => {
  const rows = stopRows.value
  const last = rows[rows.length - 1]
  if (!endAnchor.value || !last || last.stop.lat == null || endAnchor.value.lat == null) return null
  return travelBetween(last.stop, endAnchor.value, travelPrefs.value)
})
function modeIcon(mode) {
  return TRAVEL_MODES[mode] ? TRAVEL_MODES[mode].icon : 'map-pin'
}
function anchorLegText(leg) {
  return TRAVEL_MODES[leg.mode].label + ' · ' + leg.min + ' min' + (leg.live ? '' : ' (est.)')
}
function openAnchorLeg(which) {
  legOpener = document.activeElement
  legOpen.value = { anchor: which }
  const rows = stopRows.value
  if (which === 'start') fetchLeg(startAnchor.value, rows[0].stop)
  else fetchLeg(rows[rows.length - 1].stop, endAnchor.value)
}

// A hotel or flight was just set (or changed) for this day: re-time the day around it once
// (switching days doesn't count, only a change on the same day)
watch(() => dayShown.value + '|' + anchorList.value.map((x) => x.kind + x.name + (x.hour || '')).join(','), (now, before) => {
  if (!before || now.split('|')[0] !== before.split('|')[0]) return
  const s = startAnchor.value
  nextTick(() => fitDayToPrefs(s && s.kind === 'arrive' ? 'Day planned around your flight' : 'Day re-timed from your hotel'))
})

// Editing the hotel / airport (AnchorSheet)
const anchorEdit = ref(null)
function editAnchor(which) {
  let kind = which
  if (which === 'start') kind = startAnchor.value && startAnchor.value.kind === 'arrive' ? 'arrive' : 'stay'
  if (which === 'end') kind = endAnchor.value && endAnchor.value.kind === 'depart' ? 'depart' : 'stay'
  const flight = kind === 'arrive' ? props.myFlight.arrival : kind === 'depart' ? props.myFlight.departure : null
  anchorEdit.value = {
    kind,
    city: props.dayCity || props.destinations[0] || '',
    current: kind === 'stay' ? (dayStay.value ? { name: dayStay.value.name, address: dayStay.value.address, lat: dayStay.value.lat, lon: dayStay.value.lon } : null)
      : (flight && flight.place) || null,
    // Hotels: for the whole trip, or from this day on (a hotel change); the first day is always the whole trip
    dayLabel: 'Day ' + (dayIndex.value + 1) + ' (' + longDate(dayShown.value) + ')',
    firstDay: dayIndex.value === 0,
    hasHotels: (props.stays || []).length > 0,
    from: dayStay.value ? dayStay.value.from : dayShown.value,
    flight: flight ? flight.flight || '' : '',
    time: flight ? flight.time || '' : '',
    flightDate: flight && flight.date ? flight.date : dayShown.value, // (an early flight shown on the day before keeps its own date)
  }
}
function saveAnchor(data) {
  const a = anchorEdit.value
  anchorEdit.value = null
  if (a.kind === 'stay') emit('save-stay', { place: data.place, scope: a.firstDay ? 'trip' : data.scope, from: dayShown.value })
  else emit('save-flight', a.kind, { date: a.flightDate || dayShown.value, time: data.time, flight: data.flight, place: data.place })
}
function removeAnchor() {
  const a = anchorEdit.value
  anchorEdit.value = null
  if (a.kind === 'stay') emit('save-stay', { place: null, from: a.from })
  else emit('save-flight', a.kind, null)
}

// Number shown in a stop's circle (meal breaks aren't counted)
function numberOf(it) {
  return stopRows.value.findIndex((x) => x.stop.id === it.stop.id)
}
// A drop slot in the timeline -> position among the real stops
function slotOf(i) {
  let n = 0
  for (let k = 0; k < i; k++) if (!timeline.value[k].stop.virtual) n++
  return n
}
watch(() => dayShown.value + '|' + props.stops.map((s) => s.id + s.hour + s.locked).join(), () => { if (!sampleMode.value) preview.value = null })

const phase = ref('')
const phaseText = computed(() => ({ route: 'Analyzing route…', forecast: 'Checking forecast…', reorder: 'Reordering…' })[phase.value] || 'Optimize Route')
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- flight days ----------
// Preferences never move saved stops by themselves: they guide Optimize Route and the warnings
// (the itinerary is shared, so one person's hours shouldn't re-time everyone's day).
// A flight is different: nothing can happen before you land or after you have to leave for the
// airport, so on those days the stops are re-timed around the flight.
function fitDayToPrefs(note) {
  if (previewing.value || !current.value.length) return
  const items = retime(current.value.map((it) => it.stop))
  const changes = []
  let moved = false
  for (const it of items) {
    changes.push({ id: it.stop.id, hour: it.start })
    if (Math.abs(it.start - it.stop.hour) > 0.01) moved = true
  }
  if (!moved) return
  // Say what moved (shown in the Smart Schedule status strip)
  let first = null
  for (const it of items) {
    if (!it.stop.virtual && Math.abs(it.start - it.stop.hour) > 0.01) { first = it; break }
  }
  save(changes)
  if (note && first) noteChange(note + ': ' + first.stop.name + ' now starts at ' + formatHour(first.start))
}
// On a flight day: is a flexible stop before you land, or after you need to leave?
function outsideFlight() {
  const s = startAnchor.value
  const e = endAnchor.value
  const landing = s && s.kind === 'arrive'
  const leaving = e && e.kind === 'depart'
  if (!landing && !leaving) return false
  const o = dayOpts.value
  for (const it of current.value) {
    if (it.stop.locked) continue
    if (landing && it.start < o.dayStart - 0.01) return true
    if (leaving && it.start + (it.stop.duration || 1) > o.dayEnd + 0.01) return true
  }
  return false
}
// Opening a day, the first load, or a flight saved from another day
watch(() => dayShown.value + '|' + dayOpts.value.dayStart + '|' + dayOpts.value.dayEnd + '|' + current.value.length, () => nextTick(() => {
  if (outsideFlight()) fitDayToPrefs('Day planned around your flight')
}), { immediate: true })

async function optimize() {
  preview.value = null
  phase.value = 'route'
  await pause(350)
  phase.value = 'forecast'
  await pause(350)
  phase.value = 'reorder'
  await pause(250)
  preview.value = optimizeDay(work.value, rain.value, { ...dayOpts.value, travel: travelPrefs.value })
  phase.value = ''
}
function applyPreview() {
  const summary = preview.value.summary
  save(preview.value.after.items.map((it) => ({ id: it.stop.id, hour: it.start })))
  preview.value = null
  noteChange(summary.replace(/^Route optimized: /, 'Route optimized: '))
}

// ---------- "Find somewhere to eat" (meal break -> slide-over with places nearby) ----------
const eat = ref(null) // { label, icon, start, duration, date, fromName, from, city, slot }
function openEat(breakItem, index) {
  // The stop before the break is where you'll be (or the one after, for a break at the start)
  let before = null
  for (let k = index - 1; k >= 0; k--) if (!timeline.value[k].stop.virtual) { before = timeline.value[k].stop; break }
  if (!before) for (let k = index + 1; k < timeline.value.length; k++) if (!timeline.value[k].stop.virtual) { before = timeline.value[k].stop; break }
  const meal = breakItem.stop.name.replace(/ break$/, '')
  eat.value = {
    label: meal,
    icon: breakItem.stop.icon,
    start: breakItem.start,
    duration: breakItem.stop.duration,
    date: dayShown.value,
    fromName: before ? before.name : '',
    from: before && before.lat != null ? { lat: before.lat, lon: before.lon } : null,
    city: (before && nearFor(before)) || (props.destinations[0] || ''),
    slot: slotOf(index)
  }
}
// Picked a place: it takes the break's spot ("Lunch at …" so it counts as the meal)
function addMeal(place) {
  const c = eat.value
  eat.value = null
  const city = c.city ? c.city.split(', ')[0] : ''
  scheduleWish({
    name: c.label + ' at ' + place.name,
    address: place.name + (place.address ? ', ' + place.address : '') + (city ? ', ' + city : ''),
    outdoor: false,
    city: c.city || null,
    lat: place.lat,
    lon: place.lon,
    duration: c.duration,
    type: 'food'
  }, c.slot, true)
  noteChange(c.label + ' at ' + place.name + ' added at ' + formatHour(c.start))
}

// ---------- how long you stay (tap the ⏱ chip) ----------
const DURATION_PICKS = [
  { value: 0.5, label: '30m' }, { value: 1, label: '1h' }, { value: 1.5, label: '1.5h' },
  { value: 2, label: '2h' }, { value: 3, label: '3h' }, { value: 4, label: 'Half day' }
]
const durFor = ref(null) // stop id whose menu is open
function toggleDur(id) {
  durFor.value = durFor.value === id ? null : id
}
function closeDurMenu() {
  durFor.value = null
}
document.addEventListener('click', closeDurMenu)
onBeforeUnmount(() => document.removeEventListener('click', closeDurMenu))

// New duration -> the rest of the day re-times around it (locked stops stay)
function setDuration(stop, hours) {
  const h = Math.max(0.25, Math.min(12, Math.round(hours * 4) / 4))
  const list = stopRows.value.map((it) => (it.stop.id === stop.id ? { ...it.stop, duration: h } : it.stop))
  const changes = retime(list).map((it) => ({ id: it.stop.id, hour: it.start }))
  saveDuration(stop.id, h, changes)
  explainLocked(retime(list), stop.name + ' now ' + durationText(h))
}

function saveDuration(id, hours, changes) {
  changes = changes.map((c) => ({ ...c, hour: Math.min(c.hour, 23.75) }))
  if (sampleMode.value) {
    const s = sample.value.stops.find((x) => x.id === id)
    if (s) s.duration = hours
    save(changes)
  } else {
    emit('duration', id, hours, changes)
  }
}

// After a change: say what moved, or warn if a locked plan / the end of the day is now tight
function explainLocked(items, what) {
  let late = null
  let over = null
  for (const it of items) {
    if (it.stop.virtual) continue
    if (it.stop.locked && it.lateMin > 0 && !late) late = it
    if (it.start + (it.stop.duration || 1) > opts.value.dayEnd + 0.01) over = it
  }
  if (late) noteChange(what + '. ⚠ ' + late.stop.name + ' at ' + formatHour(late.start) + ' is now tight (' + late.lateMin + ' min late)', 'warn')
  else if (over) noteChange(what + ". ⚠ The day now runs past your end time. Send " + lastFlexible(items) + ' back to Saved places?', 'warn')
  else noteChange(what + '. The rest of the day was re-timed.')
}
function lastFlexible(items) {
  for (let k = items.length - 1; k >= 0; k--) if (!items[k].stop.virtual && !items[k].stop.locked) return items[k].stop.name
  return 'a stop'
}

// ---------- on the day: what's happening now ----------
// The sample day pretends it's 10:30 AM on its first day, so you can try this any time.
const clock = ref(Date.now())
const ticker = setInterval(() => { clock.value = Date.now() }, 60000)
onBeforeUnmount(() => clearInterval(ticker))

function todayStr() {
  const d = new Date(clock.value)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
const nowHour = computed(() => {
  if (sampleMode.value) return 10.5
  const d = new Date(clock.value)
  return d.getHours() + d.getMinutes() / 60
})
const isToday = computed(() => (sampleMode.value ? dayShown.value === sample.value.days[0] : dayShown.value === todayStr()))
// { id, state: 'now' | 'next' } for the stop you're at (or heading to next)
const live = computed(() => {
  if (!isToday.value) return null
  for (const it of stopRows.value) {
    const end = it.start + (it.stop.duration || 1)
    if (it.start <= nowHour.value && nowHour.value < end) return { id: it.stop.id, state: 'now' }
    if (it.start > nowHour.value) return { id: it.stop.id, state: 'next' }
  }
  return null
})

// Re-plan everything after this stop, starting from when you leave it
function replanFrom(it, newDuration, what) {
  const all = stopRows.value.map((x) => x.stop)
  const i = all.findIndex((x) => x.id === it.stop.id)
  const current = { ...it.stop, duration: newDuration }
  const rest = all.slice(i + 1)
  const leaveAt = it.start + newDuration
  const items = scheduleInOrder(rest.filter((s) => !s.locked), rest.filter((s) => s.locked), travelMatrix(all, travelPrefs.value),
    { ...dayOpts.value, dayStart: leaveAt, from: current, allStops: all })
  const changes = [{ id: current.id, hour: it.start }]
  let moved = 0
  for (const x of items) {
    changes.push({ id: x.stop.id, hour: x.start })
    if (!x.stop.virtual && Math.abs(x.start - x.stop.hour) > 0.01) moved++
  }
  saveDuration(current.id, newDuration, changes)
  if (!rest.length) noteChange(what + '. That was the last stop of the day.')
  else if (!moved && rest.every((s) => s.locked)) noteChange(what + '. The next stops are locked, so their times stay.')
  else if (!moved) noteChange(what + '. The next stop was already planned for right after now, so nothing moved.')
  else explainLocked(items, what)
}
function finishNow(it) {
  // Leave now (to the next 5 minutes, not 15, so finishing a little early still moves the rest of the day)
  const hours = Math.ceil((nowHour.value - it.start) * 12) / 12
  replanFrom(it, Math.max(5 / 60, hours), 'Finished ' + it.stop.name + ' early')
}
function stayLonger(it) {
  replanFrom(it, (it.stop.duration || 1) + 0.25, 'Staying 15 min longer at ' + it.stop.name)
}

// ---------- status for the Smart Schedule panel ----------
const lastChange = ref('')
const lastKind = ref('fixed')
let changeTimer = null
function noteChange(text, kind = 'fixed') {
  lastKind.value = kind
  lastChange.value = text
  clearTimeout(changeTimer)
  changeTimer = setTimeout(() => { lastChange.value = '' }, 12000)
}
watch(dayShown, () => { lastChange.value = '' })

const status = computed(() => {
  if (phase.value) return { kind: 'busy', text: phaseText.value }
  if (lastChange.value) return { kind: lastKind.value, text: lastChange.value }
  const problems = []
  for (const it of timeline.value) {
    for (const p of pillsFor(it)) if (p.kind === 'warn') problems.push(it.stop.name + ': ' + p.text.toLowerCase())
  }
  if (problems.length) {
    return { kind: 'warn', text: problems.length + ' thing' + (problems.length === 1 ? '' : 's') + ' to check on this day. Tap ⚠ next to Optimize Route to see them.' }
  }
  if (!stopRows.value.length) return { kind: 'idle', text: 'Add places to this day and the schedule balances itself.' }
  return { kind: 'ok', text: 'All clear: no overlaps, crowd peaks or rain clashes on this day.' }
})
watch(status, (s) => emit('status', s), { immediate: true })

// Write new times (sample: locally, real trip: parent saves)
const liveText = ref('')
function save(changes) {
  // A day can't run past midnight: anything that would is kept at 11:45 PM (and flagged as after your day)
  changes = changes.map((c) => ({ ...c, hour: Math.min(c.hour, 23.75) }))
  if (sampleMode.value) {
    for (const c of changes) {
      const s = sample.value.stops.find((x) => x.id === c.id)
      if (s) s.hour = c.hour
    }
  } else {
    emit('apply', changes)
  }
  liveText.value = 'Day updated'
}
function toggleLock(stop) {
  if (sampleMode.value) {
    const s = sample.value.stops.find((x) => x.id === stop.id)
    if (s) s.locked = !s.locked
  } else {
    emit('lock', stop.id, !stop.locked)
  }
}

// ---------- drag & drop ----------
const drag = ref(null)      // { kind: 'stop' | 'wish', item }
const dropAt = ref(null)    // slot index (0 = before the first stop)
const drawerOpen = ref(true)

function startDrag(e, kind, item) {
  drag.value = { kind, item }
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', item.name) // Firefox needs some data to start a drag
}
function endDrag() {
  drag.value = null
  dropAt.value = null
}

// Re-time the day for a new order: the day starts when it already did (or the user's day start)
// Re-time the day for an order: the first flexible stop starts when your day starts (Preferences)
function retime(list) {
  const flex = list.filter((s) => !s.locked)
  const locked = list.filter((s) => s.locked)
  return scheduleInOrder(flex, locked, travelMatrix(list.concat(anchorList.value), travelPrefs.value), dayOpts.value)
}

function dropInto(slot) {
  const d = drag.value
  endDrag()
  if (!d || previewing.value) return
  if (d.kind === 'wish') {
    if (!isPick(d.item)) return showToast(d.item.name + ' needs ' + needed.value + ' votes before it can go on a day', false)
    return scheduleWish(d.item, slot)
  }
  const list = stopRows.value.map((it) => it.stop)
  const from = list.findIndex((s) => s.id === d.item.id)
  if (from < 0) return
  const [moved] = list.splice(from, 1)
  list.splice(from < slot ? slot - 1 : slot, 0, moved)
  save(retime(list).map((it) => ({ id: it.stop.id, hour: it.start })))
}

// A wishlist place onto the timeline: a new stop, then the day is re-timed around it
// Which city a stop is in: its own city, or the city of the saved place with the same name
function cityOf(stop) {
  if (stop.city) return stop.city
  const list = sampleMode.value ? sample.value.wishlist : props.wishlist
  const match = list.find((w) => w.name.toLowerCase() === (stop.name || '').toLowerCase())
  return match && match.city ? match.city : null
}

// Is this place in a different city from what's already on the day?
// Uses the saved cities when both are known, otherwise the distance (over 40 km apart).
function otherCityOnDay(w) {
  const wCity = w.city || null
  const wPoint = w.lat != null ? w : coordsFor(w)
  for (const it of stopRows.value) {
    const sCity = cityOf(it.stop)
    if (wCity && sCity) {
      if (wCity !== sCity) return sCity
      continue
    }
    if (wPoint && it.stop.lat != null && haversineKm(wPoint, it.stop) > 40) return sCity || 'another city'
  }
  return null
}

function scheduleWish(w, slot, confirmed = false, roomOk = false) {
  if (previewing.value) return
  // Two cities on one day? Ask first (travel between cities eats the day)
  const other = confirmed ? null : otherCityOnDay(w)
  if (other) {
    const here = w.city ? w.city.split(', ')[0] : 'a different city'
    openConfirm({
      kind: 'city',
      title: w.name + ' is in ' + here,
      lines: ['Day ' + (dayIndex.value + 1) + ' is planned in ' + other.split(', ')[0] + '. Add it to this day anyway?'],
      button: 'Add anyway',
      danger: false,
      wish: w,
      slot
    })
    return
  }
  const fresh = toWork({ id: '__new', name: w.name, address: w.address || null, outdoor: !!w.outdoor, duration: w.duration || 1.5, lat: w.lat, lon: w.lon, hour: 0 })
  const list = stopRows.value.map((it) => it.stop)
  list.splice(slot, 0, fresh)
  const items = retime(list)
  const changes = items.map((it) => ({ id: it.stop.id, hour: it.start }))
  // Doesn't fit before the day ends? Suggest a day with room (or add it anyway)
  if (!roomOk && !sampleMode.value && endsLate(items)) {
    const date = bestDayFor(fresh, {})
    openConfirm({
      kind: 'full',
      title: w.name + " won't fit on Day " + (dayIndex.value + 1),
      lines: [dayEndReason.value + ', and this day is already full.' +
        (date ? ' ' + dayLabel(date) + ' has room for it.' : ' No other day has room either: add it anyway, then take something off.')],
      button: date ? 'Add to ' + dayLabel(date).split(' (')[0] : 'Add anyway',
      alt: date ? 'Add anyway' : null,
      wish: w,
      slot,
      date
    })
    return
  }
  if (sampleMode.value) {
    const id = 'p-' + Date.now().toString(36)
    sample.value.stops.push({ ...w, id, date: sample.value.day, duration: w.duration || 1.5, locked: false, hour: 0 })
    sample.value.wishlist = sample.value.wishlist.filter((x) => x.id !== w.id)
    save(changes.map((c) => (c.id === '__new' ? { ...c, id } : c)))
  } else {
    emit('schedule', w, changes) // the parent creates the stop for '__new'
    liveText.value = w.name + ' added'
  }
}

// A tap on a saved place's card adds it to the end of the day (its + button handles its own click)
function wishClick(w, event) {
  if (event.target.closest('button')) return
  scheduleWish(w, stopRows.value.length)
}

function dropOnDrawer() {
  const d = drag.value
  endDrag()
  if (d && d.kind === 'stop') unschedule(d.item)
}

// Take a stop off the day and put it back in Saved places (with Undo, in case it was a mistake)
function unschedule(stop) {
  if (previewing.value) return
  if (sampleMode.value) {
    sampleUndo = JSON.stringify(sample.value)
    const s = sample.value.stops.find((x) => x.id === stop.id)
    sample.value.stops = sample.value.stops.filter((x) => x.id !== stop.id)
    if (s) sample.value.wishlist.push({ id: 'pw-' + s.id, name: s.name, city: s.city || null, outdoor: s.outdoor, lat: s.lat, lon: s.lon, address: s.address })
  } else {
    emit('unschedule', stop.id)
  }
  // A flight or a hotel visit just comes off the day; places go back to Saved places
  if (stop.kind === 'flight' || stop.kind === 'hotel') return showToast(stop.name + ' removed from the day')
  drawerOpen.value = true
  showToast(stop.name + ' moved back to Saved places')
}

// Arrow buttons: swap with the stop before/after, re-time the day, and offer Undo
function moveStop(i, to) {
  if (previewing.value || to < 0 || to >= stopRows.value.length) return
  const before = []
  for (const it of stopRows.value) before.push({ id: it.stop.id, hour: it.start })
  const list = stopRows.value.map((it) => it.stop)
  const [moved] = list.splice(i, 1)
  list.splice(to, 0, moved)
  save(retime(list).map((it) => ({ id: it.stop.id, hour: it.start })))
  showToast(moved.name + ' moved ' + (to < i ? 'earlier' : 'later'), () => save(before))
}
// Dragging over a card: drop above it (top half) or below it (bottom half)
function overCard(e, i) {
  if (!drag.value) return
  const box = e.currentTarget.getBoundingClientRect()
  dropAt.value = e.clientY < box.top + box.height / 2 ? i : i + 1
}

// ---------- display helpers ----------
// Categories, checked in this order (so "People's Park station" is Transport, not Nature)
const CATEGORIES = [
  { key: 'transport', label: 'Transport', icon: '🚉', words: ['station', 'metro', 'subway', 'airport', 'terminal', 'pier', 'ferry', 'bus stop', 'railway', 'mrt'] },
  { key: 'food', label: 'Food', icon: '🍜', words: ['restaurant', 'dinner', 'lunch', 'breakfast', 'brunch', 'cafe', 'café', 'food', 'bar', 'kyoja', 'ramen', 'sushi', 'hawker', 'market'] },
  { key: 'culture', label: 'Culture', icon: '⛩️', words: ['temple', 'shrine', 'museum', 'palace', 'castle', 'gallery', 'dera', 'taisha', 'jinja', 'ji', 'church', 'mosque', 'cathedral', 'monument', 'statue', 'memorial', 'tour', 'pagoda', 'fort'] },
  { key: 'shopping', label: 'Shopping', icon: '🛍️', words: ['mall', 'shop', 'shopping', 'store', 'outlet', 'plaza'] },
  { key: 'nature', label: 'Nature', icon: '🌿', words: ['park', 'garden', 'forest', 'grove', 'bamboo', 'mountain', 'beach', 'lake', 'river', 'hike', 'trail', 'falls', 'waterfall', 'island'] }
]
const SIGHT = { key: 'sight', label: 'Sight', icon: '📍' }
const FLIGHT_CAT = { key: 'transport', label: 'Flight', icon: '✈️' }
const HOTEL_CAT = { key: 'hotel', label: 'Hotel', icon: '🏨' }
// The type a place was saved with in Places (from OpenStreetMap) beats guessing from the name
const TYPE_TO_CATEGORY = {
  museum: 'culture', gallery: 'culture', heritage: 'culture', food: 'food', shop: 'shopping',
  park: 'nature', zoo: 'nature', transport: 'transport'
}
function categoryOf(s) {
  if (s.kind === 'flight') return FLIGHT_CAT
  if (s.kind === 'hotel') return HOTEL_CAT
  const list = sampleMode.value ? sample.value.wishlist : props.wishlist
  const saved = s.type ? s : list.find((w) => w.name.toLowerCase() === (s.name || '').toLowerCase())
  const fromType = saved && TYPE_TO_CATEGORY[saved.type]
  if (fromType) return CATEGORIES.find((c) => c.key === fromType)
  // Whole words only ("bar" shouldn't match "Barcelona"; "ji" only as in "Kinkaku-ji")
  const words = (s.name || '').toLowerCase().split(/[^a-z\u00c0-\u024f]+/)
  for (const c of CATEGORIES) {
    for (const w of c.words) {
      if (w.includes(' ') ? (s.name || '').toLowerCase().includes(w) : words.includes(w)) return c
    }
  }
  return SIGHT
}
function thumbStyle(s) {
  const url = photos.value[photoKey(s)]
  return url ? { backgroundImage: 'url(' + url + ')' } : null
}
function formatHour(h) {
  const hour = Math.floor(h) % 24
  const min = Math.round((h - Math.floor(h)) * 60)
  return (hour % 12 === 0 ? 12 : hour % 12) + ':' + String(min).padStart(2, '0') + (hour >= 12 ? ' PM' : ' AM')
}
function shortDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}
function durationText(h) {
  const hrs = h || 1
  if (hrs < 1) return Math.round(hrs * 60) + ' min'
  const whole = Math.floor(hrs)
  const min = Math.round((hrs - whole) * 60)
  if (min === 30) return (whole + 0.5) + ' hrs'
  return whole + (whole === 1 ? ' hr' : ' hrs') + (min ? ' ' + min + 'm' : '')
}
// Status emoji from the optimizer -> the matching line icon (weather and place types stay as pictures)
const LINE_ICONS = { '⏰': 'clock', '⏳': 'clock', '⚠️': 'alert', '⚠': 'alert', '🍽': 'utensils', '👥': 'users', '🔒': 'lock', '🚇': 'train', '🚶': 'footprints', '🚪': 'door', '📍': 'map-pin' }
function lineIcon(emoji) {
  return LINE_ICONS[emoji] || ''
}
// ---------- the travel strip between two stops ----------
// The stop before this one in the day's order
function prevStopOf(it) {
  const rows = stopRows.value
  const i = rows.findIndex((x) => x.stop.id === it.stop.id)
  return i > 0 ? rows[i - 1] : null
}
// The way used for this leg, with why (from the travel model in dayOptimizer.js)
function legEntry(it) {
  const prev = prevStopOf(it)
  if (!prev || !matrix.value[prev.stop.id]) return {}
  return matrix.value[prev.stop.id][it.stop.id] || {}
}
function legIcon(it) {
  return TRAVEL_MODES[it.mode] ? TRAVEL_MODES[it.mode].icon : 'map-pin'
}
function legText(it) {
  if (it.mode === 'break') return ''
  if (it.mode === 'unknown') return '~' + it.travelMin + ' min (place not found on the map)'
  if (!TRAVEL_MODES[it.mode]) return ''
  const e = legEntry(it)
  return TRAVEL_MODES[it.mode].label + ' · ' + it.travelMin + ' min' + (e.live ? '' : ' (est.)')
}
// Short note after it: who picked it, or why it's suggested (the panel has the full reason)
function legNote(it) {
  const e = legEntry(it)
  if (e.picked) return it.stop.travelBy ? 'picked by ' + (it.stop.travelBy === props.me ? 'you' : it.stop.travelBy) : 'picked'
  const r = e.reason || ''
  const walk = r.match(/walking is (\d+) min/)
  if (r.startsWith('fastest') || r.startsWith('cheapest')) return r.split(';')[0]
  if (walk) return 'a walk would be ' + walk[1] + ' min'
  return r === 'short walk' ? '' : r
}

// The leg panel (LegSheet)
const legOpen = ref(null) // { fromId, toId }
let legOpener = null
function openLeg(it) {
  const prev = prevStopOf(it)
  if (!prev || it.mode === 'unknown' || previewing.value) return
  legOpener = document.activeElement
  legOpen.value = { fromId: prev.stop.id, toId: it.stop.id }
  fetchLeg(prev.stop, it.stop)
}
function closeLeg() {
  legOpen.value = null
  nextTick(() => { if (legOpener && legOpener.focus) legOpener.focus() })
}
const legView = computed(() => {
  if (!legOpen.value) return null
  if (legOpen.value.anchor) return anchorLegView(legOpen.value.anchor)
  const rows = stopRows.value
  const fromIt = rows.find((x) => x.stop.id === legOpen.value.fromId)
  const toIt = rows.find((x) => x.stop.id === legOpen.value.toId)
  if (!fromIt || !toIt || fromIt.stop.lat == null || toIt.stop.lat == null) return null
  const a = exitOf(fromIt.stop)
  const b = toIt.stop
  const tp = travelPrefs.value
  const options = travelOptions(a, b, tp)
  const rec = recommendTravel(options, tp)
  const chosen = b.travelMode && b.travelFrom === a.id ? b.travelMode : ''
  return {
    fromName: a.name, toName: b.name,
    from: { lat: a.lat, lon: a.lon }, to: { lat: b.lat, lon: b.lon },
    leaveText: formatHour(fromIt.start + (a.duration || 1)),
    options, recommended: rec.option.mode, reason: rec.reason,
    chosen, chosenBy: chosen ? (b.travelBy === props.me ? 'You' : b.travelBy) : '',
    group: tp.group, maxWalk: tp.maxWalk, modes: tp.modes, priority: tp.priority,
    checking: !!asking.value[legKey(a, b)]
  }
})
// Hotel/airport legs: shown with the suggestion, but not chosen per leg (they follow your settings)
function anchorLegView(which) {
  const rows = stopRows.value
  if (!rows.length) return null
  const a = which === 'start' ? startAnchor.value : exitOf(rows[rows.length - 1].stop)
  const b = which === 'start' ? rows[0].stop : endAnchor.value
  if (!a || !b || a.lat == null || b.lat == null) return null
  const tp = travelPrefs.value
  const options = travelOptions(a, b, tp)
  const rec = recommendTravel(options, tp)
  const leave = which === 'start' ? rows[0].start - rec.option.min / 60 : rows[rows.length - 1].start + (a.duration || 1)
  return {
    fromName: a.name, toName: b.name, from: { lat: a.lat, lon: a.lon }, to: { lat: b.lat, lon: b.lon },
    leaveText: formatHour(Math.max(0, leave)), options, recommended: rec.option.mode, reason: rec.reason,
    chosen: '', chosenBy: '', readonly: true,
    group: tp.group, maxWalk: tp.maxWalk, modes: tp.modes, priority: tp.priority,
    checking: !!asking.value[legKey(a, b)]
  }
}
// A way was chosen (or null = back to the suggestion): save it on the stop and re-time the day
function chooseTravel(mode) {
  const leg = legOpen.value
  if (!leg) return
  const travel = mode ? { mode, from: leg.fromId, by: props.me || '' } : null
  const list = []
  let name = ''
  for (const x of stopRows.value) {
    if (x.stop.id === leg.toId) {
      name = x.stop.name
      list.push({ ...x.stop, travelMode: travel ? travel.mode : null, travelFrom: travel ? travel.from : null, travelBy: travel ? travel.by : '' })
    } else {
      list.push(x.stop)
    }
  }
  const items = retime(list)
  const changes = []
  for (const it of items) if (!it.stop.virtual) changes.push({ id: it.stop.id, hour: Math.min(it.start, 23.75) })
  if (sampleMode.value) {
    const s = sample.value.stops.find((x) => x.id === leg.toId)
    if (s) s.travel = travel
    save(changes)
  } else {
    emit('travel', leg.toId, travel, changes)
  }
  legOpen.value = null
  explainLocked(items, mode ? TRAVEL_MODES[mode].label + ' to ' + name : 'Suggested way to ' + name)
}
function wasAt(it) {
  if (!previewing.value) return null
  const b = preview.value.before.items.find((x) => x.stop.id === it.stop.id)
  return b && Math.abs(b.start - it.start) > 0.01 ? b.start : null
}
function pillsFor(it) {
  if (previewing.value) return (it.reasons || []).filter((r) => r.kind !== 'travel')
  return dayWarnings(it).map((w) => ({ ...w, kind: 'warn' }))
}
// The usual warnings, plus the flights: a stop before you land, or too late for your flight home
function dayWarnings(it) {
  const o = dayOpts.value
  const s = startAnchor.value
  const e = endAnchor.value
  const landing = s && s.kind === 'arrive'
  const leaving = e && e.kind === 'depart'
  const out = []
  if (it.stop.virtual) return out
  if (it.start < o.dayStart - 0.01) {
    if (landing) out.push({ icon: '✈️', text: 'Starts before you land (' + formatHour(s.hour) + ')' })
    else if (!it.stop.locked) out.push({ icon: '🌅', text: 'Before your day starts' })
  }
  for (const w of warningsFor(it, rain.value, o)) {
    if (w.icon === '🌅' && landing) continue
    if (w.icon === '🍽' && leaving && e.early) continue // no day today at all: "no time for lunch" is beside the point
    if (w.icon === '⏰' && leaving) {
      out.push({ icon: '✈️', text: e.early ? 'No time today: your flight home leaves at ' + formatHour(e.hour) : 'Too late for your ' + formatHour(e.hour) + ' flight home' })
      continue
    }
    out.push(w)
  }
  return out
}
// ---------- weather + crowds at each stop (the small icons on every card) ----------
const WEATHER_ICONS = { Clear: '☀️', Clouds: '⛅', Rain: '🌧️', Drizzle: '🌦️', Thunderstorm: '⛈️', Snow: '❄️' }
function weatherIcon(b) {
  if (b.condition === 'Clear' && (b.time >= 19 || b.time < 6)) return '🌙'
  if (WEATHER_ICONS[b.condition]) return WEATHER_ICONS[b.condition]
  return b.rain ? '🌧️' : '🌫️'
}
// The day's forecast, each 3-hour block with its icon
const dayBlocks = computed(() => {
  const list = []
  if (sampleMode.value) return list
  for (const b of effectiveWeatherBlocks.value) list.push({ ...b, icon: weatherIcon(b) })
  return list
})
function blockAt(h) {
  for (const b of dayBlocks.value) {
    if (Math.floor(h) >= b.time && Math.floor(h) < b.time + (b.span || 3)) return b
  }
  return null
}

function isRainAffected(it) {
  if (previewing.value) return false
  const w = weatherOf(it)
  return w.tone === 'bad' && w.icon === '🌧️'
}

function weatherOf(it) {
  const b = blockAt(it.start)
  if (!b) {
    // Too far ahead for a forecast: show what that month is usually like (marked with ~)
    const t = props.typical
    if (t) {
      const wetMonth = t.rainyDays != null && t.rainyDays >= 12
      return {
        icon: wetMonth ? '🌦️' : t.temp >= 24 ? '☀️' : '⛅', text: '~' + t.temp + '°', tone: 'none',
        title: 'Typical for ' + t.month + ' in ' + t.place + ': about ' + t.temp + '°C' +
          (t.rainyDays != null ? ', rain on about ' + t.rainyDays + ' days of the month' : '') + '. The live forecast shows about 5 days before.'
      }
    }
    return { icon: '🌤️', text: '–', tone: 'none', title: 'No forecast yet (forecasts reach about 5 days ahead)' }
  }
  const wet = it.stop.outdoor && rainDuring(rain.value, it.start, it.stop.duration) >= 0.5
  const temp = b.temp != null ? b.temp + '°' : ''
  return {
    icon: b.icon, text: temp || b.condition, tone: wet ? 'bad' : 'ok',
    title: b.condition + (temp ? ', ' + temp + 'C' : '') + (wet ? ' · outdoors in the rain' : '')
  }
}
// track stop from demo
const demoStopId = ref('')
const simulationCrowdLevel = ref('Peak')
const SIM_CROWD = [{ value: 'Quiet', label: 'Quiet', icon: '🟢' }, { value: 'Busy', label: 'Busy', icon: '🟠' }, { value: 'Peak', label: 'Peak', icon: '🔴' }]

const crowdSimulation = ref(null)
const crowdOverrides = ref({}) // store selected crwod status for demo

function crowdOf(it) {
  const s = it.stop
  const stopKey = s.id || s.name
  let c

  if (stopKey in crowdOverrides.value) {
    c = crowdOverrides.value[stopKey]
  } else {
    if (!s.crowd && !s.popular) return { value: null, text: '–', tone: 'none', title: 'No crowd data (no address)' }
    c = Math.round(crowdAt(s, it.start))
  }
  const level = c >= 80 ? { text: 'Peak', tone: 'bad' } : c >= 55 ? { text: 'Busy', tone: 'mid' } : { text: 'Quiet', tone: 'ok' }
  const isSimulated = stopKey in crowdOverrides.value

  return { value: c, text: level.text, tone: level.tone, title: level.text + ' at this time, about ' + c + '% of its busiest' + (isSimulated ? ' (Simulated)' : (s.crowd ? '' : ' (estimate)')), isSimulated }
}
// Rain and crowds already show as the coloured icons, so the card doesn't repeat them as pills
function cardPills(it) {
  const list = []
  for (const p of pillsFor(it)) {
    if (previewing.value || (p.icon !== '🌧️' && p.icon !== '👥')) list.push(p)
  }
  return list
}

// Free times on this day that fit the stop without clashing with the others (best first)
function freeTimes(it, isGood) {
  const s = it.stop
  const dur = s.duration || 1
  const out = []
  for (let h = opts.value.dayStart; h + dur <= opts.value.dayEnd + 0.01; h += 0.5) {
    if (Math.abs(h - it.start) < 0.01) continue
    if (s.open != null && h < s.open) continue
    if (s.close != null && h + dur > s.close) continue
    let clash = false
    for (const o of stopRows.value) {
      if (o.stop.id !== s.id && h < o.start + (o.stop.duration || 1) + 0.25 && h + dur + 0.25 > o.start) clash = true
    }
    if (clash || !isGood(h)) continue
    out.push({ hour: h, crowd: s.crowd || s.popular ? Math.round(crowdAt(s, h)) : null })
  }
  out.sort((a, b) => (a.crowd || 0) - (b.crowd || 0) || a.hour - b.hour)
  return out.slice(0, 3)
}

function previewCascadeForMove(it, newHour) {
  const movedDuration = it.stop.duration || 1

  // Create a temporary imaginary schedule.
  const proposedRows = stopRows.value.map((row) => ({
    id: row.stop.id,
    name: row.stop.name,
    hour:
      row.stop.id === it.stop.id
        ? newHour
        : row.start,
    duration: row.stop.duration || 1,
    open: row.stop.open,
    close: row.stop.close
  }))

  // Find stops that clash with the moved stop.
  const affected = proposedRows
    .filter((row) => {
      if (row.id === it.stop.id) return false

      return (
        newHour < row.hour + row.duration + 0.25 &&
        newHour + movedDuration + 0.25 > row.hour
      )
    })
    // Handle earlier affected activities first
    .sort((a, b) => a.hour - b.hour)

  const suggestions = []

  // Start looking AFTER the moved stop finishes
  let nextAvailableHour =
    newHour + movedDuration + 0.25

  // Round up to nearest 30 minutes
  nextAvailableHour =
    Math.ceil(nextAvailableHour * 2) / 2

  for (const affectedStop of affected) {
    let suggestedHour = null

    for (
      let h = nextAvailableHour;
      h + affectedStop.duration <= opts.value.dayEnd + 0.01;
      h += 0.5
    ) {
      // Respect opening hours
      if (
        affectedStop.open != null &&
        h < affectedStop.open
      ) {
        continue
      }

      if (
        affectedStop.close != null &&
        h + affectedStop.duration > affectedStop.close
      ) {
        continue
      }

      // Check against the temporary schedule
      const clash = proposedRows.some((other) => {
        if (other.id === affectedStop.id) return false

        return (
          h < other.hour + other.duration + 0.25 &&
          h + affectedStop.duration + 0.25 > other.hour
        )
      })

      if (clash) continue

      suggestedHour = h
      break
    }

    suggestions.push({
      id: affectedStop.id,
      name: affectedStop.name,
      fromHour: affectedStop.hour,
      toHour: suggestedHour
    })

    // IMPORTANT:
    // Update the imaginary schedule with the suggested time.
    if (suggestedHour != null) {
      const row = proposedRows.find(
        (r) => r.id === affectedStop.id
      )

      if (row) {
        row.hour = suggestedHour
      }

      // Next affected stop must come after this one.
      nextAvailableHour =
        suggestedHour +
        affectedStop.duration +
        0.25

      nextAvailableHour =
        Math.ceil(nextAvailableHour * 2) / 2
    }
  }

  return suggestions
}

function quieterTimes(it) {
  // if (!it.stop.crowd && !it.stop.popular) return []
  // const now = crowdAt(it.stop, it.start)
  // 1. Get current crowd level (checks crowdOverrides first, falls back to live data)
  const currentCrowd = crowdOf(it)
  if (currentCrowd.value == null) return []

  // 2. Baseline value (simulated override or live percentage)
  const now = currentCrowd.value

  return freeTimes(it, (h) => crowdAt(it.stop, h) <= now - 10)
}
function dryTimes(it) {
  if (!rain.value) return []
  return freeTimes(it, (h) => rainDuring(rain.value, h, it.stop.duration) < 0.5)
}

const clearTimeOptions = computed(() => {
  if (
    !weatherSimulation.value ||
    weatherSimulation.value.condition !== 'Rain'
  ) {
    return []
  }

  const sim = weatherSimulation.value

  const it = stopRows.value.find(
    (row) => row.stop.id === sim.stopId
  )

  if (!it) return []

  const s = it.stop
  const dur = s.duration || 1
  const options = []

  for (
    let h = opts.value.dayStart;
    h + dur <= opts.value.dayEnd + 0.01;
    h += 0.5
  ) {
    // Don't suggest its current time
    if (Math.abs(h - it.start) < 0.01) continue

    // Must be within opening hours
    if (s.open != null && h < s.open) continue
    if (s.close != null && h + dur > s.close) continue

    const activityEnd = h + dur

    // Find all weather blocks overlapping the proposed activity
    const weatherDuringActivity =
      effectiveWeatherBlocks.value.filter((block) => {
        const blockStart = block.time
        const blockEnd = block.time + (block.span || 3)

        return (
          blockStart < activityEnd &&
          blockEnd > h
        )
      })

    if (!weatherDuringActivity.length) continue

    // Entire activity must be dry
    if (weatherDuringActivity.some((block) => block.rain)) {
      continue
    }

    // Find itinerary stops that would conflict with this new time
    const conflicts = stopRows.value.filter((other) => {
      if (other.stop.id === s.id) return false

      const otherDur = other.stop.duration || 1

      return (
        h < other.start + otherDur + 0.25 &&
        h + dur + 0.25 > other.start
      )
    })

    const startWeather =
      weatherDuringActivity.find(
        (block) =>
          h >= block.time &&
          h < block.time + (block.span || 3)
      ) || weatherDuringActivity[0]

    options.push({
      hour: h,
      temp: startWeather.temp,
      condition: startWeather.condition,

      // NEW:
      conflicts: conflicts.map((row) => row.stop.name),
      requiresAdjustment: conflicts.length > 0
    })
  }

  // Prefer options with no conflicts first
  options.sort((a, b) => {
    if (a.requiresAdjustment !== b.requiresAdjustment) {
      return a.requiresAdjustment ? 1 : -1
    }

    return a.hour - b.hour
  })

  // Avoid showing several almost-identical times
  const variedOptions = []

  for (const option of options) {
    const tooClose = variedOptions.some(
      (chosen) => Math.abs(chosen.hour - option.hour) < 1.5
    )

    if (!tooClose) {
      variedOptions.push(option)
    }

    if (variedOptions.length === 3) break
  }

  return variedOptions
})


// ---------- things to check (the ⚠ pill next to Optimize Route) ----------
const issues = computed(() => {
  const list = []
  if (previewing.value) return list
  for (const it of timeline.value) {
    for (const w of dayWarnings(it)) {
      const x = { key: it.stop.id + w.icon + w.text, it, icon: w.icon, text: w.text, section: 'time', fixLabel: 'Options', fix: null }
      if ((w.icon === '✈️' || w.icon === '🌅' || w.icon === '⏰') && !it.stop.locked) {
        x.fixLabel = 'Re-time day'
        x.fix = () => { issuesOpen.value = false; fitDayToPrefs(w.icon === '✈️' ? 'Day planned around your flight' : 'Day re-timed to fit your hours') }
      } else if (w.icon === '👥') {
        x.section = 'crowd'
        const q = quieterTimes(it)
        if (q.length) {
          x.fixLabel = 'Move to ' + formatHour(q[0].hour)
          x.fix = () => { issuesOpen.value = false; moveTime(it, q[0].hour) }
        }
      } else if (w.icon === '🌧️') {
        x.section = 'weather'
      } else if (w.icon !== '🚪' && stopRows.value.length > 1) {
        x.fixLabel = 'Optimize'
        x.fix = () => { issuesOpen.value = false; optimize() }
      }
      if (!x.fix) x.fix = () => openSheet(it, x.section)
      list.push(x)
    }
  }
  return list
})
watch(issues, (list) => { if (!list.length) issuesOpen.value = false })

// Other days: what the parent worked out (this day uses the live list above)
function issuesOn(d) {
  if (d === dayShown.value) return issues.value.length
  return (props.dayIssues[d] && props.dayIssues[d].issues) || 0
}
function loadOf(d) {
  return (props.dayIssues[d] && props.dayIssues[d].load) || 0
}
function loadText(d) {
  const pct = Math.round(loadOf(d) * 100)
  return pct ? pct + '% of your active hours planned' : 'Nothing planned'
}

// ---------- stop sheet (crowds, weather, time & details) ----------
const sheet = ref(null) // { id, section }
let sheetOpener = null
const sheetItem = computed(() => (sheet.value ? stopRows.value.find((it) => it.stop.id === sheet.value.id) || null : null))
const sheetStop = computed(() => {
  if (!sheet.value) return null
  const list = sampleMode.value ? sample.value.stops : props.stops
  return list.find((s) => s.id === sheet.value.id) || null
})
const dayNameShown = computed(() => (dayShown.value ? new Date(dayShown.value + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : props.dayName))
const dayOptions = computed(() => {
  const list = []
  for (let n = 0; n < dayList.value.length; n++) {
    const d = dayList.value[n]
    list.push({ value: d, label: 'Day ' + (n + 1) + ' · ' + longDate(d), description: d === dayShown.value ? 'This day' : countFor(d) ? countFor(d) + ' stops' : 'Free' })
  }
  return list
})
const indoorPicks = computed(() => picks.value.filter((w) => !w.outdoor).slice(0, 5)) // group picks only

function openSheet(it, section) {
  issuesOpen.value = false
  sheetOpener = document.activeElement
  sheet.value = { id: it.stop.id, section }
}
function closeSheet() {
  sheet.value = null
  nextTick(() => { if (sheetOpener && sheetOpener.focus) sheetOpener.focus() })
}
// A stop gets a new time; the toast can put every stop back where it was
function moveTime(it, hour) {
  const before = []
  for (const x of stopRows.value) before.push({ id: x.stop.id, hour: x.stop.hour })
  save([{ id: it.stop.id, hour }])
  showToast(it.stop.name + ' moved to ' + formatHour(hour), () => save(before))
}
function sheetMoveTime(hour) {
  if (sheetItem.value) moveTime(sheetItem.value, hour)
}
function sheetMoveDay(date) {
  const name = sheetItem.value.stop.name
  emit('move-day', sheet.value.id, date)
  sheet.value = null
  showToast(name + ' moved to Day ' + (dayList.value.indexOf(date) + 1))
}
function sheetSwap(wishId) {
  const pick = unscheduled.value.find((w) => w.id === wishId)
  const name = sheetItem.value.stop.name
  emit('swap', sheet.value.id, wishId)
  sheet.value = null
  showToast((pick ? pick.name : 'An indoor place') + ' swapped in · ' + name + ' is back in Saved places')
}
function sheetEdit(fields) {
  emit('edit', sheet.value.id, fields)
  showToast('Details saved')
}

const totals = computed(() => {
  let walk = 0
  let ride = 0 // minutes on transit, in taxis or on bikes (and legs we couldn't place)
  for (const it of stopRows.value) {
    if (it.mode === 'walk') walk += it.km || 0
    else if (it.mode !== 'start' && it.mode !== 'break') ride += it.travelMin || 0
  }
  return { walkKm: walk.toFixed(1), transitMin: ride }
})

// ---------- numbered stops (same colour on the list and the map) ----------
const NUMBER_COLORS = ['#00798c', '#d1495b', '#edae49', '#30638e']
function numberColor(i) {
  return NUMBER_COLORS[i % NUMBER_COLORS.length]
}

// ---------- map view ----------
const view = ref('list')          // 'list' | 'map'
const selectedId = ref(null)      // the stop shown under the map
const mapEl = ref(null)
const mapError = ref('')
let map = null
let layer = null

const mapRows = computed(() => stopRows.value.filter((it) => it.stop.lat != null))
// Real places of the day that have no map position yet (meal breaks aren't places)
const unmapped = computed(() => {
  const names = []
  for (const it of stopRows.value) {
    if (it.stop.lat == null && placeText(it.stop)) names.push(it.stop.name)
  }
  return names
})
const selected = computed(() => {
  const list = stopRows.value
  return list.find((it) => it.stop.id === selectedId.value) || list[0] || null
})
const selectedIndex = computed(() => stopRows.value.findIndex((it) => selected.value && it.stop.id === selected.value.stop.id))

function openOnMap(stop) {
  selectedId.value = stop.id
  view.value = 'map'
}
function stepSelected(step) {
  const i = selectedIndex.value + step
  if (i >= 0 && i < stopRows.value.length) selectedId.value = stopRows.value[i].stop.id
}

// Which map tiles to use (asked once)
let tilesPromise = null
function tileConfig() {
  if (!tilesPromise) {
    tilesPromise = axios.get('/api/maps/config', { keep: true, timeout: 4000 }) // quick: the map shouldn't wait
      .then((res) => res.data)
      .catch(() => ({
        tiles: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
      }))
  }
  return tilesPromise
}

async function drawMap() {
  if (view.value !== 'map') return
  await nextTick()
  if (!mapEl.value) return
  let L
  try {
    L = await loadLeaflet()
  } catch (err) {
    mapError.value = 'The map could not load. Check your internet connection.'
    return
  }
  mapError.value = ''
  if (!map || map.getContainer() !== mapEl.value) {
    if (map) map.remove()
    map = L.map(mapEl.value, { zoomControl: true, attributionControl: true })
    // Tiles: MapTiler if the server has a key (MAPTILER_KEY in server/.env), otherwise OpenStreetMap
    const tiles = await tileConfig()
    L.tileLayer(tiles.tiles, { maxZoom: 19, attribution: tiles.attribution }).addTo(map)
  }
  if (layer) layer.remove()
  layer = L.layerGroup().addTo(map)
  const points = []
  for (const it of mapRows.value) {
    const i = stopRows.value.indexOf(it)
    const point = [it.stop.lat, it.stop.lon]
    points.push(point)
    const active = selected.value && selected.value.stop.id === it.stop.id
    const icon = L.divIcon({
      className: '',
      html: '<span class="ip-pin' + (active ? ' active' : '') + '" style="background:' + numberColor(i) + '">' + (i + 1) + '</span>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
    L.marker(point, { icon, title: it.stop.name, keyboard: true })
      .on('click', () => { selectedId.value = it.stop.id })
      .addTo(layer)
  }
  if (points.length > 1) L.polyline(points, { color: '#d1495b', weight: 4, opacity: 0.85, dashArray: '1 8', lineCap: 'round' }).addTo(layer)
  if (points.length > 1) L.polyline(points, { color: '#d1495b', weight: 3, opacity: 0.55 }).addTo(layer)
  if (points.length === 1) map.setView(points[0], 15)
  else if (points.length) map.fitBounds(points, { padding: [40, 40] })
  else map.setView([20, 0], 2)
  setTimeout(() => map && map.invalidateSize(), 50)
}
watch([view, () => mapRows.value.map((it) => it.stop.id + it.stop.lat).join(), selectedId], drawMap)
onBeforeUnmount(() => {
  if (map) map.remove()
  map = null
})

function directionsUrl(stop) {
  const dest = stop.lat != null ? stop.lat + ',' + stop.lon : encodeURIComponent(stop.address || stop.name)
  return 'https://www.google.com/maps/dir/?api=1&destination=' + dest
}
function hoursText(stop) {
  if (stop.open == null || stop.close == null) return ''
  return 'Open ' + formatHour(stop.open) + ' – ' + formatHour(stop.close)
}

// demo crowd 
// set a stop's crowd status
function applyCrowdSimulation() {
  
  if (!demoStopId.value) return

  const presetMap = { Quiet: 25, Busy: 65, Peak: 90 }
  const selectedLevel = simulationCrowdLevel.value
  const targetId = demoStopId.value

  crowdOverrides.value = {
    ...crowdOverrides.value,
    [targetId]: presetMap[selectedLevel] ?? 50
  }

  const targetStop = stopRows.value.find(item => item.stop.id === targetId)
  crowdSimulation.value = {
    stopId: targetId,
    stopName: targetStop?.stop?.name || targetId,
    level: selectedLevel
  }
}

// reset all simulations back to live data
function resetCrowdSimulation() {
  crowdOverrides.value = {}
  crowdSimulation.value = null
  demoStopId.value = ''
}

// select the first stop
watch(
  () => stopRows.value,
  (newRows) => {
    if (newRows && newRows.length > 0 && !demoStopId.value) {
      demoStopId.value = newRows[0].stop.id
    }
  },
  { immediate: true, deep: true }
)

</script>
<style scoped>
.ip {
  --ink: #003d5b;
  --muted: #5a6b78;
  --line: #e6dfd2;
  --primary: #00798c;
  --active: #d1495b;
  margin-bottom: 16px;
  color: var(--ink);
}

/* Day navigator */
.ip-daynav {
  padding: 10px 12px 8px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: #fbf5ea;
}
.ip-daynav-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ip-daynav-where {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}
.ip-daynav-where strong {
  color: var(--ink);
}
.ip-daynav-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ip-small {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: #fbf5ea;
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.ip-small:hover,
.ip-small[aria-expanded='true'] {
  border-color: var(--primary);
  color: var(--primary);
}
.ip-small.add {
  border-style: dashed;
  color: var(--primary);
}
.ip-small.remove {
  border-style: dashed;
  color: #d1495b;
}
.ip-small.remove:hover {
  border-color: #d1495b;
  background: #fbe7ea;
  color: #d1495b;
}

/* Weather + crowd icons on each card */
.ip-sig {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: #efe9df;
  color: var(--ink);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}
.ip-sig:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
}
.ip-sig.ok { background: #fbefd9; color: #004e5a; }
.ip-sig.mid { background: #fff3d6; color: #7a4b00; }
.ip-sig.bad { background: #fbe7ea; color: #d1495b; }
.ip-sig.none { color: var(--muted); }
.ip-sig:focus-visible,
.ip-issues-btn:focus-visible,
.ip-issue-text:focus-visible,
.ip-issue-fix:focus-visible {
  outline: 3px solid rgba(0, 121, 140, 0.45);
  outline-offset: 2px;
}

/* Things to check */
.ip-issues-wrap {
  position: relative;
}
.ip-issues-btn {
  border: 1.5px solid #f0c674;
  background: #fff3d6;
  color: #7a4b00;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 700;
  animation: ip-rise 0.2s ease-out;
}
.ip-issues-btn:hover,
.ip-issues-btn[aria-expanded="true"] {
  background: #ffe9b3;
}
.ip-issues {
  position: absolute;
  left: 0;
  top: calc(100% + 6px);
  z-index: 45;
  width: min(380px, 86vw);
  padding: 12px;
  border-radius: 16px;
  background: #fbf5ea;
  border: 1px solid var(--line);
  box-shadow: 0 18px 40px rgba(0, 40, 62, 0.18);
  animation: ip-rise 0.18s ease-out;
}
.ip-issues-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
}
.ip-issues ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ip-issues li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 12px;
}
.ip-issues li:hover {
  background: #f6f2ea;
}
.ip-issue-icon {
  font-size: 18px;
}
.ip-issue-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 0;
  background: none;
  padding: 0;
  text-align: left;
  color: var(--ink);
}
.ip-issue-text strong {
  font-size: 13px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ip-issue-text small {
  color: var(--muted);
  font-size: 12px;
}
.ip-issue-fix {
  flex-shrink: 0;
  border: 1.5px solid var(--ink);
  background: #fbf5ea;
  color: var(--ink);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.ip-issue-fix:hover {
  background: var(--ink);
  color: #fff;
}
.ip-issues-all {
  width: 100%;
  margin-top: 8px;
}

/* Day strip + grid: how full, and a dot when something needs a look */
.ip-day.flagged {
  position: relative;
}
.ip-day.flagged::after {
  content: '';
  position: absolute;
  top: 6px;
  right: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #e8a317;
}
.ip-grid-day {
  position: relative;
}
.ip-grid-key {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 2px;
  font-size: 11px;
  color: var(--muted);
}
.ip-load {
  display: block;
  width: 36px;
  height: 4px;
  margin-top: 3px;
  border-radius: 999px;
  background: #efe9df;
  overflow: hidden;
}
.ip-load i {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--primary);
}
.ip-load i.over {
  background: #d1495b;
}
.ip-flag {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #e8a317;
}
.ip-flag.inline {
  position: static;
  display: inline-block;
}

/* All-days grid */
.ip-allwrap {
  position: relative;
}
.ip-grid {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 40;
  display: grid;
  grid-template-columns: repeat(7, 64px);
  gap: 6px;
  max-height: 320px;
  overflow-y: auto;
  padding: 10px;
  border-radius: 16px;
  background: #fbf5ea;
  border: 1px solid var(--line);
  box-shadow: 0 18px 40px rgba(0, 40, 62, 0.18);
  animation: ip-rise 0.18s ease-out;
}
.ip-grid-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 2px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fbf5ea;
  color: var(--ink);
  font-size: 11px;
  transition: border-color 0.15s, background 0.15s;
}
.ip-grid-day strong {
  font-size: 15px;
}
.ip-grid-day small {
  color: var(--muted);
  font-size: 10px;
}
.ip-grid-day:hover {
  border-color: var(--primary);
}
.ip-grid-day.on {
  background: var(--active);
  border-color: var(--active);
  color: #fff;
}
.ip-grid-day.on small {
  color: rgba(255, 255, 255, 0.85);
}
.ip-grid-day.today:not(.on) {
  border-color: var(--primary);
  box-shadow: inset 0 0 0 1px var(--primary);
}

/* Strip with arrows */
.ip-strip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.ip-arrow {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: #fbf5ea;
  color: var(--ink);
  font-size: 20px;
  line-height: 1;
  transition: border-color 0.15s, opacity 0.15s;
}
.ip-arrow:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}
.ip-arrow:disabled {
  opacity: 0.3;
}
.ip-strip-wrap {
  flex: 1;
  min-width: 0;
}
/* Faded edges tell you there are more days that way */
.ip-strip-wrap.fade-r .ip-days {
  -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 40px), transparent);
  mask-image: linear-gradient(to right, #000 calc(100% - 40px), transparent);
}
.ip-strip-wrap.fade-l .ip-days {
  -webkit-mask-image: linear-gradient(to left, #000 calc(100% - 40px), transparent);
  mask-image: linear-gradient(to left, #000 calc(100% - 40px), transparent);
}
.ip-strip-wrap.fade-l.fade-r .ip-days {
  -webkit-mask-image: linear-gradient(to right, transparent, #000 40px, #000 calc(100% - 40px), transparent);
  mask-image: linear-gradient(to right, transparent, #000 40px, #000 calc(100% - 40px), transparent);
}
.ip-days {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  padding: 2px;
}
.ip-days::-webkit-scrollbar {
  display: none;
}
.ip-day {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 58px;
  padding: 5px 2px 6px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fbf5ea;
  color: var(--ink);
  line-height: 1.15;
  transition: background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}
.ip-day small {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}
.ip-day strong {
  font-size: 17px;
}
.ip-day-n {
  font-size: 10px;
  color: var(--muted);
}
.ip-day.weekend:not(.on) small {
  color: var(--active);
}
.ip-day:hover {
  transform: translateY(-1px);
  border-color: #d2c8b6;
}
.ip-day.today:not(.on) {
  border-color: var(--primary);
  box-shadow: inset 0 0 0 1px var(--primary);
}
.ip-day.on {
  background: var(--active);
  border-color: var(--active);
  color: #fff;
  box-shadow: 0 6px 14px rgba(209, 73, 91, 0.3);
}
.ip-day.on small,
.ip-day.on .ip-day-n {
  color: rgba(255, 255, 255, 0.85);
}
/* A dot per planned stop (up to 4): busy and empty days at a glance */
.ip-day-dots {
  display: flex;
  gap: 2px;
  height: 5px;
  margin-top: 3px;
}
.ip-day-dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary);
}
.ip-day.on .ip-day-dots i {
  background: #fbf5ea;
}

/* Actions */
.ip-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.ip-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 999px;
  padding: 9px 18px;
  font-weight: 700;
  background: var(--primary);
  color: #fff;
  box-shadow: 0 6px 16px rgba(0, 121, 140, 0.25);
  transition: transform 0.15s, filter 0.15s;
}
.ip-cta:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.06);
}
.ip-cta:disabled:not(.busy) {
  opacity: 0.45;
  box-shadow: none;
}
.ip-cta.busy {
  background: #fbf5ea;
  color: var(--primary);
  box-shadow: inset 0 0 0 1.5px var(--primary);
}
.ip-cta.small,
.ip-outline.small {
  padding: 6px 16px;
}
.ip-spin {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0, 121, 140, 0.25);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: ip-spin 0.8s linear infinite;
}
.ip-totals {
  display: inline-flex;
  gap: 6px;
  font-size: 12px;
}
.ip-totals span {
  padding: 4px 10px;
  border-radius: 999px;
  background: #fbf5ea;
  border: 1px solid var(--line);
  color: var(--muted);
}
.ip-views {
  position: relative;
  margin-left: auto;
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  border-radius: 999px;
  background: #ece6dc;
  box-shadow: inset 0 0 0 1px #e2dacb;
}
/* The highlight that slides under the chosen option */
.ip-views-thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  border-radius: 999px;
  background: var(--ink);
  box-shadow: 0 3px 10px rgba(0, 40, 62, 0.25);
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.ip-views.right .ip-views-thumb {
  transform: translateX(100%);
}
.ip-views button {
  position: relative; /* above the highlight */
  z-index: 1;
  min-width: 108px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: 15px;
  font-weight: 700;
  color: var(--muted);
  transition: color 0.2s;
}
.ip-views button:hover:not(.on) {
  color: var(--ink);
}
.ip-views button.on {
  color: #fff;
}
.ip-views button:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .ip-views-thumb {
    transition: none;
  }
}
.ip-outline {
  border: 1.5px solid var(--primary);
  border-radius: 999px;
  background: transparent;
  color: var(--primary);
  font-weight: 600;
}
.ip-link {
  border: 0;
  background: none;
  padding: 0;
  color: var(--primary);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.ip-sample,
.ip-muted,
.ip-start {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 14px;
  margin: 4px 0 14px;
  padding: 16px;
  border-radius: 20px;
  border: 1.5px dashed #e3d6bf;
  background: #fbf5ea;
}
.ip-start-icon {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #fbefd9;
  color: #c98a1e;
}
.ip-start-text {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ip-start-text strong {
  font-size: 15px;
  color: #001d2c;
}
.ip-start-text small {
  font-size: 13px;
  color: #5a6b78;
}
.ip-start-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ip-empty {
  color: var(--muted);
  font-size: 13px;
  margin: 10px 0 0;
}

/* Preview */
.ip-preview {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #fbefd9;
  border: 1px solid rgba(0, 121, 140, 0.35);
}
.ip-preview.same {
  background: #fbf5ea;
  border-color: var(--line);
}
.ip-preview-btns {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

/* Layout */
.ip-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 20px;
  margin-top: 16px;
  align-items: start;
}
.ip-body.drawer-closed {
  grid-template-columns: minmax(0, 1fr) 220px;
}

/* Timeline: numbered circles joined by a thin line */
.ip-list {
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
}
/* The day's route: a dotted gold line from stop to stop (like a travel journal) */
.ip-list::before {
  content: '';
  position: absolute;
  top: 30px;
  bottom: 40px;
  left: 14px;
  width: 4px;
  background-image: radial-gradient(circle, #edae49 1.6px, transparent 2px);
  background-size: 4px 9px;
  background-repeat: repeat-y;
}
.ip-stop {
  position: relative;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}
.ip-stop.moving {
  opacity: 0.4;
}
.ip-num {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 0 0 4px #fff, 0 4px 10px rgba(0, 40, 62, 0.18);
}
.ip-num.sm {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 26px;
  height: 26px;
  font-size: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
.ip-gap {
  min-height: 12px;
  padding-left: 44px;
  display: flex;
  align-items: center;
  transition: min-height 0.15s;
}
.ip-gap.end:not(.show) {
  min-height: 0;
}
.ip-list.dragging .ip-gap {
  min-height: 40px;
}
/* How you get to the next stop: a small pill with the transport icon in a gold circle */
.ip-leg {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 6px 0;
  padding: 3px 12px 3px 3px;
  border-radius: 999px;
  background: #fbf5ea;
  border: 1px solid #ece4d6;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}
.ip-overflow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 12px;
  margin: 0 0 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: #fbefd9;
  border: 1.5px solid #edae49;
  color: #001d2c;
}
.ip-overflow-icon {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #d1495b;
  color: #fff;
}
.ip-overflow-text {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
}
.ip-overflow-text strong {
  font-size: 14px;
}
.ip-overflow-text small {
  font-size: 12.5px;
  color: #6b5a3e;
}
.ip-anchor-row {
  list-style: none;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin: 0 0 6px;
}
.ip-anchor-row.end {
  margin: 0 0 10px;
}
.ip-anchor {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 520px;
  padding: 10px 14px;
  border: 1.5px solid #ece4d6;
  border-radius: 18px;
  background: #fbf5ea;
  text-align: left;
  color: #001d2c;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ip-anchor:hover {
  border-color: #edae49;
  box-shadow: 0 4px 12px rgba(0, 40, 62, 0.08);
}
.ip-anchor.empty {
  border-style: dashed;
  background: transparent;
}
.ip-anchor-icon {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #003d5b;
  color: #fff;
}
.ip-anchor.empty .ip-anchor-icon {
  background: #f4efe6;
  color: #c98a1e;
}
.ip-anchor-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ip-anchor-text small {
  font-size: 12px;
  color: #5a6b78;
}
.ip-anchor-text strong {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ip-anchor-edit {
  flex: none;
  font-size: 13px;
  font-weight: 700;
  color: #00798c;
}
/* Last day: "Where does the day end?" with two answers side by side */
.ip-end-choice {
  width: 100%;
  max-width: 520px;
  padding: 12px;
  border: 1.5px dashed #e3d6bf;
  border-radius: 18px;
}
.ip-end-q {
  margin: 0 0 8px 4px;
  font-size: 12.5px;
  color: #5a6b78;
}
.ip-end-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ip-end-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1.5px solid #ece4d6;
  border-radius: 14px;
  background: #fbf5ea;
  text-align: left;
  color: #001d2c;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.ip-end-option.main {
  background: #fbefd9;
  border-color: #f3d29a;
}
.ip-end-option:hover {
  border-color: #edae49;
  box-shadow: 0 6px 16px rgba(201, 138, 30, 0.16);
  transform: translateY(-1px);
}
.ip-end-option .ip-anchor-text strong {
  white-space: normal;
}
.ip-end-option:focus-visible,
.ip-end-switch:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}
.ip-end-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1.5px solid #f3d29a;
  border-radius: 999px;
  background: #fbefd9;
  color: #7a4b00;
  font-size: 13px;
  font-weight: 700;
}
.ip-end-switch:hover {
  border-color: #edae49;
}
@media (max-width: 480px) {
  .ip-end-options { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .ip-end-option { transition: none; }
  .ip-end-option:hover { transform: none; }
}
/* "Landing today? / Flying home today?": a clear card with its own button, in the sunset colours */
.ip-flight-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 520px;
  padding: 10px 12px 10px 14px;
  border: 1.5px solid #f3d29a;
  border-radius: 18px;
  background: #fbefd9;
  text-align: left;
  color: #001d2c;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.ip-flight-card:hover {
  border-color: #edae49;
  box-shadow: 0 6px 16px rgba(201, 138, 30, 0.18);
  transform: translateY(-1px);
}
.ip-flight-icon {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: #edae49;
  color: #001d2c;
}
.ip-flight-card .ip-anchor-text strong {
  white-space: normal;
}
.ip-flight-card .ip-anchor-text small {
  color: #6b5a3e;
}
.ip-flight-btn {
  flex: none;
  padding: 7px 14px;
  border-radius: 999px;
  background: #003d5b;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
@media (max-width: 420px) {
  .ip-flight-btn { padding: 6px 11px; }
}
@media (prefers-reduced-motion: reduce) {
  .ip-flight-card { transition: none; }
  .ip-flight-card:hover { transform: none; }
}
.ip-anchor:focus-visible,
.ip-flight-card:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}
.ip-leg.clickable {
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, box-shadow 0.15s;
}
.ip-leg.clickable:hover {
  border-color: #edae49;
  color: #003d5b;
  box-shadow: 0 4px 12px rgba(0, 40, 62, 0.08);
}
.ip-leg:disabled {
  cursor: default;
}
.ip-leg.picked {
  border-color: #edae49;
  background: #fbefd9;
  color: #7a4b00;
}
.ip-leg-why {
  font-weight: 500;
  opacity: 0.85;
}
.ip-leg .ip-leg-go {
  padding: 0 !important;
  background: none !important;
  color: inherit !important;
}
.ip-leg:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}
.ip-leg :deep(svg) {
  box-sizing: content-box;
  padding: 4px;
  border-radius: 50%;
  background: #fdf3e0;
  color: #c98a1e;
}
.ip-drop {
  flex: 1;
  margin: 4px 0;
  padding: 7px;
  text-align: center;
  font-size: 12px;
  border-radius: 12px;
  border: 1.5px dashed #d2c8b6;
  color: var(--muted);
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.ip-gap.active .ip-drop {
  background: #fbefd9;
  border-color: var(--primary);
  color: var(--primary);
}

/* Stop card */
.ip-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: #fbf5ea;
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 2px 8px rgba(0, 40, 62, 0.05);
  transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
}
.ip-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(0, 40, 62, 0.1);
}
.ip-card.locked {
  border-color: rgba(0, 121, 140, 0.35);
}
.ip-card.moved {
  box-shadow: 0 0 0 2px rgba(0, 121, 140, 0.35);
  animation: ip-slide 0.35s ease-out;
}
.ip-move {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin: -4px -4px -4px -2px;
}
.ip-move-locked {
  justify-content: center;
  width: 28px;
  color: #9aa7b1;
}
.ip-move-btn {
  width: 28px;
  height: 24px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  transition: background 0.15s, color 0.15s;
}
.ip-move-btn:hover:not(:disabled),
.ip-move-btn:focus-visible {
  background: rgba(0, 61, 91, 0.1);
  color: var(--text);
}
.ip-move-btn:disabled {
  opacity: 0.25;
  cursor: default;
}
.ip-handle {
  display: grid;
  place-items: center;
  width: 28px;
  height: 22px;
  color: #9aa7b1;
  cursor: grab;
}
.ip-card:hover .ip-handle {
  color: var(--text);
}
.ip-card[draggable="true"]:active {
  cursor: grabbing;
}
.ip-reorder-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 4px 44px;
  font-size: 13px;
  color: var(--muted);
}
.ip-thumb {
  flex: none;
  width: 124px; /* photo first: a bigger picture of each stop */
  height: 92px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 30px;
  background: var(--tint, #efe9df) center / cover no-repeat;
}
.ip-thumb.sm {
  width: 48px;
  height: 48px;
  font-size: 20px;
  border-radius: 12px;
}
.cat-culture { --tint: #fff3d6; }
.cat-food { --tint: #ffe5e3; }
.cat-nature { --tint: #fbefd9; }
.cat-shopping { --tint: #e3edfb; }
.cat-sight { --tint: #efe9df; }
.ip-info {
  flex: 1;
  min-width: 0;
}
.ip-when {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.ip-when small {
  font-weight: 500;
  color: var(--muted);
}
.ip-when .ip-was {
  color: var(--primary);
  font-weight: 600;
  margin-left: 4px;
}
.ip-flight-times {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin: 2px 0 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: #7a4b00;
}
.ip-name {
  font-size: 15px;
  font-weight: 700;
  margin: 2px 0 6px;
  color: var(--ink);
}
.ip-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.ip-chip {
  display: inline-block;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: #efe9df;
  color: var(--muted);
}
.ip-pill {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: #fbefd9;
  color: #004e5a;
}
.ip-pill.warn {
  background: #fff3d6;
  color: #7a4b00;
}
.ip-pill.lock,
.ip-pill.wait {
  background: #efe9df;
  color: var(--muted);
}
.ip-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.ip-back,
.ip-lock,
.ip-go {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 0;
  background: transparent;
  font-size: 14px;
  color: var(--muted);
  transition: background 0.15s, transform 0.12s, color 0.15s;
}
.ip-go,
.ip-back {
  display: grid;
  place-items: center;
}

.ip-back:hover:not(:disabled),
.ip-lock:hover:not(:disabled),
.ip-go:hover {
  background: #efe9df;
  color: var(--ink);
}
.ip-lock:active:not(:disabled) {
  transform: scale(0.9);
}
.ip-lock.on {
  background: #fbefd9;
}
.ip-back:disabled,
.ip-lock:disabled {
  opacity: 0.4;
}
.ip-add-stop {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 18px;
  padding: 12px;
  border: 1.5px solid var(--primary);
  border-radius: 999px;
  background: transparent;
  color: var(--primary);
  font-weight: 700;
  transition: background 0.15s;
}
.ip-add-stop span {
  font-size: 18px;
  line-height: 1;
}
.ip-add-stop:hover {
  background: #fbefd9;
}

/* Demo weather simulation */
/* ===== Weather simulation ===== */

.ip-weather-sim {
  margin-top: 18px;
  padding: 18px 20px;
  border: 1px solid #d8caa8;
  border-radius: 18px;
  background: #fbf7ee;
}

.ip-sim-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.ip-sim-heading h4 {
  margin: 0;
  color: #17324d;
  font-size: 15px;
  font-weight: 700;
}

.ip-sim-heading p {
  margin: 4px 0 0;
  color: #69798a;
  font-size: 12px;
}

.ip-sim-badge {
  padding: 4px 10px;
  border: 1px solid #d6ad4c;
  border-radius: 999px;
  background: #f7edcf;
  color: #8a6720;
  font-size: 11px;
  font-weight: 700;
}

.ip-sim-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.ip-sim-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #17324d;
  font-size: 12px;
  font-weight: 700;
}


.ip-sim-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.ip-sim-button,
.ip-sim-reset {
  padding: 9px 17px;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}

.ip-sim-button {
  border: 1px solid #17324d;
  background: #17324d;
  color: #fff;
}

.ip-sim-button:hover {
  background: #244866;
}

.ip-sim-reset {
  border: 1px solid #d8caa8;
  background: #fffdf8;
  color: #17324d;
}

.ip-sim-active {
  margin: 14px 0 0;
  padding: 10px 12px;
  border: 1px solid #ead8a7;
  border-radius: 11px;
  background: #f8efd6;
  color: #17324d;
  font-size: 12px;
}

.ip-weather-alternatives {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #dfd2ae;
}

.ip-alt-heading {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 12px;
}

.ip-alt-heading strong {
  color: #17324d;
  font-size: 14px;
}

.ip-alt-heading span {
  color: #69798a;
  font-size: 12px;
  font-weight: 400;
}

.ip-alt-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.ip-alt-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;

  padding: 12px 14px;

  border: 1px solid #d8caa8;
  border-radius: 13px;

  background: #fffdf8;
  color: #17324d;

  font: inherit;
  text-align: left;
  cursor: pointer;

  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
}

.ip-alt-option:hover {
  transform: translateY(-1px);
  border-color: #c8a54b;
  background: #faf3df;
}

.ip-alt-time {
  font-size: 14px;
  font-weight: 700;
}

.ip-alt-body > span:nth-child(2) {
  color: #69798a;
  font-size: 12px;
}

.ip-alt-option strong {
  margin-top: 3px;
  color: #9a7426;
  font-size: 12px;
}

.ip-alt-conflict {
  margin-top: 6px;
  font-size: 0.85rem;
  color: #8a641f;
}

.ip-alt-clear {
  margin-top: 6px;
  font-size: 0.85rem;
  color: #55705a;
}

.ip-preview-btn {
  font-weight: 700;
  color: inherit;
}
/* The clear-time cards are buttons: lift on hover, a ring when picked or focused */
.ip-alt-option {
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.ip-alt-option:hover {
  border-color: #edae49;
  box-shadow: 0 6px 16px rgba(0, 61, 91, 0.1);
  transform: translateY(-1px);
}
.ip-alt-option:hover .ip-preview-btn {
  text-decoration: underline;
}
.ip-alt-option.chosen {
  border-color: #edae49;
  box-shadow: 0 0 0 3px rgba(237, 174, 73, 0.3);
}
.ip-alt-option:focus-visible {
  outline: 3px solid rgba(237, 174, 73, 0.7);
  outline-offset: 2px;
}
.ip-alt-body {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
}
.ip-alt-conflict,
.ip-alt-clear {
  flex-basis: 100%;
}
@media (prefers-reduced-motion: reduce) {
  .ip-alt-option { transition: none; }
  .ip-alt-option:hover { transform: none; }
}

.ip-move-preview {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #d8c99d;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.45);
}

.ip-preview-title {
  margin-bottom: 10px;
}

.ip-preview-warning {
  margin-top: 10px;
  color: #8a641f;
}

.ip-preview-safe {
  margin-top: 10px;
  color: #55705a;
}

.ip-preview-actions {
  margin-top: 14px;
}

.ip-preview-cancel {
  padding: 8px 14px;
  border: 1px solid #cfc4a5;
  border-radius: 999px;
  background: #fbf5ea;
  cursor: pointer;
}

.ip-cascade-preview {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #ddd2b7;
}

.ip-cascade-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 8px;
}

.ip-cascade-unavailable {
  color: #9b4d43;
}

.ip-preview-impossible {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff4e8;
  color: #8a4f20;
}

.ip-preview-feasible {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #eef7ef;
  color: #46634a;
}

.ip-preview-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.ip-preview-apply {
  padding: 8px 14px;
  border: none;
  border-radius: 999px;
  background: #1f3556;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.ip-preview-apply:hover {
  opacity: 0.9;
}

@media (max-width: 650px) {
  .ip-alt-options {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .ip-sim-fields {
    grid-template-columns: 1fr;
  }
}

/* Map view */
.ip-map {
  isolation: isolate; /* keeps Leaflet's layers under the detail card */
  height: 420px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #efe9df;
}
.ip-map :deep(.ip-pin) {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #fff;
  font: 700 14px/1 Inter, Arial, sans-serif;
  border: 3px solid #fff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
}
.ip-map :deep(.ip-pin.active) {
  transform: scale(1.25);
}
.ip-detail {
  display: flex;
  gap: 14px;
  margin-top: -36px;
  position: relative;
  z-index: 500;
  padding: 14px;
  background: #fbf5ea;
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: 0 16px 34px rgba(0, 40, 62, 0.14);
}
.ip-detail-photo {
  position: relative;
  flex: none;
  width: 140px;
  min-height: 130px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--tint, #efe9df) center / cover no-repeat;
}
.ip-detail-icon {
  font-size: 40px;
}
.ip-detail-info {
  flex: 1;
  min-width: 0;
}
.ip-detail-name {
  font-size: 17px;
  font-weight: 700;
  margin: 2px 0 6px;
}
.ip-detail-line {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--muted);
}
.ip-detail-btns {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.ip-directions {
  flex: 1;
  text-align: center;
  padding: 10px 16px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  transition: filter 0.15s;
}
.ip-directions:hover {
  color: #fff;
  filter: brightness(1.15);
}
.ip-step {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: #fbf5ea;
  font-size: 20px;
  line-height: 1;
  color: var(--ink);
}
.ip-step:disabled {
  opacity: 0.35;
}

/* Saved places drawer */
.ip-drawer {
  position: sticky;
  top: 90px;
  background: #fbf5ea;
  border: 1px solid var(--line);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 40, 62, 0.05);
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ip-drawer.target {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 121, 140, 0.15);
}
.ip-drawer-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  color: var(--ink);
  padding: 12px 14px;
  text-align: left;
}
.ip-drawer-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #fff3d6;
  font-size: 18px;
}
.ip-drawer-title {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.ip-drawer-title small {
  color: var(--muted);
  font-size: 12px;
}
.ip-chev {
  color: var(--muted);
  font-size: 20px;
  line-height: 1;
}
.ip-drawer-body {
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ip-unschedule {
  margin: 0;
  padding: 14px;
  text-align: center;
  border: 1.5px dashed var(--primary);
  border-radius: 12px;
  color: var(--primary);
  font-size: 13px;
}
.ip-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ip-group + .ip-group {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
.ip-group-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.ip-group-count {
  font-size: 11px;
  font-weight: 600;
  padding: 0 7px;
  border-radius: 999px;
  background: #efe9df;
  letter-spacing: 0;
}
.ip-wish {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  border-radius: 14px;
  border: 1px solid var(--line);
  cursor: grab;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.ip-wish:hover {
  transform: translateX(2px);
  box-shadow: 0 6px 14px rgba(0, 40, 62, 0.08);
}
.ip-wish-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ip-wish-name {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ip-wish-text small {
  font-size: 11px;
  color: var(--muted);
}
.ip-vote-rule {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(237, 174, 73, 0.14);
  color: var(--text);
  font-size: 13px;
  line-height: 1.4;
}
.ip-vote-rule svg {
  flex: none;
  margin-top: 1px;
  color: #c98a1e;
}
.ip-waiting {
  margin-top: 6px;
}
.ip-wish.waiting {
  cursor: default;
  border-style: dashed;
}
.ip-wish.waiting .ip-thumb,
.ip-wish.waiting .ip-wish-name {
  opacity: 0.65;
}
.ip-vote {
  flex: none;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1.5px solid #edae49;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  transition: background 0.15s;
}
.ip-vote:hover,
.ip-vote:focus-visible {
  background: #edae49;
  color: #001d2c;
}
.ip-wish.clickable {
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ip-wish.clickable:hover {
  border-color: #edae49;
  box-shadow: 0 4px 12px rgba(0, 61, 91, 0.08);
}
.ip-wish.clickable:hover .ip-add {
  background: var(--primary);
  color: #fff;
}
.ip-add {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1.5px solid var(--primary);
  background: transparent;
  color: var(--primary);
  font-size: 18px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}
/* "Choose from saved places": the panel lights up and its + buttons pulse for a few seconds */
.ip-drawer.flash {
  border-color: #edae49;
  animation: ip-flash-ring 1.2s ease-out 3;
}
@keyframes ip-flash-ring {
  0% { box-shadow: 0 0 0 0 rgba(237, 174, 73, 0.6); }
  100% { box-shadow: 0 0 0 14px rgba(237, 174, 73, 0); }
}
.ip-drawer.flash .ip-add {
  background: #edae49;
  border-color: #edae49;
  color: #001d2c;
  animation: ip-flash-pop 1.2s ease-in-out 3;
}
@keyframes ip-flash-pop {
  50% { transform: scale(1.18); }
}
@media (prefers-reduced-motion: reduce) {
  .ip-drawer.flash,
  .ip-drawer.flash .ip-add {
    animation: none;
  }
  .ip-drawer.flash {
    box-shadow: 0 0 0 4px rgba(237, 174, 73, 0.45);
  }
}
.ip-add:hover {
  background: var(--primary);
  color: #fff;
}
.ip button:focus-visible,
.ip a:focus-visible {
  outline: 3px solid rgba(0, 121, 140, 0.4);
  outline-offset: 2px;
}

/* Animations */
.ip-pop-enter-active {
  transition: opacity 0.2s ease-out, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ip-pop-leave-active {
  transition: opacity 0.12s, transform 0.12s;
}
.ip-pop-enter-from,
.ip-pop-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-6px);
}
@keyframes ip-spin {
  to { transform: rotate(360deg); }
}
@keyframes ip-slide {
  from { transform: translateY(-6px); opacity: 0.6; }
}

/* Tablets and phones: one column, the day first and saved places under it */
@media (max-width: 900px) {
  .ip-body,
  .ip-body.drawer-closed {
    grid-template-columns: 1fr;
  }
  .ip-drawer {
    position: static;
    order: 1;
  }
}
@media (max-width: 560px) {
  .ip-views {
    margin-left: 0;
  }
  .ip-thumb {
    width: 76px;
    height: 68px;
  }
  .ip-map {
    height: 320px;
  }
  .ip-detail {
    flex-direction: column;
  }
  .ip-detail-photo {
    width: 100%;
    min-height: 140px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ip-dialog,
  .ip-spin,
  .ip-card.moved {
    animation: none;
  }
  .ip-card,
  .ip-day,
  .ip-grid-day,
  .ip-wish,
  .ip-gap,
  .ip-pop-enter-active,
  .ip-pop-leave-active {
    transition: none;
  }
}
/* Remove-from-day turns red on hover, so it reads as "take off" */
.ip-side .ip-back:hover:not(:disabled) {
  color: #d1495b;
  background: #fbe7ea;
}
/* Lunch / dinner break rows */
.ip-num.meal {
  background: #fbf5ea;
  border: 2px dashed #d2c8b6;
  font-size: 15px;
  box-shadow: 0 0 0 4px #fff;
}
.ip-meal {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  padding: 12px 14px;
  border: 1.5px dashed #d2c8b6;
  border-radius: 16px;
  color: var(--muted);
}
.ip-meal-name {
  color: var(--ink);
}
.ip-meal .ip-when {
  display: inline;
}
.ip-meal .ip-link {
  margin-left: auto;
  font-size: 13px;
}
/* Duration chip + its menu */
.ip-dur-wrap {
  position: relative;
  display: inline-block;
}
.ip-dur {
  border: 1px solid transparent;
  border-radius: 999px;
  background: #efe9df;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  padding: 2px 9px;
  margin-left: 4px;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.ip-dur span {
  font-size: 9px;
  opacity: 0.7;
}
.ip-dur:hover:not(:disabled),
.ip-dur[aria-expanded='true'] {
  border-color: var(--primary);
  color: var(--primary);
  background: #fbf5ea;
}
.ip-dur-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 220px;
  padding: 10px;
  border-radius: 14px;
  background: #fbf5ea;
  border: 1px solid var(--line);
  box-shadow: 0 16px 34px rgba(0, 40, 62, 0.18);
  font-weight: 400;
  animation: ip-rise 0.18s ease-out;
}
.ip-dur-step {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ip-dur-step button {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: #fbf5ea;
  color: var(--ink);
  font-size: 18px;
  line-height: 1;
}
.ip-dur-step button:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}
.ip-dur-step button:disabled {
  opacity: 0.35;
}
.ip-dur-step strong {
  font-size: 15px;
  color: var(--ink);
}
.ip-dur-picks {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}
.ip-dur-picks button {
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fbf5ea;
  padding: 6px 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
}
.ip-dur-picks button:hover {
  border-color: var(--primary);
}
.ip-dur-picks button.on {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

/* Live: what's happening now */
.ip-live-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: #efe9df;
  color: var(--muted);
}
.ip-live-badge.now {
  background: var(--active);
  color: #fff;
  animation: ip-pulse 2s infinite;
}
.ip-live {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.ip-live-btn {
  border: 1.5px solid var(--primary);
  border-radius: 999px;
  background: transparent;
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  transition: background 0.15s, color 0.15s;
}
.ip-live-btn.done {
  background: var(--primary);
  color: #fff;
}
.ip-live-btn:hover {
  filter: brightness(1.05);
  background: #fbefd9;
}
.ip-live-btn.done:hover {
  background: var(--primary);
}
@keyframes ip-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(209, 73, 91, 0.45); }
  60% { box-shadow: 0 0 0 6px rgba(209, 73, 91, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .ip-live-badge.now,
  .ip-dur-menu {
    animation: none;
  }
}
.ip-stop.menu-open {
  z-index: 20; /* keep the duration menu above the next card */
}
@media (max-width: 560px) {
  .ip-grid {
    grid-template-columns: repeat(4, 62px);
  }
  .ip-arrow {
    width: 30px;
    height: 30px;
  }
}
/* Confirm dialog (add / remove a day, two cities on one day) */
.ip-overlay {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 40, 62, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.ip-dialog {
  width: min(420px, 100%);
  padding: 22px;
  border-radius: 22px;
  background: #fbf5ea;
  color: var(--ink);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  animation: ip-rise 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ip-dialog:focus {
  outline: none;
}
.ip-dialog-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #fbefd9;
  font-size: 22px;
}
.ip-dialog-icon.danger {
  background: #fbe7ea;
}
.ip-dialog-title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  margin: 12px 0 8px;
}
.ip-dialog-list {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
  color: var(--ink);
}
.ip-dialog-list li + li {
  margin-top: 4px;
}
.ip-dialog-btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}
.ip-dialog-btns .ip-outline {
  padding: 8px 18px;
}
.ip-cta.danger {
  background: #d1495b;
  box-shadow: 0 6px 16px rgba(192, 57, 43, 0.25);
}

/* Undo bar */
.ip-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 1250;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: calc(100vw - 32px);
  padding: 10px 12px 10px 18px;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-size: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
}
.ip-toast-undo {
  border: 0;
  border-radius: 999px;
  padding: 5px 14px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-weight: 700;
}
.ip-toast-undo:hover {
  background: rgba(255, 255, 255, 0.25);
}
.ip-toast-x {
  border: 0;
  background: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}
.ip-fade-enter-active,
.ip-fade-leave-active {
  transition: opacity 0.18s;
}
.ip-fade-enter-from,
.ip-fade-leave-to {
  opacity: 0;
}
/* Red highlight border for rain-affected outdoor stops */
.ip-card.rain-warning-card {
  border: 2px solid #ef4444 !important;
  background-color: #fef2f2 !important;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.2) !important;
  transition: all 0.2s ease-in-out;
}

.ip-card.rain-warning-card:hover {
  border-color: #dc2626 !important;
  box-shadow: 0 8px 20px rgba(220, 38, 38, 0.3) !important;
}

@keyframes ip-rise {
  from { transform: translateY(10px) scale(0.97); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .ip-dialog {
    animation: none;
  }
}

/* Phones and touch screens: every control is at least 40px to tap (WCAG / Apple guidance) */
@media (pointer: coarse), (max-width: 560px) {
  .ip-arrow {
    min-width: 40px;
    min-height: 40px;
  }
}
</style>
