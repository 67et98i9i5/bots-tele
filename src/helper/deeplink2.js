const { Markup } = require('telegraf');
const { updateDeeplink2Log } = require('../helper/deeplinklogger');
const { getAnimeTitle } = require('../helper/titleHandler');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async function handleDeeplink2({ ctx, animeCode, seasonId, episodeNum, data }) {
  const animeEntry = Object.entries(data.anime_list).find(
    ([_, anime]) => anime.anime_id === animeCode
  );

  if (!animeEntry) {
    return ctx.reply('❌ Anime not found.');
  }

  const [, animeData] = animeEntry;

  const seasonKey = Object.keys(animeData.content).find(key => {
    const normalizedKey = key.toLowerCase().replace(/\s|-/g, '');
    const normalizedInput = seasonId.toLowerCase().replace(/\s|-/g, '');

    if (normalizedKey === normalizedInput) return true;
    if (normalizedKey === 'season' + normalizedInput.replace(/^s/, '')) return true;
    return false;
  });

  if (!seasonKey) {
    return ctx.reply('❌ Season not found.');
  }

  const season = animeData.content[seasonKey];

  if (!season) {
    return ctx.reply('❌ Season not found.');
  }

  const episode = season.episodes[`Episode ${episodeNum}`];
  if (!episode) {
    return ctx.reply('❌ Episode not found.');
  }

  const qualityOptions = ['360p', '720p', '1080p'];

  const title = getAnimeTitle(animeCode, seasonId) || 'Unknown Title';

  const buttons = qualityOptions.map((q) =>
    Markup.button.callback(q, `choose_quality_${q}_${animeCode}_${seasonId}_${episodeNum}`)
  );

  await ctx.reply(
    `🎬 *${title}* — Season ${seasonId.replace('s', '')}, Episode ${episodeNum}\nChoose a quality:`,
    Markup.inlineKeyboard([buttons]),
    { parse_mode: 'Markdown' }
  );
};

module.exports.chooseQuality = async function (ctx, animeCode, seasonId, episodeNum, quality, data) {
  const userId = String(ctx.from.id);

  const animeEntry = Object.entries(data.anime_list).find(
    ([_, anime]) => anime.anime_id === animeCode
  );

  if (!animeEntry) {
    return ctx.reply('❌ Anime not found.');
  }

  const [, animeData] = animeEntry;

  const seasonKey = Object.keys(animeData.content).find(key => {
    const normalizedKey = key.toLowerCase().replace(/\s|-/g, '');
    const normalizedInput = seasonId.toLowerCase().replace(/\s|-/g, '');

    if (normalizedKey === normalizedInput) return true;
    if (normalizedKey === 'season' + normalizedInput.replace(/^s/, '')) return true;
    return false;
  });

  if (!seasonKey) {
    return ctx.reply('❌ Season not found.');
  }

  const season = animeData.content[seasonKey];

  if (!season) {
    return ctx.reply('❌ Season not found.');
  }

  const episode = season.episodes[`Episode ${episodeNum}`];
  if (!episode) {
    return ctx.reply('❌ Episode not found.');
  }

  const q = episode.qualities[quality];
  if (!q) {
    return ctx.reply('❌ Selected quality not available.');
  }

  const title = getAnimeTitle(animeCode, seasonId) || 'Unknown Title';

  const caption = `
🎬 *${title}* — Season ${seasonId.replace('s', '')}, Episode ${episodeNum}
📥 Quality: *${quality}*
💾 ${q.file_size}
🔗 [Episode Link](${episode.episode_link})
  `.trim();

  await ctx.replyWithVideo(q.file_id, {
    caption,
    parse_mode: 'Markdown',
  });

  updateDeeplink2Log(userId, animeCode, seasonId, `Episode ${episodeNum}`, quality);

  await sleep(300);
};
