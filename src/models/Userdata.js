const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  count: { type: Number, default: 0 },
  firstName: String,
  lastName: String,
  firstStartTime: Date,
  lastStartTime: Date
});

const animeSelectionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  animeName: { type: String, required: true },
  count: { type: Number, default: 1 }
});

const seasonSelectionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  animeName: { type: String, required: true },
  seasonName: { type: String, required: true },
  count: { type: Number, default: 1 }
});

const episodeSelectionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  animeName: { type: String, required: true },
  seasonName: { type: String, required: true },
  episodeName: { type: String, required: true },
  count: { type: Number, default: 1 }
});

const qualitySelectionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  animeName: { type: String, required: true },
  seasonName: { type: String, required: true },
  quality: { type: String, required: true },
  count: { type: Number, default: 1 }
});

const botExitLogSchema = new mongoose.Schema({
  exitTime: { type: Date, required: true }
});

// Create models
const UserActivity = mongoose.model('UserActivity', userActivitySchema);
const AnimeSelection = mongoose.model('AnimeSelection', animeSelectionSchema);
const SeasonSelection = mongoose.model('SeasonSelection', seasonSelectionSchema);
const EpisodeSelection = mongoose.model('EpisodeSelection', episodeSelectionSchema);
const QualitySelection = mongoose.model('QualitySelection', qualitySelectionSchema);
const BotExitLog = mongoose.model('BotExitLog', botExitLogSchema);

module.exports = {
  UserActivity,
  AnimeSelection,
  SeasonSelection,
  EpisodeSelection,
  QualitySelection,
  BotExitLog
};