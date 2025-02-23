const { Telegraf, Markup, session, Scenes } = require("telegraf");
const fs = require("fs");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN2);
bot.use(session());

const episodesFile = "json/episodes.json";
if (!fs.existsSync(episodesFile)) fs.writeFileSync(episodesFile, JSON.stringify({ anime_list: {} }, null, 2));

const loadEpisodes = () => JSON.parse(fs.readFileSync(episodesFile, "utf-8"));
const saveEpisodes = (data) => fs.writeFileSync(episodesFile, JSON.stringify(data, null, 2));

const generateAnimeId = (episodes) => {
  const animeIds = Object.values(episodes.anime_list).map(a => parseInt(a.anime_id));
  return (Math.max(...animeIds, 67898) + 1).toString();
};

const generateSeasonId = (seasonNum) => `s${seasonNum}`;

const addAnimeWizard = new Scenes.WizardScene(
  "ADD_ANIME_WIZARD",
  async (ctx) => {
    await ctx.reply("Send the anime name:");
    ctx.wizard.state.animeData = {};
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.animeData.name = ctx.message?.text;
    if (!ctx.wizard.state.animeData.name) return ctx.reply("Invalid name, try again.");
    
    const episodes = loadEpisodes();
    ctx.wizard.state.animeData.anime_id = generateAnimeId(episodes);
    
    await ctx.reply("Number of seasons:");
    return ctx.wizard.next();
  },
  async (ctx) => {
    const numSeasons = parseInt(ctx.message?.text);
    if (isNaN(numSeasons) || numSeasons <= 0) return ctx.reply("Invalid number, try again.");
    
    ctx.wizard.state.animeData.seasons = numSeasons;
    ctx.wizard.state.animeData.episodes = {};
    ctx.wizard.state.currentSeason = 1;
    
    await ctx.reply(`Number of episodes for Season 1:`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const numEpisodes = parseInt(ctx.message?.text);
    if (isNaN(numEpisodes) || numEpisodes <= 0) return ctx.reply("Invalid number, try again.");

    const { animeData, currentSeason } = ctx.wizard.state;
    const animeName = animeData.name;
    const seasonKey = `Season ${currentSeason}`;
    
    if (!animeData.episodes[seasonKey]) {
      animeData.episodes[seasonKey] = { season_id: generateSeasonId(currentSeason) };
    }
    
    for (let j = 1; j <= numEpisodes; j++) {
      animeData.episodes[seasonKey][`Episode ${j}`] = {
        ep_name: `Episode ${j}`,
        ep_number: `${j}`,
        qualities: {
          "360p": { file_size: "N/A", file_url: "N/A" },
          "720p": { file_size: "N/A", file_url: "N/A" },
          "1080p": { file_size: "N/A", file_url: "N/A" },
        },
      };
    }

    if (currentSeason < animeData.seasons) {
      ctx.wizard.state.currentSeason++;
      await ctx.reply(`Number of episodes for Season ${ctx.wizard.state.currentSeason}:`);
      return;
    }

    const existingData = loadEpisodes();
    existingData.anime_list[animeName] = {
      anime_id: animeData.anime_id,
      ...animeData.episodes,
    };
    saveEpisodes(existingData);

    await ctx.reply(`✅ Anime "${animeData.name}" (ID: ${animeData.anime_id}) has been added!`);
    return ctx.scene.leave();
  }
);

const editAnimeWizard = new Scenes.WizardScene(
  "EDIT_ANIME_WIZARD",
  async (ctx) => {
    const episodes = loadEpisodes();
    const animeButtons = Object.keys(episodes.anime_list).map((anime) =>
      Markup.button.callback(anime, `anime_${anime}`)
    );

    if (animeButtons.length === 0) return ctx.reply("No anime available!");

    await ctx.reply("Choose an anime:", Markup.inlineKeyboard(animeButtons, { columns: 1 }));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    ctx.wizard.state.animeName = ctx.callbackQuery.data.replace("anime_", "");
    
    await ctx.reply(
      "What do you want to edit?",
      Markup.inlineKeyboard([
        [Markup.button.callback("✏️ Rename Anime", "rename_anime")],
        [Markup.button.callback("🎬 Edit Episode", "edit_episode")],
        [Markup.button.callback("➕ Add New Season", "add_season")],
      ])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    ctx.wizard.state.action = ctx.callbackQuery.data;
    
    if (ctx.wizard.state.action === "edit_episode") {
      const episodes = loadEpisodes();
      const seasons = Object.keys(episodes.anime_list[ctx.wizard.state.animeName]).filter(s => s.startsWith("Season"));

      const seasonButtons = seasons.map((season) => Markup.button.callback(season, `season_${season}`));
      await ctx.reply(`Choose a season:`, Markup.inlineKeyboard(seasonButtons, { columns: 1 }));
      return ctx.wizard.next();
    }
  },
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    ctx.wizard.state.season = ctx.callbackQuery.data.replace("season_", "");

    const episodes = loadEpisodes();
    const { animeName, season } = ctx.wizard.state;
    const episodeButtons = Object.keys(episodes.anime_list[animeName][season])
      .filter(e => e.startsWith("Episode"))
      .map((ep) => Markup.button.callback(ep, `ep_${ep}`));

    await ctx.reply("Choose an episode to edit:", Markup.inlineKeyboard(episodeButtons, { columns: 3 }));
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    ctx.wizard.state.episode = ctx.callbackQuery.data.replace("ep_", "");

    ctx.wizard.state.qualities = ["360p", "720p", "1080p"];
    ctx.wizard.state.currentQualityIndex = 0;

    await ctx.reply(`Enter URL for ${ctx.wizard.state.qualities[ctx.wizard.state.currentQualityIndex]} (or type 'N/A'):`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const inputText = ctx.message?.text;
    if (!inputText) return ctx.reply("Invalid input, try again.");

    const quality = ctx.wizard.state.qualities[ctx.wizard.state.currentQualityIndex];

    // Allow "N/A" or a valid URL
    if (inputText.toLowerCase() === "n/a" || inputText.startsWith("http")) {
      ctx.wizard.state[`url_${quality}`] = inputText;
    } else {
      return ctx.reply("Invalid URL. Please enter a valid link or type 'N/A'.");
    }

    await ctx.reply(`Enter file size for ${quality} (or type 'N/A'):`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const inputText = ctx.message?.text;
    if (!inputText) return ctx.reply("Invalid input, try again.");

    const quality = ctx.wizard.state.qualities[ctx.wizard.state.currentQualityIndex];

    // Allow "N/A" or a valid file size
    if (inputText.toLowerCase() === "n/a" || /^\d+(\.\d+)?\s?(MB|GB)?$/i.test(inputText)) {
      ctx.wizard.state[`size_${quality}`] = inputText.toUpperCase(); // Convert to uppercase for consistency
    } else {
      return ctx.reply("Invalid size. Please enter a number (e.g. '500MB', '1.5GB') or type 'N/A'.");
    }

    ctx.wizard.state.currentQualityIndex++;

    if (ctx.wizard.state.currentQualityIndex < ctx.wizard.state.qualities.length) {
      await ctx.reply(`Enter URL for ${ctx.wizard.state.qualities[ctx.wizard.state.currentQualityIndex]} (or type 'N/A'):`);
      return ctx.wizard.back();
    }

    const episodes = loadEpisodes();
    const { animeName, season, episode } = ctx.wizard.state;
    const episodeData = episodes.anime_list[animeName][season][episode];

    ctx.wizard.state.qualities.forEach((quality) => {
      episodeData.qualities[quality] = {
        file_url: ctx.wizard.state[`url_${quality}`],
        file_size: ctx.wizard.state[`size_${quality}`],
      };
    });

    saveEpisodes(episodes);
    await ctx.reply(`✅ Episode ${episode} updated successfully!`);
    return ctx.scene.leave();
  }
);


const stage = new Scenes.Stage([editAnimeWizard]);
bot.use(stage.middleware());

// Bot menu
bot.start(async (ctx) => {
  await ctx.reply(
    "Welcome! Choose an option:",
    Markup.inlineKeyboard([
      [Markup.button.callback("➕ Add Anime", "add_anime")],
      [Markup.button.callback("✏️ Edit Anime", "edit_anime")],
    ])
  );
});

// Action handlers for entering wizards
bot.action("add_anime", (ctx) => ctx.scene.enter("ADD_ANIME_WIZARD"));
bot.action("edit_anime", (ctx) => ctx.scene.enter("EDIT_ANIME_WIZARD"));

// Start the bot
bot.launch().then(() => console.log("Bot is running..."));
