<script setup>
    import {computed, ref} from 'vue'

    const data = {
        'Namsan Park': [
            {type: 'Bus', route: 'Walk 3 mins (150m) - Bus [27 mins] (15 stops)', walking: 3, duration: 30, cost: 3500},
            {type: 'Subway', route: 'Walk 4 mins (200m) - Subway [11 mins] (8 stops) - Walk 5 mins (250m)', walking: 9, duration: 20, cost: 4500},
            {type: 'Taxi', route: 'Direct', walking: 0, duration: 15, cost: 8000},
            {type: 'Walk', route: '3 km', walking: 40, duration: 40, cost: 0}
        ],
        'National Museum': [
            {type: 'Bus', route: 'Bus [18 mins] (10 stops) - Walk 2 mins (100m)', walking: 2, duration: 20, cost: 2800},
            {type: 'Subway', route: 'Walk 3 mins (150m) - Subway [10 mins] (6 stops) - Walk 2 mins (100m)', walking: 5, duration: 15, cost: 3800},
            {type: 'Taxi', route: 'Direct', walking: 0, duration: 10, cost: 5000},
            {type: 'Walk', route: '2 km', walking: 30, duration: 30, cost: 0}
        ],
        'Myeongdong Kyoja': [
            {type: 'Bus', route: 'Walk 3 mins (150m) - Bus [27 mins] (16 stops) - Walk 5 mins (250m)', walking: 8, duration: 35, cost: 4000},
            {type: 'Subway', route: 'Walk 7 mins (350m) - Subway [21 mins] (13 stops)', walking: 7, duration: 28, cost: 4800},
            {type: 'Taxi', route: 'Direct', walking: 0, duration: 20, cost: 10000},
            {type: 'Walk', route: '4 km', walking: 50, duration: 50, cost: 0}
        ]
    }

    const startPoint = ref('Korean Street Food Breakfast');
    const endPoint = ref('');
    const destinations = Object.keys(data);
    const savedOption = ref([]);

    const getOptions = computed(() => {
        return data[endPoint.value] || []
    });

    function formatDuration(min) {
        const hour = Math.floor(min / 60);
        const mins = min % 60;
        return hour > 0 ? `${hour} hour ${mins} mins` : `${mins} mins`
    };

    function addSaved(option) {
        console.log(option);

        if (exists) return 
        savedOption.value.push();
    };

    const deleteSaved = computed(() => {
        
    });
</script>

<template>
    <div class="row">

        <!-- Starting selection -->
        <div class="col-12 col-md-5 p-2">
            <h4>Starting Point</h4>
            <select class="form-select" v-model="startPoint">
                <option value="Korean Street Food Breakfast">Korean Street Food Breakfast</option>
                <option value="1">2</option>
            </select>
        </div>

        <!-- destination selection -->
        <div class="col-12 col-md-5 p-2">
            <h4>Destination</h4>
            <select class="form-select" v-model="endPoint">
                <option value="" disabled>Select destination</option>
                <option v-for="place in destinations" :key="place" :value="place">
                    {{ place }}
                </option>
            </select>
        </div>
        <div class="col-6"></div>
    </div>
    <hr>
    <!-- transport information -->
    <div class="card p-3 mb-3">
        <table class="table table-hover">

            <!-- header -->
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Route</th>
                    <th>Duration</th>
                    <th>Cost</th>
                    <th></th>
                    <th></th>
                </tr>
            </thead>
            <!-- available options -->
            <tbody>
                <tr v-for="opt in getOptions" :key="opt.type">
                    <td>{{ opt.type }}</td>
                    <td>{{ opt.route }}</td>
                    <td>{{ formatDuration(opt.duration) }}</td>
                    <td>{{ opt.cost === 0 ? 'Free' : '₩' + opt.cost.toLocaleString() }}</td>
                    <td><button type="submit" @click="addSaved(opt)">Saved</button></td>
                    <td><button type="submit" @click="deleteSaved(opt)">Delete</button></td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
