const { Markup } = require('telegraf');
const { updateDeeplink1Log } = require('../helper/deeplinklogger');
const { getAnimeTitle } = require('../helper/titleHandler');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async function handleDeeplink1({ ctx, animeCode, seasonId, episodeNum, quality, data }) {
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

  const qualityInfo = episode.qualities[quality];
  if (!qualityInfo) {
    return ctx.reply(`❌ Quality "${quality}" not available.`);
  }

  const title = getAnimeTitle(animeCode, seasonId) || 'Unknown Title';

  const caption = `
🎬 *${title}* — Episode ${episodeNum}
📥 Quality: *${quality}*
💾 ${qualityInfo.file_size}
🔗 [Episode Link](${episode.episode_link})
  `.trim();

  try {
    await ctx.replyWithVideo(qualityInfo.file_id, {
      caption,
      parse_mode: 'Markdown',
    });

    updateDeeplink1Log(userId, animeCode, seasonId, `Episode ${episodeNum}`, quality);

    await sleep(300);
  } catch (error) {
    console.error(`❌ Failed to send video:`, error.message);
    return ctx.reply('❌ There was an issue sending the video.');
  }
};
