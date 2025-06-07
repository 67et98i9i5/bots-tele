// src/bots/mainBot.js
const path = require('path');
const fs = require('fs');
const { Telegraf, Markup } = require('telegraf');

const handleDeeplink1 = require('../helper/deeplink1');
const handleDeeplink2 = require('../helper/deeplink2');
const handleDeeplink3 = require('../helper/deeplink3');
const handleAnimeSelection = require('../helper/animeSelector');
const handleSeasonSelection = require('../helper/seasonSelector');
const { handleEpisodeSelection, toggleEpisode, getSelectedEpisodes, resetSelectedEpisodes } = require('../helper/episodeSelector');
const { 
  logUserStart, 
  updateAnimeLog, 
  updateSeasonLog, 
  updateEpisodeLog, 
  updateQualityLog, 
  logBotExit 
} = require('../helper/logger');
const {
  updateDeeplink1Log,
  updateDeeplink2Log,
  updateDeeplink3Log
} = require('../helper/deeplinklogger');


const bot = new Telegraf('');

const dataPath = path.join(__dirname, '../../data/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

bot.start((ctx) => {
  const user = ctx.from;
  logUserStart(user);

  const startParam = ctx.startPayload;

  if (startParam) {
    const parts = startParam.split('_');

    if (parts.length === 4) {
      const [animeCode, seasonId, episodeNum, quality] = parts;
      updateDeeplink1Log(String(ctx.from.id), animeCode, seasonId, episodeNum, quality);
      return handleDeeplink1({ ctx, animeCode, seasonId, episodeNum, quality, data });
    }

    if (parts.length === 3) {
      const [animeCode, seasonId, third] = parts;

      if (/^\d+$/.test(third)) {
        updateDeeplink2Log(String(ctx.from.id), animeCode, seasonId, third);
        return handleDeeplink2({ ctx, animeCode, seasonId, episodeNum: third, data });
      } else {
        updateDeeplink3Log(String(ctx.from.id), animeCode, seasonId, null, third);
        return handleDeeplink3({ ctx, animeCode, seasonId, quality: third, data });
      }
    }

    return ctx.reply('❌ Invalid deeplink format.');
  }

  handleAnimeSelection(ctx, data);
});

bot.action(/^anime_(.+)$/, (ctx) => {
  const animeName = ctx.match[1];
  const userId = String(ctx.from.id);

  updateAnimeLog(userId, animeName);
  handleSeasonSelection(ctx, animeName, data);
});

bot.action(/^season_(.+)_(.+)$/, (ctx) => {
  const [, animeName, seasonName] = ctx.match;
  const userId = String(ctx.from.id);

  updateSeasonLog(userId, animeName, seasonName);
  handleEpisodeSelection(ctx, animeName, seasonName, data);
});

bot.action(/^toggle_(.+)_(.+)_(.+)$/, async (ctx) => {
  const [, animeName, seasonName, episodeName] = ctx.match;
  const userId = String(ctx.from.id);

  updateEpisodeLog(userId, animeName, seasonName, episodeName);
  toggleEpisode(ctx, animeName, seasonName, episodeName);
  handleEpisodeSelection(ctx, animeName, seasonName, data);
});

bot.action(/^quality_(.+)_(.+)$/, async (ctx) => {
  const [, animeName, seasonName] = ctx.match;
  const userId = String(ctx.from.id);
  const episodes = getSelectedEpisodes(userId);
  if (episodes.length === 0) return ctx.reply('❌ No episodes selected.');

  const animeData = data.anime_list[animeName]?.content[seasonName]?.episodes;
  if (!animeData) return ctx.reply('❌ Episode data not found.');

  const availableQualities = new Set();

  episodes.forEach(ep => {
    const epData = animeData[ep];
    if (epData && epData.qualities) {
      Object.keys(epData.qualities).forEach(q => {
        if (epData.qualities[q]?.file_id) availableQualities.add(q);
      });
    }
  });

  if (availableQualities.size === 0) return ctx.reply('❌ No available qualities for selected episodes.');

  const qualityButtons = [...availableQualities].sort((a, b) => parseInt(b) - parseInt(a))
    .map(q => [Markup.button.callback(q, `send_${animeName}_${seasonName}_${q}`)]);

  await ctx.editMessageText('📥 Choose a quality:', Markup.inlineKeyboard(qualityButtons));
});

bot.action(/^send_(.+)_(.+)_(\d+p)$/, async (ctx) => {
  const [, animeName, seasonName, quality] = ctx.match;
  const userId = String(ctx.from.id);
  const episodes = getSelectedEpisodes(userId);

  if (episodes.length === 0) return ctx.reply('❌ No episodes selected.');

  updateQualityLog(userId, animeName, seasonName, quality);

  // existing send logic unchanged

  const episodeData = data.anime_list[animeName]?.content[seasonName]?.episodes;

  for (const ep of episodes) {
    const fileData = episodeData[ep]?.qualities?.[quality];

    if (!fileData) {
      await ctx.reply(`⚠️ ${ep} (${quality}) not available.`);
    } else {
      const fileId = fileData.file_id;
      const fileSize = fileData.file_size;
      const episodeLink = episodeData[ep]?.episode_link;

      const caption = `
        🎬 *${animeName}*  
        📺 *Season:* ${seasonName}  
        📆 *Episode:* ${ep}  
        🏷️ *Quality:* ${quality}  
        💾 *File Size:* ${fileSize}  
        🔗 *Episode Link:* [Watch here](${episodeLink})
      `;

      await ctx.replyWithVideo(fileId, { caption, parse_mode: 'Markdown' });
    }
  }

  resetSelectedEpisodes(userId);
});

process.on('exit', () => logBotExit());
process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());

bot.launch().then(() => console.log('✅ Bot is running.'));
