const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const {
  UserActivity,
  AnimeSelection,
  SeasonSelection,
  EpisodeSelection,
  QualitySelection,
  BotExitLog
} = require('../models/Userdata');
const connectDB = require('../config/db');

const importData = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB Connected');

    console.time('Read+Parse JSON');
    const rawData = fs.readFileSync(path.join(__dirname, '../../data/Usersdata.json'));
    const data = JSON.parse(rawData);
    console.timeEnd('Read+Parse JSON');

    console.time('Clear Collections');
    const collections = await mongoose.connection.db.listCollections().toArray();
    await Promise.all(collections.map(c => mongoose.connection.db.collection(c.name).deleteMany({})));
    console.timeEnd('Clear Collections');

    console.time('UserActivity');
    const userActivities = Object.entries(data.users || {}).map(([userId, user]) => ({
      userId,
      count: user.count,
      firstName: user.first_name,
      lastName: user.last_name,
      firstStartTime: new Date(user.first_start_time),
      lastStartTime: new Date(user.last_start_time)
    }));
    await UserActivity.insertMany(userActivities);
    console.timeEnd('UserActivity');

    console.time('AnimeSelection');
    const animeSelections = [];
    for (const [userId, animeData] of Object.entries(data.animeSelections || {})) {
      for (const [animeName, count] of Object.entries(animeData)) {
        animeSelections.push({ userId, animeName, count });
      }
    }
    await AnimeSelection.insertMany(animeSelections);
    console.timeEnd('AnimeSelection');

    console.time('SeasonSelection');
    const seasonSelections = [];
    for (const [userId, animeData] of Object.entries(data.seasonSelections || {})) {
      for (const [animeName, seasonData] of Object.entries(animeData)) {
        for (const [seasonName, count] of Object.entries(seasonData)) {
          seasonSelections.push({ userId, animeName, seasonName, count });
        }
      }
    }
    await SeasonSelection.insertMany(seasonSelections);
    console.timeEnd('SeasonSelection');

    console.time('EpisodeSelection');
    const episodeSelections = [];
    for (const [userId, animeData] of Object.entries(data.episodeSelections || {})) {
      for (const [animeName, seasonData] of Object.entries(animeData)) {
        for (const [seasonName, episodeData] of Object.entries(seasonData)) {
          for (const [episodeName, count] of Object.entries(episodeData)) {
            episodeSelections.push({ userId, animeName, seasonName, episodeName, count });
          }
        }
      }
    }
    await EpisodeSelection.insertMany(episodeSelections);
    console.timeEnd('EpisodeSelection');

    console.time('QualitySelection');
    const qualitySelections = [];
    for (const [userId, animeData] of Object.entries(data.qualitySelections || {})) {
      for (const [animeName, seasonData] of Object.entries(animeData)) {
        for (const [seasonName, qualityData] of Object.entries(seasonData)) {
          for (const [quality, count] of Object.entries(qualityData)) {
            qualitySelections.push({ userId, animeName, seasonName, quality, count });
          }
        }
      }
    }
    await QualitySelection.insertMany(qualitySelections);
    console.timeEnd('QualitySelection');

    console.time('BotExitLog');
    const exitLogs = (data.botExitLog || []).map(log => ({
      exitTime: new Date(log.exitTime)
    }));
    await BotExitLog.insertMany(exitLogs);
    console.timeEnd('BotExitLog');

    console.log('✅ Data imported successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Import failed:', err);
    process.exit(1);
  }
};

importData();
