const fs = require('fs');
const path = require('path');

const logFilePath = path.resolve(__dirname, '../../logs/logs.json');
const cooldownMs = 10000;

const lastLoggedTimes = {};

function logUserStart(user) {
  const { id, first_name, last_name } = user;
  const now = Date.now();

  if (lastLoggedTimes[id] && now - lastLoggedTimes[id] < cooldownMs) {
    return;
  }

  lastLoggedTimes[id] = now;

  let logs = {};
  try {
    const data = fs.readFileSync(logFilePath, 'utf-8');
    logs = JSON.parse(data);
  } catch {
    logs = {};
  }

  if (!logs.users) logs.users = {};

  logs.users[id] = logs.users[id] || {
    count: 0,
    first_name,
    last_name,
    first_start_time: new Date().toISOString(),
  };

  logs.users[id].count += 1;
  logs.users[id].last_start_time = new Date().toISOString();

  fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));

  console.log(`User started bot: ${id} (${first_name} ${last_name || ''}) at ${logs.users[id].last_start_time}`);
  console.log(`User ${id} has started the bot ${logs.users[id].count} time(s).`);
}

function updateAnimeLog(userId, anime) {
  let logs = {};
  try {
    const data = fs.readFileSync(logFilePath, 'utf-8');
    logs = JSON.parse(data);
  } catch {
    logs = {};
  }

  if (!logs.animeSelections) logs.animeSelections = {};
  if (!logs.animeSelections[userId]) logs.animeSelections[userId] = {};

  if (!logs.animeSelections[userId][anime]) {
    logs.animeSelections[userId][anime] = 1;
  } else {
    logs.animeSelections[userId][anime] += 1;
  }

  console.log(`User ${userId} selected anime: ${anime}. Total selections: ${logs.animeSelections[userId][anime]}`);

  fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
}

function updateSeasonLog(userId, anime, season) {
  let logs = {};
  try {
    const data = fs.readFileSync(logFilePath, 'utf-8');
    logs = JSON.parse(data);
  } catch {
    logs = {};
  }

  logs.seasonSelections = logs.seasonSelections || {};
  logs.seasonSelections[userId] = logs.seasonSelections[userId] || {};
  logs.seasonSelections[userId][anime] = logs.seasonSelections[userId][anime] || {};

  if (!logs.seasonSelections[userId][anime][season]) {
    logs.seasonSelections[userId][anime][season] = 1;
  } else {
    logs.seasonSelections[userId][anime][season] += 1;
  }

  console.log(`User ${userId} selected season: ${season} of anime: ${anime}. Total selections: ${logs.seasonSelections[userId][anime][season]}`);

  fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
}

function updateEpisodeLog(userId, anime, season, episode, isSelected) {
  let logs = {};
  try {
    const data = fs.readFileSync(logFilePath, 'utf-8');
    logs = JSON.parse(data);
  } catch {
    logs = {};
  }

  logs.episodeSelections = logs.episodeSelections || {};
  logs.episodeSelections[userId] = logs.episodeSelections[userId] || {};
  logs.episodeSelections[userId][anime] = logs.episodeSelections[userId][anime] || {};
  logs.episodeSelections[userId][anime][season] = logs.episodeSelections[userId][anime][season] || {};

  const currentCount = logs.episodeSelections[userId][anime][season][episode] || 0;

  if (isSelected) {
    logs.episodeSelections[userId][anime][season][episode] = currentCount + 1;
  } else if (currentCount > 0) {
    logs.episodeSelections[userId][anime][season][episode] = currentCount - 1;
  } else {
    logs.episodeSelections[userId][anime][season][episode] = 0;
  }

  console.log(`User ${userId} ${isSelected ? 'selected' : 'unselected'} episode: ${episode} of season: ${season} anime: ${anime}. Total selections: ${logs.episodeSelections[userId][anime][season][episode]}`);

  fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
}

function updateQualityLog(userId, anime, season, quality) {
  let logs = {};
  try {
    const data = fs.readFileSync(logFilePath, 'utf-8');
    logs = JSON.parse(data);
  } catch {
    logs = {};
  }

  logs.qualitySelections = logs.qualitySelections || {};
  logs.qualitySelections[userId] = logs.qualitySelections[userId] || {};
  logs.qualitySelections[userId][anime] = logs.qualitySelections[userId][anime] || {};
  logs.qualitySelections[userId][anime][season] = logs.qualitySelections[userId][anime][season] || {};

  if (!logs.qualitySelections[userId][anime][season][quality]) {
    logs.qualitySelections[userId][anime][season][quality] = 1;
  } else {
    logs.qualitySelections[userId][anime][season][quality] += 1;
  }

  console.log(`User ${userId} selected quality: ${quality} for season: ${season} anime: ${anime}. Total selections: ${logs.qualitySelections[userId][anime][season][quality]}`);

  fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
}

function logBotExit() {
  const exitTime = new Date().toISOString();
  let logs = {};
  try {
    const data = fs.readFileSync(logFilePath, 'utf-8');
    logs = JSON.parse(data);
  } catch {
    logs = {};
  }

  logs.botExitLog = logs.botExitLog || [];
  logs.botExitLog.push({ exitTime });

  console.log(`Bot exited at ${exitTime}`);

  fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
}

module.exports = {
  logUserStart,
  updateAnimeLog,
  updateSeasonLog,
  updateEpisodeLog,
  updateQualityLog,
  logBotExit
};
