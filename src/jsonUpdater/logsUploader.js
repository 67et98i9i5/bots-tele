const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { UserActivity, AnimeSelection, SeasonSelection, EpisodeSelection, QualitySelection, BotExitLog } = require('../models/Userdata');
const connectDB = require('../config/db');

const LOGS_PATH = path.join(__dirname, '../../logs/logs.json');

const updateFromLogs = async () => {
  try {
    await connectDB();

    // Read logs.json
    const rawLogs = fs.readFileSync(LOGS_PATH);
    const logs = JSON.parse(rawLogs);

    // Update UserActivity
    if (logs.users) {
      for (const [userId, user] of Object.entries(logs.users)) {
        await UserActivity.updateOne(
          { userId },
          {
            $set: {
              firstName: user.first_name,
              lastName: user.last_name,
              firstStartTime: new Date(user.first_start_time),
              lastStartTime: new Date(user.last_start_time)
            },
            $inc: { count: user.count }
          },
          { upsert: true }
        );
      }
    }

    // Update AnimeSelection
    if (logs.animeSelections) {
      for (const [userId, animeData] of Object.entries(logs.animeSelections)) {
        for (const [animeName, count] of Object.entries(animeData)) {
          await AnimeSelection.updateOne(
            { userId, animeName },
            { $inc: { count } },
            { upsert: true }
          );
        }
      }
    }

    // Update SeasonSelection
    if (logs.seasonSelections) {
      for (const [userId, animeData] of Object.entries(logs.seasonSelections)) {
        for (const [animeName, seasonData] of Object.entries(animeData)) {
          for (const [seasonName, count] of Object.entries(seasonData)) {
            await SeasonSelection.updateOne(
              { userId, animeName, seasonName },
              { $inc: { count } },
              { upsert: true }
            );
          }
        }
      }
    }

    // Update EpisodeSelection
    if (logs.episodeSelections) {
      for (const [userId, animeData] of Object.entries(logs.episodeSelections)) {
        for (const [animeName, seasonData] of Object.entries(animeData)) {
          for (const [seasonName, episodeData] of Object.entries(seasonData)) {
            for (const [episodeName, count] of Object.entries(episodeData)) {
              await EpisodeSelection.updateOne(
                { userId, animeName, seasonName, episodeName },
                { $inc: { count } },
                { upsert: true }
              );
            }
          }
        }
      }
    }

    // Update QualitySelection
    if (logs.qualitySelections) {
      for (const [userId, animeData] of Object.entries(logs.qualitySelections)) {
        for (const [animeName, seasonData] of Object.entries(animeData)) {
          for (const [seasonName, qualityData] of Object.entries(seasonData)) {
            for (const [quality, count] of Object.entries(qualityData)) {
              await QualitySelection.updateOne(
                { userId, animeName, seasonName, quality },
                { $inc: { count } },
                { upsert: true }
              );
            }
          }
        }
      }
    }

    // Update BotExitLog
    if (logs.botExitLog && Array.isArray(logs.botExitLog)) {
      const exitLogs = logs.botExitLog.map(log => ({
        exitTime: new Date(log.exitTime)
      }));
      if (exitLogs.length > 0) {
        await BotExitLog.insertMany(exitLogs);
      }
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Error updating from logs:', err);
  }
};

setInterval(updateFromLogs, 60 * 1000);
updateFromLogs();
