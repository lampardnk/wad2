<script setup>
    import {computed, ref, watch, onMounted} from 'vue'
    import { savedRoutesFromDb, fetchSavedRoutes, timeZones, cityZones, transportPrefill } from '../savedRoutes.js';
    import CustomDropdown from './CustomDropdown.vue'
    
    const props = defineProps({
        tripId: String,
        destination: String,
        stops: Array,
        stay: Object,
        startDate: [String, Object, Date],
        endDate: [String, Object, Date]
    });

    const isJapan = computed(() => {
        const destination = String(props.destination || '').toLowerCase();

        const japanDestinations = [
            'kyoto',
            'tokyo',
            'osaka',
            'nara',
            'sapporo',
            'fukuoka',
            'nagoya',
            'hiroshima'
        ];

        return destination.includes('japan') ||
            japanDestinations.some((city) => destination.includes(city));
        });
    
    const startPoint = ref('');
    const endPoint = ref('');
    const options = ref([]);
    const hasTransitOption = computed(() =>
        options.value.some((opt) =>
            ['Bus & Train', 'Train / MRT', 'Bus'].includes(opt.type)
        )
    );
    const loading = ref(false);
    const selectedTime = ref('08:30'); // stores as HH:mm format
    const selectedDay = ref('');
    const timeType = ref('depart');   // 'depart' or 'arrive'
    const timeZone = ref('Asia/Seoul');   // default

    // get the places from itinerary 
    const places = computed(() => {

        const city = props.destination;
        const list = [];

        if (props.stay?.name) {
            list.push({name: props.stay.name, address: props.stay.address || `${props.stay.name}, ${city}`});
        }

        const sorted = [...props.stops].sort((a, b) => 
        (a.date + String(a.hour ?? 0).padStart(2, '0')).localeCompare(b.date + String(b.hour ?? 0).padStart(2, '0'))
        );

        for (const s of sorted) {
            list.push({name: s.name, address: s.address || `${s.name}, ${city}`});
        }

        // remove duplicate names 
        const seen = new Set();
        return list.filter(p => !seen.has(p.name) && seen.add(p.name));

    });

    // list of start points 
    const startPoints = computed(() => 
        places.value.map(p => p.name)
    );

    // destination list excludes currently selected start point
    const destinations = computed(() => 
        places.value.map(p => p.name).filter(n => n !== startPoint.value)
    );

    // finds address based on place
    function addressOf(name) {
        return places.value.find(p => p.name === name)?.address;
    }

    // pick the first place as the default start
    watch(places, (list) => {
        const names = list.map(p => p.name);
        if (names.length && !names.includes(startPoint.value)) {
            startPoint.value = names[0];
        } else if (!names.length) {
            startPoint.value = '';
        }
    }, { immediate: true });

    // auto-select the first destination option if available
    watch(destinations, (available) => {
        if (!available.includes(endPoint.value) && available.length) {
            endPoint.value = available[0];
        } else if (!available.length) {
            endPoint.value = '';
        }
    }, { immediate: true });

    // auto-select the zone from the trip destination 
    watch(() => props.destination, (dest) => {
        console.log('destination prop:', dest, typeof dest);
        const name = (typeof dest === 'string' ? dest : dest?.name || '').toLowerCase();
        const match = Object.keys(cityZones).find(city => name.includes(city));
        if (match) timeZone.value = cityZones[match];
    }, { immediate: true });

    // convert the picked date + time in the chosen zone to a UTC ISO string
    function getIsoTime(dateStr, timeStr) {
        if (!dateStr || !timeStr || !timeZone.value) return null;

        // work out the zone's offset on that date, e.g. "GMT-07:00"
        const guess = new Date(`${dateStr}T${timeStr}:00Z`);
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone.value,
            timeZoneName: 'longOffset'
        }).formatToParts(guess);

        const raw = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT';
        const offset = raw === 'GMT' ? '+00:00' : raw.replace('GMT', '');

        const d = new Date(`${dateStr}T${timeStr}:00${offset}`);
        return isNaN(d.getTime()) ? null : d.toISOString();
    }

    async function loadOptions() {
        console.log('🚆 loadOptions() called', {
            startPoint: startPoint.value,
            endPoint: endPoint.value,
            selectedDay: selectedDay.value,
            selectedTime: selectedTime.value,
            timeZone: timeZone.value
        });

        // Make sure start and destination exist
        if (!startPoint.value || !endPoint.value) {
            options.value = [];
            return;
        }

        loading.value = true;

        try {
            // Get addresses
            const origin = addressOf(startPoint.value);
            const destination = addressOf(endPoint.value);

            console.log('📍 Directions addresses:', {
                origin,
                destination
            });

            // If address could not be resolved
            if (!origin || !destination) {
                options.value = [];
                return;
            }

            // Convert selected date/time into ISO format
            const isoTime = getIsoTime(
                selectedDay.value,
                selectedTime.value
            );

            // Build query parameters
            const queryParams = new URLSearchParams({
                origin,
                destination
            });

            if (isoTime) {
                queryParams.set('time', isoTime);
                queryParams.set('timeType', timeType.value);
            }

            console.log(
                '🚆 About to fetch:',
                `/api/directions?${queryParams}`
            );

            // Call backend ONCE
            const res = await fetch(
                `/api/directions?${queryParams}`
            );

            console.log(
                '🚆 Directions response status:',
                res.status
            );

            if (!res.ok) {
                throw new Error(
                    `Request failed (${res.status})`
                );
            }

            // Read response ONCE
            options.value = await res.json();

            console.log(
                '🚆 Final options received:',
                options.value
            );

        } catch (error) {
            console.error(
                'Could not load directions',
                error
            );

            options.value = [];

        } finally {
            loading.value = false;
        }
    }
    // reload options whenever either point changes 
    watch([startPoint, endPoint, selectedDay, selectedTime, timeType, timeZone], loadOptions, {immediate: true});

    // convert into a standardise format
    function parseDate(dateVal) {
        if (!dateVal) return null;
        if (dateVal instanceof Date) return dateVal;
        if (typeof dateVal === 'object' && dateVal.seconds) { 
            return new Date(dateVal.seconds * 1000);
        }
        return new Date(dateVal);
    }

    // compute the list of dates between startDate and endDate
    const dayOptions = computed(() => {
        const start = parseDate(props.startDate);
        const end = parseDate(props.endDate);

        if (!start || isNaN(start.getTime()) || !end || isNaN(end.getTime())) {
            return [];
        }

        const options = [];
        const current = new Date(start);

        while (current <= end) {
            // YYYY-MM-DD string stored as value for calculations / API requests
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const day = String(current.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            // clean label: "Tue, Oct 20"
            const label = current.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });

            options.push({
                label: label, // displayed in dropdown
                value: dateStr // stored value
            });

            current.setDate(current.getDate() + 1);
        }

        return options;
    });

    // set default selected day to the first available option once computed
    watch(dayOptions, (newOptions) => {
        if (newOptions.length > 0 && !selectedDay.value) {
            selectedDay.value = newOptions[0].value;
        }
    }, { immediate: true });

    // get selected fields from the saved option if user decide to change option
    watch(transportPrefill, (p) => {
        if (!p) return;
        startPoint.value = p.start;
        endPoint.value = p.end;
        if (p.day) selectedDay.value = p.day;
        if (p.time) selectedTime.value = p.time;
        timeType.value = p.timeType || 'depart';
        transportPrefill.value = null;   // use it once, so it doesn't override later choices
    }, { immediate: true });

    // format duration
    function formatDuration(min) {
        const hour = Math.floor(min / 60);
        const mins = min % 60;
        return hour > 0 ? `${hour} hour ${mins} mins` : `${mins} mins`;
    }

    // format cost
    function formatCost(opt) {
        if (!opt || opt.cost === null || opt.cost === undefined) {
            return 'Fare not provided';
        }
        // only when cost is 0
        if (opt.cost === 0) {
            return 'Free';
        }

        // if currency is missing / invalid
        if (!opt.currency) {
            return `$${Number(opt.cost).toFixed(2)}`;
        }

        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: opt.currency,
            }).format(opt.cost);
        } catch(error) {
            return `${opt.cost} ${opt.currency}`;
        }
    }

    // checks if there are saved entries for the start + destination, return undefined if none
    function currentRoute() {
        return savedRoutesFromDb.value.find(opt => 
            opt.start === startPoint.value &&
            opt.end === endPoint.value
        );
    }
    // compares only transit line names (ignores walk minutes and stop counts) so a saved option stays "saved" when Google's numbers change slightly
    function lineKey(route = '') {
        return route
            .split('→').map(s => s.trim()).filter(s => !s.startsWith('Walk ('))
            .map(s => s.replace(/\(.*?\)/g, '').trim()).join('>');
    }

    // check if option is saved using the shared state
    function isSaved(option) {
        const route = currentRoute();
        if (!route || !Array.isArray(route.options)) return false;

        return route.options.some(o =>
            o.type?.trim() === option.type?.trim() &&
            lineKey(o.route) === lineKey(option.route) &&
            o.day === selectedDay.value &&
            o.time === selectedTime.value
        );
    }

// sends toggle request to backend and refreshes state
    async function toggleSaved(option) {
        console.log('--- 1. toggleSaved clicked ---');
        console.log('Current state:', {
            tripId: props.tripId,
            start: startPoint.value,
            end: endPoint.value,
            option: {
                ...option,
                day: selectedDay.value,
                time: selectedTime.value,
                timeType: timeType.value

            }
        });
        if (!startPoint.value || !endPoint.value || !props.tripId) {
                console.warn('⚠️ Guard triggered! Missing required data:', {
                start: startPoint.value,
                end: endPoint.value,
                tripId: props.tripId
            });
            return;
        }

        const optionToSave = {
            ...option,
            day: selectedDay.value,
            time: selectedTime.value,
            timeType: timeType.value
        };

        try {
            console.log('--- 2. Sending POST to /api/directions/toggle ---');
            const res = await fetch('/api/directions/toggle', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    tripId: props.tripId,
                    start: startPoint.value,
                    end: endPoint.value,
                    option: optionToSave
                })
            });
            console.log('--- 3. Response Status:', res.status);

            if (res.ok) {
                const data = await res.json();
                console.log('--- 4. Toggle success response from backend:', data);
                await fetchSavedRoutes(props.tripId); // re-fetch from mongoDB to sync state
            } else {
                const err = await res.json();
                console.error('❌ Server error response:', err);
            }
        } catch(error) {
            console.error('Error saving option:', error);
        }
    }

    // state of badge cost
    function getCostBadge(opt) {
        if (!opt || opt.cost === null || opt.cost === undefined) {
            return 'bg-secondary text-white'; // Not available / Metered
        }
        if (opt.cost === 0) {
            return 'bg-success text-white'; // free
        }
        return 'bg-info text-dark'; // if there is a fare
    }

    function modeOf(opt) {
    if (opt.type === 'Taxi' || opt.type === 'Car') return 'driving';
    if (opt.type === 'Walk') return 'walking';
    return 'transit';
    }

const cityText = computed(() => {
    const d = props.destination;
    return typeof d === 'string'
        ? d
        : [d?.city || d?.name, d?.country].filter(Boolean).join(', ');
});

function mapsUrl(mode = 'transit') {
    if (!startPoint.value || !endPoint.value) return '#';

    const origin = [startPoint.value, cityText.value].filter(Boolean).join(', ');
    const dest = [endPoint.value, cityText.value].filter(Boolean).join(', ');

    const base = `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(dest)}/`;
    const code = { driving: '3e0', walking: '3e2', transit: '3e3' }[mode];
    const iso = getIsoTime(selectedDay.value, selectedTime.value);

    if (!iso) return `${base}data=!4m2!4m1!${code}`;

    const epoch = Math.floor(
        new Date(`${selectedDay.value}T${selectedTime.value}:00Z`).getTime() / 1000
    );
    const when = timeType.value === 'arrive' ? 1 : 0;

    return `${base}data=!4m6!4m5!2m3!6e${when}!7e2!8j${epoch}!${code}`;
}

</script>

<template>
    <div class="row">

        <!-- Starting selection -->
        <div class="col-12 col-md-5 p-2">
            <h4>Starting Point</h4>
            <CustomDropdown v-model="startPoint" :options="startPoints" block header-text="Starting point" aria-label="Starting point" />
        </div>

        <!-- destination selection -->
        <div class="col-12 col-md-5 p-2">
            <h4>Destination</h4>
            <CustomDropdown v-model="endPoint" :options="destinations" block placeholder="Select destination" header-text="Destination" aria-label="Destination" />
        </div>
        
        <!-- day selection -->
        <div class="col-12 col-md-5 p-2">
            <h4>Day</h4>
            <CustomDropdown v-model="selectedDay" :options="dayOptions" block placeholder="Select Day" header-text="Day" aria-label="Day" />
        </div>

        <!-- input timing -->
        <div class="col-12 col-md-5 p-2">
            <h4>Time</h4>
            <div class="d-flex gap-2">
                <select v-model="timeType" class="form-select w-auto" aria-label="Depart or arrive">
                    <option value="depart">Depart at</option>
                    <option value="arrive">Arrive by</option>
                </select>
                <input type="time" v-model="selectedTime" class="form-control p-2" aria-label="Time"/>
            </div>
            <select v-model="timeZone" class="form-select" aria-label="Time zone">
                <option v-for="tz in timeZones" :key="tz.value" :value="tz.value">{{ tz.label }}</option>
            </select>
        </div>
    </div>
    <hr>
    <!-- transport information -->
    <div class="card p-3 mb-3">
        <!-- Loading State -->
        <div v-if="loading" class="text-center text-muted py-3">
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            <span>Loading travel options...</span>
        </div>
        <!-- Empty State -->
        <div v-else-if="!options.length" class="text-center text-muted py-3">
            {{ endPoint ? 'No travel options found for this route.' : 'Select a destination to see travel options.' }}
        </div>

        <!-- Options Content -->
        <template v-else>
            <!-- Japan train fallback when Google does not return transit routes -->
            <div
            v-if="isJapan && !hasTransitOption"
            class="alert alert-light border mb-3"
            >
            <strong>Train routes:</strong>
            <a
                :href="mapsUrl('transit')"
                target="_blank"
                rel="noopener noreferrer"
            >
                Open in Google Maps
            </a>
            </div>
            <!-- MOBILE VIEW (< md) -->
            <div class="d-block d-md-none">
                <div v-for="opt in options" :key="opt.type + opt.route" class="p-3 border-bottom">
                    <div class="row align-items-center g-2">
                        <!-- Line 1: Type & Route -->
                        <div class="col-12 fw-semibold">
                            {{ isJapan && opt.type === 'Car' ? 'Taxi' : opt.type }} <span class="fw-normal text-muted">— {{ opt.route }}</span>
                        </div>
                        <!-- Line 2: Duration & Cost -->
                        <div class="col-12 d-flex gap-2 align-items-center flex-wrap">
                            <span class="badge bg-dark text-white border">
                                <i class="bi bi-clock me-1"></i>Duration: {{ formatDuration(opt.duration) }}
                            </span>

                            <span class="badge" :class="getCostBadge(opt)">
                                Cost: {{ formatCost(opt) }}
                            </span>
                        </div>

                        <!-- Line 3: Google Maps & Save -->
                        <div class="col-12 d-flex justify-content-between align-items-center mt-2">
                            <a
                                v-if="opt.cost === null || opt.cost === undefined"
                                :href="mapsUrl(modeOf(opt))"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="small"
                            >
                                Open in Google Maps
                            </a>

                            <span v-else></span>

                            <button
                                type="button"
                                class="btn btn-sm"
                                :class="isSaved(opt) ? 'btn-outline-danger' : 'btn-outline-primary'"
                                @click="toggleSaved(opt)"
                            >
                                {{ isSaved(opt) ? 'Unsave' : 'Save' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- DESKTOP VIEW (≥ md) -->
            <div class="table-responsive d-none d-md-block">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Route</th>
                            <th>Duration</th>
                            <th>Cost</th>
                            <th class="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="opt in options" :key="opt.type + opt.route">
                            <td class="fw-semibold">{{ isJapan && opt.type === 'Car' ? 'Taxi' : opt.type }}</td>
                            <td>{{ opt.route }}</td>
                            <td>
                                <span class="badge bg-dark text-white border">
                                    <i class="bi bi-clock me-1"></i>{{ formatDuration(opt.duration) }}
                                </span>
                            </td>
                            <td>
                                <span class="badge" :class="getCostBadge(opt)">
                                    {{ formatCost(opt) }}
                                </span>

                                <div
                                    v-if="opt.cost === null || opt.cost === undefined"
                                    class="mt-1"
                                >
                                    <a
                                    :href="mapsUrl(modeOf(opt))"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="small"
                                    >
                                    Open in Google Maps
                                    </a>
                                </div>
                                </td>
                            <td class="text-center">
                                <button type="button" class="btn btn-sm" :class="isSaved(opt) ? 'btn-outline-danger' : 'btn-outline-primary'" 
                                @click="toggleSaved(opt)">
                                    {{ isSaved(opt) ? 'Unsave' : 'Save' }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </template>
    </div>
</template>
