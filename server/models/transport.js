import mongoose from "mongoose";

const savedRouteSchema = new mongoose.Schema({
    tripId: {type: String, required: true},
    start: {type: String, required: true},
    end: {type: String, required: true},
    options: [{
        type: {type: String, required: true},
        route: {type: String, required: true},
        duration: {type: Number, required: true},
        cost: {type: Number, default: null},
        currency: {type: String, default: null},
        day: String,
        time: String,
        timeType: String
    }]
}, {timestamps: true});

// prevent duplicate entries for same start/end pair per user
savedRouteSchema.index({ tripId: 1, start: 1, end:1}, {unique: true }); 

// Reduces a route to its transit lines only, so small changes in minutes/stops don't count as a different route
function lineKey(route = '') {
    return route.split('→').map(s => s.trim()).filter(s => !s.startsWith('Walk ('))
        .map(s => s.replace(/\(.*?\)/g, '').trim()).join('>');
}

// get all saved routes for a specfic trip
savedRouteSchema.statics.findByTripId = function(tripId) {
    return this.find({tripId});
};

// unsave/save option
savedRouteSchema.statics.toggleOption = async function ({tripId, start, end, option}) {
    let route = await this.findOne({tripId, start, end});

    if (!route) {
        // create new route document if it does not exist
        route = new this({tripId, start, end, options: [option]});
        await route.save();
        return {action: 'saved', route};
    }

    const index = route.options.findIndex(o => o.type === option.type && lineKey(o.route) === lineKey(option.route)
    && o.day === option.day && o.time === option.time);

    if (index > -1) {
        // unsave option
        route.options.splice(index, 1);
    } else {
        // save option
        route.options.push(option);
    }

    // remove route document if no options remain
    if (route.options.length === 0) {
        await this.deleteOne({ _id: route._id });
        return {action: 'deleted'};
    }

    await route.save();
    return {action: index > -1 ? 'removed' : 'saved', route};
};

export default mongoose.model('SavedRoute', savedRouteSchema);
