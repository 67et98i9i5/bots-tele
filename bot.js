require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const extras = require("./extras");
const express = require("express");
const app = express();

const bot = new Telegraf(process.env.BOT_TOKEN1);
const personalities = JSON.parse(
    fs.readFileSync("json/personalities.json", "utf8"),
);
const episodesData = JSON.parse(fs.readFileSync("json/episodes.json", "utf8"));

let userPersonalities = {};
const DEFAULT_PERSONALITY = "Rias Gremory";

// ✅ Register Commands
["api", "socials", "channels"].forEach((cmd) =>
    bot.command(cmd, (ctx) =>
        extras[`send${cmd.charAt(0).toUpperCase() + cmd.slice(1)}`](ctx),
    ),
);

const getPrompt = (ctx, key) => {
    return (
        personalities[userPersonalities[ctx.from.id] || DEFAULT_PERSONALITY]?.[
            key
        ] || `❌ Prompt not found for ${key}`
    );
};

const paginate = (items, page = 1, pageSize = 10) => ({
    paginatedItems: items.slice((page - 1) * pageSize, page * pageSize),
    totalPages: Math.ceil(items.length / pageSize),
});

const paginationButtons = (prefix, page, totalPages) => {
    let buttons = [];
    if (page > 1)
        buttons.push(
            Markup.button.callback("⬅️ Prev", `${prefix}_${page - 1}`),
        );
    if (page < totalPages)
        buttons.push(
            Markup.button.callback("Next ➡️", `${prefix}_${page + 1}`),
        );
    return buttons.length > 0 ? [buttons] : [];
};

// ✅ Show Anime List
bot.start((ctx) => showAnimeList(ctx, 1));

const showAnimeList = (ctx, page) => {
    const animeList = Object.keys(episodesData.anime_list);
    if (!animeList.length) return ctx.reply(getPrompt(ctx, "no_anime"));

    const { paginatedItems, totalPages } = paginate(animeList, page);

    ctx.reply(
        getPrompt(ctx, "select_anime"),
        Markup.inlineKeyboard([
            ...paginatedItems.map((anime) => [
                Markup.button.callback(anime, `anime_${anime}`),
            ]),
            ...paginationButtons("anime_page", page, totalPages),
        ]),
    );
};

bot.action(/^anime_page_(\d+)$/, (ctx) =>
    showAnimeList(ctx, parseInt(ctx.match[1])),
);

// ✅ Anime Selection
bot.action(/^anime_(.+)$/, (ctx) => {
    const anime = ctx.match[1];
    const seasons = Object.keys(episodesData.anime_list?.[anime] || {});

    if (!seasons.length) return ctx.reply(getPrompt(ctx, "anime_not_found"));

    ctx.reply(
        getPrompt(ctx, "select_season").replace("{anime}", anime),
        Markup.inlineKeyboard(
            seasons.map((season) => [
                Markup.button.callback(season, `season_${anime}_${season}`),
            ]),
        ),
    );
});

// ✅ Show Episodes
const showEpisodeList = (ctx, anime, season, page = 1) => {
    const eps = Object.keys(episodesData.anime_list?.[anime]?.[season] || {});
    if (!eps.length) return ctx.reply(getPrompt(ctx, "season_not_found"));

    const { paginatedItems, totalPages } = paginate(eps, page);

    ctx.reply(
        getPrompt(ctx, "episode_list")
            .replace("{anime}", anime)
            .replace("{season}", season),
        Markup.inlineKeyboard([
            ...paginatedItems.map((ep) => [
                Markup.button.callback(
                    episodesData.anime_list[anime][season][ep].ep_name,
                    `episode_${anime}_${season}_${ep}`,
                ),
            ]),
            ...paginationButtons(
                `episode_page_${anime}_${season}`,
                page,
                totalPages,
            ),
        ]),
    );
};

bot.action(/^season_(.+)_(.+)$/, (ctx) => {
    const [anime, season] = ctx.match.slice(1);
    showEpisodeList(ctx, anime, season, 1);
});

bot.action(/^episode_page_(.+)_(.+)_(\d+)$/, (ctx) => {
    const [anime, season, page] = ctx.match.slice(1);
    showEpisodeList(ctx, anime, season, parseInt(page));
});

// ✅ Episode Selection
bot.action(/^episode_(.+)_(.+)_(.+)$/, (ctx) => {
    const [anime, season, ep] = ctx.match.slice(1);
    const epData = episodesData.anime_list?.[anime]?.[season]?.[ep];

    if (!epData) return ctx.reply(getPrompt(ctx, "episode_not_found"));

    console.log(`Selected Episode: ${anime} - ${season} - ${ep}`);

    const qualityButtons = Object.entries(epData.qualities || {})
        .filter(([_, data]) => data.file_url?.startsWith("http"))
        .map(([quality, data]) => [
            Markup.button.url(`${quality} (${data.file_size})`, data.file_url),
        ]);

    if (!qualityButtons.length) {
        return ctx.reply(
            getPrompt(ctx, "no_links").replace("{episode}", epData.ep_name),
        );
    }

    ctx.reply(
        getPrompt(ctx, "download_options").replace("{episode}", epData.ep_name),
        Markup.inlineKeyboard(qualityButtons),
    );
});

// ✅ Change Personality
bot.command("changepersonality", (ctx) => {
    ctx.reply(
        getPrompt(ctx, "select_personality"),
        Markup.inlineKeyboard(
            Object.keys(personalities).map((p) => [
                Markup.button.callback(p, `set_personality_${p}`),
            ]),
        ),
    );
});

bot.action(/^set_personality_(.+)$/, (ctx) => {
    userPersonalities[ctx.from.id] = ctx.match[1];
    ctx.reply(
        getPrompt(ctx, "personality_changed").replace(
            "{personality}",
            ctx.match[1],
        ),
    );
});

app.get("/", (req, res) => {
    res.send("Bot is running...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// ✅ Launch Bot
bot.launch();
console.log("Bot is running...");
