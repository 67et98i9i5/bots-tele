const fs = require('fs');
const path = require('path');

const logFilePath = path.resolve(__dirname, '../../logs/deeplinks.json');

function readLog() {
  try {
    const raw = fs.readFileSync(logFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { users: {} };
    if (!parsed.users || typeof parsed.users !== 'object') parsed.users = {};
    return parsed;
  } catch (err) {
    console.error('Error reading log file:', err.message);
    return { users: {} };
  }
}

function writeLog(log) {
  try {
    fs.writeFileSync(logFilePath, JSON.stringify(log, null, 2));
    console.log('Log written successfully');
  } catch (err) {
    console.error('Error writing log file:', err.message);
  }
}

function updateDeeplink1Log(userId, animeCode, seasonId, episodeNum, quality) {
  const log = readLog();

  if (!log.users[userId]) log.users[userId] = {};
  if (!log.users[userId].deeplink1) log.users[userId].deeplink1 = {};
  if (!log.users[userId].deeplink1[animeCode]) log.users[userId].deeplink1[animeCode] = {};
  if (!log.users[userId].deeplink1[animeCode][seasonId]) log.users[userId].deeplink1[animeCode][seasonId] = {};
  if (!log.users[userId].deeplink1[animeCode][seasonId][episodeNum]) log.users[userId].deeplink1[animeCode][seasonId][episodeNum] = {};
  if (!log.users[userId].deeplink1[animeCode][seasonId][episodeNum][quality]) {
    log.users[userId].deeplink1[animeCode][seasonId][episodeNum][quality] = 0;
  }

  log.users[userId].deeplink1[animeCode][seasonId][episodeNum][quality] += 1;

  console.log(`Deeplink1 log updated: user=${userId}, anime=${animeCode}, season=${seasonId}, episode=${episodeNum}, quality=${quality}`);

  writeLog(log);
}

function updateDeeplink2Log(userId, animeCode, seasonId, episodeNum) {
  const log = readLog();

  if (!log.users[userId]) log.users[userId] = {};
  if (!log.users[userId].deeplink2) log.users[userId].deeplink2 = {};
  if (!log.users[userId].deeplink2[animeCode]) log.users[userId].deeplink2[animeCode] = {};
  if (!log.users[userId].deeplink2[animeCode][seasonId]) log.users[userId].deeplink2[animeCode][seasonId] = {};
  if (!log.users[userId].deeplink2[animeCode][seasonId][episodeNum]) {
    log.users[userId].deeplink2[animeCode][seasonId][episodeNum] = 0;
  }

  log.users[userId].deeplink2[animeCode][seasonId][episodeNum] += 1;

  console.log(`Deeplink2 log updated: user=${userId}, anime=${animeCode}, season=${seasonId}, episode=${episodeNum}`);

  writeLog(log);
}

function updateDeeplink3Log(userId, animeCode, seasonId, quality) {
  const log = readLog();

  if (!log || typeof log !== 'object') throw new Error('Invalid log object');

  if (!log.users) log.users = {};
  if (!log.users[userId]) log.users[userId] = {};
  if (!log.users[userId].deeplink3) log.users[userId].deeplink3 = {};
  if (!log.users[userId].deeplink3[animeCode]) log.users[userId].deeplink3[animeCode] = {};
  if (!log.users[userId].deeplink3[animeCode][seasonId]) log.users[userId].deeplink3[animeCode][seasonId] = {};
  if (!log.users[userId].deeplink3[animeCode][seasonId][quality]) {
    log.users[userId].deeplink3[animeCode][seasonId][quality] = 0;
  }

  log.users[userId].deeplink3[animeCode][seasonId][quality] += 1;

  console.log(`Deeplink3 log updated: user=${userId}, anime=${animeCode}, season=${seasonId}, quality=${quality}`);

  writeLog(log);
}

module.exports = {
  updateDeeplink1Log,
  updateDeeplink2Log,
  updateDeeplink3Log,
};
