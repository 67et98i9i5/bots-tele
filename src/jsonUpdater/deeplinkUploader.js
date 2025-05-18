const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Deeplink = require('../models/Deeplink');

const DEEPLINK_PATH = path.join(__dirname, '../../logs/deeplinks.json');

async function updateDeeplink() {
  try {
    await connectDB();

    const rawData = fs.readFileSync(DEEPLINK_PATH, 'utf-8');
    const data = JSON.parse(rawData);

    for (const [userId, deeplinkTypes] of Object.entries(data.users || {})) {
      for (const [deeplinkType, animeData] of Object.entries(deeplinkTypes)) {
        for (const [animeId, seasons] of Object.entries(animeData)) {
          for (const [seasonName, episodes] of Object.entries(seasons)) {
            for (const [episodeName, qualityData] of Object.entries(episodes)) {
              if (typeof qualityData === 'object') {
                for (const [quality, count] of Object.entries(qualityData)) {
                  await Deeplink.updateOne(
                    { userId, deeplinkType, animeId, seasonName, episodeName, quality },
                    { $inc: { count } },
                    { upsert: true }
                  );
                }
              } else if (typeof qualityData === 'number') {
                await Deeplink.updateOne(
                  { userId, deeplinkType, animeId, seasonName, episodeName, quality: null },
                  { $inc: { count: qualityData } },
                  { upsert: true }
                );
              }
            }
          }
        }
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error updating deeplink:', error);
  }
}

setInterval(updateDeeplink, 60 * 1000);
updateDeeplink();
