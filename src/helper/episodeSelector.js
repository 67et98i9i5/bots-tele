const { Markup } = require('telegraf');
const {
  updateEpisodeLog,
} = require('./logger');

const selectedEpisodes = {};

function handleEpisodeSelection(ctx, animeName, seasonName, data) {
  const userId = String(ctx.from.id);
  const episodeData = data.anime_list[animeName]?.content[seasonName]?.episodes;
  if (!episodeData) return ctx.reply('❌ Episode data not found.');

  selectedEpisodes[userId] = selectedEpisodes[userId] || new Set();

  const sortedEpisodes = Object.keys(episodeData).sort((a, b) => {
    const epA = parseInt(a.replace('ep', ''), 10);
    const epB = parseInt(b.replace('ep', ''), 10);
    return epA - epB;
  });

  const buttons = sortedEpisodes.map(ep => {
    const selected = selectedEpisodes[userId].has(ep);
    const label = `${selected ? '✅' : '⬜'} ${ep}`;
    return [Markup.button.callback(label, `toggle_${animeName}_${seasonName}_${ep}`)];
  });

  buttons.push([Markup.button.callback('➡️ Proceed to Quality', `quality_${animeName}_${seasonName}`)]);
  ctx.editMessageText('🎞️ Toggle episodes:', Markup.inlineKeyboard(buttons));
}

function toggleEpisode(ctx, animeName, seasonName, episodeName) {
  const userId = String(ctx.from.id);
  selectedEpisodes[userId] = selectedEpisodes[userId] || new Set();
  const set = selectedEpisodes[userId];

  const wasSelected = set.has(episodeName);
  if (wasSelected) set.delete(episodeName);
  else set.add(episodeName);

  updateEpisodeLog(userId, animeName, seasonName, episodeName, !wasSelected);
}

function getSelectedEpisodes(userId) {
  return [...(selectedEpisodes[userId] || [])];
}

function resetSelectedEpisodes(userId) {
  delete selectedEpisodes[userId];
}

module.exports = {
  handleEpisodeSelection,
  toggleEpisode,
  getSelectedEpisodes,
  resetSelectedEpisodes,
};
