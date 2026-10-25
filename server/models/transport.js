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

// unsave/save option --> only one option pre start & destination pair
savedRouteSchema.statics.toggleOption = async function ({tripId, start, end, option}) {
    let route = await this.findOne({tripId, start, end});

    if (!route) {
        // create new route document if it does not exist
        route = new this({tripId, start, end, options: [option]});
        await route.save();
        return {action: 'saved', route};
    }

    const existing = route.options[0];
    const isSame = existing &&
        existing.type === option.type &&
        lineKey(existing.route) === lineKey(option.route) &&
        existing.day === option.day &&
        existing.time === option.time;

    if (isSame) {
        // same option clicked again: unsave it
        await this.deleteOne({ _id: route._id });
        return { action: 'deleted' }; 
    }

    // a different option: replace the saved one
    route.options = [option];
    await route.save();
    return { action: existing ? 'replaced' : 'saved', route };
};

export default mongoose.model('SavedRoute', savedRouteSchema);