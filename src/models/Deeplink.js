const mongoose = require('mongoose');

const deeplinkSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  deeplinkType: { type: String, required: true }, // e.g. deeplink1, deeplink3
  animeId: { type: String, required: true },
  seasonName: { type: String, required: true },
  episodeName: { type: String, required: true },
  quality: { type: String, default: null }, // can be null if no quality info
  count: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Deeplink', deeplinkSchema);
