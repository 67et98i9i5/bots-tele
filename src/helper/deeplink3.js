function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const { updateDeeplink3Log } = require('../helper/deeplinklogger');

module.exports = async function handleDeeplink3({ ctx, animeCode, seasonId, quality, data }) {
  const userId = String(ctx.from.id);

  const animeEntry = Object.entries(data.anime_list).find(
    ([_, anime]) => anime.anime_id === animeCode
  );

  if (!animeEntry) {
    return ctx.reply('❌ Anime not found.');
  }

  const [animeTitle, animeData] = animeEntry;
  const season = animeData.content[`Season ${seasonId.replace('s', '')}`];
  if (!season) {
    return ctx.reply('❌ Season not found.');
  }

  const episodeEntries = Object.entries(season.episodes);

  episodeEntries.sort((a, b) => {
    const numA = parseInt(a[0].replace('Episode ', ''));
    const numB = parseInt(b[0].replace('Episode ', ''));
    return numA - numB;
  });

  let sentCount = 0;

  for (const [epName, episode] of episodeEntries) {
    const q = episode.qualities[quality];
    if (!q) continue;

    const caption = `
🎬 *${animeTitle}* — ${epName}
📥 Quality: *${quality}*
💾 ${q.file_size}
🔗 [Episode Link](${episode.episode_link})
    `.trim();

    try {
      await ctx.replyWithVideo(q.file_id, {
        caption,
        parse_mode: 'Markdown',
      });

      updateDeeplink3Log(userId, animeCode, seasonId, epName, quality);
      sentCount++;
      await sleep(300);
    } catch (error) {
      console.error(`❌ Failed to send ${epName}:`, error.message);
    }
  }

  if (sentCount === 0) {
    return ctx.reply(`❌ No episodes found in *${quality}* quality.`, { parse_mode: 'Markdown' });
  }

  ctx.reply(`✅ Sent ${sentCount} episodes in *${quality}* quality.`, { parse_mode: 'Markdown' });
};
