const { Telegraf } = require('telegraf');
const axios = require('axios'); 
const fs = require('fs'); 
const path = require('path'); 
require('dotenv').config();
const bot = new Telegraf("7846813473:AAGentIPQ68PUJA2sxj99mMsWpA-Oe9j2yc");

const API_URL = "https://noasaga-api-main-sbmi.onrender.com/anime/data";
const LOG_FILE = path.join(__dirname, '../logs', 'actions.txt');
const DATA_FILE = path.join(__dirname, "../data", "data.json");

let animeDataCache = null;
const userSelections = {};

// ✅ Fetch & store anime data every 5-10 minutes
async function loadAnimeData(forceUpdate = false) {
    try {
        console.log("🔄 Checking for anime data updates...");

        const response = await axios.get(API_URL);
        const newData = response.data;

        if (JSON.stringify(newData) !== JSON.stringify(animeDataCache) || forceUpdate) {
            animeDataCache = newData.anime_list;  // Access anime_list from the new structure
            fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2));
            console.log("✅ Anime data updated and saved to file!");
        }
    } catch (error) {
        console.error("❌ Error loading anime data:", error);
    }
}

// ✅ Load anime data from local file first
function loadLocalAnimeData() {
    if (fs.existsSync(DATA_FILE)) {
        animeDataCache = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")).anime_list;  // Access anime_list from the local file
        console.log("✅ Loaded anime data from local file.");
    } else {
        console.log("⚠ No local data found, fetching from API...");
        loadAnimeData(true);
    }
}

// 🔄 Fetch anime data every 5-10 minutes
loadLocalAnimeData();
setInterval(() => loadAnimeData(), Math.floor(Math.random() * (600000 - 300000 + 1)) + 300000);

// ✅ Log user activity
function logActivity(ctx, action) {
    const user = ctx.from;
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${user.first_name} ${user.last_name || ""} (ID: ${user.id}) - ${action}\n`;

    console.log(logEntry.trim());
    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) console.error("❌ Error writing log:", err);
    });
}

// ✅ Function to get file_id based on anime_id, season, episode, and quality
function getFileIdFromParams(animeId, seasonId, episodeId, quality) {
    for (const anime in animeDataCache) {
        if (animeDataCache[anime].anime_id === animeId) {
            const seasons = animeDataCache[anime];
            for (const season in seasons) {
                if (seasons[season].season_id === seasonId) {
                    const episodes = seasons[season].episodes;
                    for (const episode in episodes) {
                        if (episodes[episode].ep_number === episodeId) {
                            const fileData = episodes[episode].qualities[quality];
                            return fileData ? fileData.file_id : null;
                        }
                    }
                }
            }
        }
    }
    return null;
}

bot.start((ctx) => {
    logActivity(ctx, "Started the bot");

    if (!animeDataCache) {
        ctx.reply("❌ *Anime data is still loading...*\nPlease try again in a few moments.", { parse_mode: "Markdown" });
        return;
    }

    const startPayload = ctx.startPayload;
    logActivity(ctx, `Raw startPayload: ${startPayload}`);

    if (startPayload) {
        const params = startPayload.split("_");
        const animeId = params[0] || null;
        const seasonId = params[1] || null;
        const episodeId = params[2] || null;
        const quality = params[3] || null;

        logActivity(ctx, `Parsed Start Payload: anime_id=${animeId}, season_id=${seasonId}, episode_id=${episodeId}, quality=${quality}`);

        if (animeId && seasonId && episodeId && quality) {
            const fileId = getFileIdFromParams(animeId, seasonId, episodeId, quality);
            if (fileId) {
                ctx.replyWithVideo(fileId, { caption: `📺 **Episode ${episodeId}** | 🎞️ Quality: *${quality}*`, parse_mode: "Markdown" });
            } else {
                ctx.reply("⚠ *This episode or quality is currently unavailable.*", { parse_mode: "Markdown" });
            }
        } else {
            ctx.reply("⚠ *Invalid deep link!*\nMake sure you're using a correct format.", { parse_mode: "Markdown" });
        }
    } else {
        ctx.reply("👋 *Welcome to the Noasaga Bot!* 🎌\n\n💡 *Browse & download your favorite anime episodes!*", {
            reply_markup: { inline_keyboard: [[{ text: "🎬 Browse Anime", callback_data: "browse_anime" }]] },
            parse_mode: "Markdown"
        });
    }
});


// 📜 Improved Anime List Display
function sendAnimeList(ctx) {
    if (!animeDataCache) return ctx.reply("❌ *Anime data is still loading...*", { parse_mode: "Markdown" });

    const keyboard = Object.keys(animeDataCache).map(anime => [{
        text: `${anime}`,
        callback_data: `anime_${anime}`
    }]);

    ctx.reply("📜 *Choose an anime:*", {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: "Markdown"
    });
}

// ✅ Handle anime selection
bot.action(/anime_(.+)/, (ctx) => {
    const animeName = ctx.match[1];
    logActivity(ctx, `Selected Anime: ${animeName}`);

    userSelections[ctx.from.id] = { anime: animeName, season: "", episodes: [] };

    const animeInfo = animeDataCache[animeName];
    if (!animeInfo) return ctx.reply("❌ Anime not found.");

    const keyboard = Object.keys(animeInfo)
        .filter(key => key !== 'anime_id' && typeof animeInfo[key] === 'object')
        .map(season => [{
            text: season,
            callback_data: `season_${animeName}_${season}`
        }]);

    ctx.editMessageText(`📌 Select a season from **${animeName}**:`, {
        reply_markup: { inline_keyboard: keyboard }
    });
});

// ✅ Handle season selection
bot.action(/season_(.+)_(.+)/, (ctx) => {
    const [animeName, seasonName] = ctx.match.slice(1);
    logActivity(ctx, `Selected Season: ${seasonName} from ${animeName}`);

    userSelections[ctx.from.id].season = seasonName;
    userSelections[ctx.from.id].episodes = [];

    sendEpisodeSelection(ctx, animeName, seasonName);
});

// ✅ Send episodes with toggle selection
function sendEpisodeSelection(ctx, animeName, seasonName) {
    const { episodes } = userSelections[ctx.from.id];

    const keyboard = Object.keys(animeDataCache[animeName][seasonName].episodes).map(ep => [{
        text: `${episodes.includes(ep) ? "✅" : "❌"} ${ep}`,
        callback_data: `toggle_episode_${animeName}_${seasonName}_${ep}`
    }]);

    keyboard.push([{ text: "✔ Confirm Selection", callback_data: "confirm_multi_selection" }]);

    ctx.editMessageText(`📺 Select episodes from **${seasonName}**:`, {
        reply_markup: { inline_keyboard: keyboard }
    });
}

// ✅ Handle episode toggle
bot.action(/toggle_episode_(.+)_(.+)_(.+)/, (ctx) => {
    const [animeName, seasonName, episodeName] = ctx.match.slice(1);
    let { episodes } = userSelections[ctx.from.id];

    if (episodes.includes(episodeName)) {
        episodes = episodes.filter(ep => ep !== episodeName);
    } else {
        episodes.push(episodeName);
    }

    userSelections[ctx.from.id].episodes = episodes;
    sendEpisodeSelection(ctx, animeName, seasonName);
});

// ✅ Confirm episode selection and ask for quality
bot.action("confirm_multi_selection", (ctx) => {
    const { anime, season, episodes } = userSelections[ctx.from.id];

    if (!episodes.length) return ctx.reply("❌ Please select at least one episode.");

    logActivity(ctx, `Confirmed Multi Episodes: ${episodes.join(", ")}`);
    
    const firstEpisodeData = animeDataCache[anime][season].episodes[episodes[0]];
    if (!firstEpisodeData || !firstEpisodeData.qualities) {
        return ctx.reply("❌ No available qualities for the selected episodes.");
    }

    const keyboard = Object.keys(firstEpisodeData.qualities).map(q => [{
        text: q,
        callback_data: `multi_quality_${anime}_${season}_${q}`
    }]);

    ctx.reply("🎥 Select a quality for all selected episodes:", {
        reply_markup: { inline_keyboard: keyboard }
    });
});

// 🎞️ Improved Episode & Quality Selection
bot.action(/multi_quality_(.+)_(.+)_(.+)/, async (ctx) => {
    const [animeName, seasonName, quality] = ctx.match.slice(1);
    logActivity(ctx, `Selected Multi Quality: ${quality}`);
    ctx.reply("⏳ *Processing your request...*", { parse_mode: "Markdown" });

    const userData = userSelections[ctx.from.id] || { episodes: [] };
    const episodes = userData.episodes || [];

    if (!episodes.length) return ctx.reply("⚠ *No episodes selected!*", { parse_mode: "Markdown" });

    await ctx.reply(`📥 *Downloading ${episodes.length} episodes in* **${quality}** *quality...*`, { parse_mode: "Markdown" });

    for (const ep of episodes) {
        const fileData = animeDataCache[animeName]?.[seasonName]?.episodes?.[ep]?.qualities?.[quality];

        if (!fileData || (fileData.file_id === "" && fileData.file_url === "N/A")) {
            await ctx.reply(`⚠ *Episode ${ep} is unavailable in ${quality}.*`, { parse_mode: "Markdown" });
        } else {
            const fileSize = fileData.file_size || "Unknown Size";
            const infoText = `📺 *Episode ${ep}*\n📂 **Size:** ${fileSize}\n🎞 **Quality:** *${quality}*`;

            if (fileData.file_id) {
                await ctx.replyWithVideo(fileData.file_id, { caption: infoText, parse_mode: "Markdown" });
            } else {
                await ctx.reply(`${infoText}\n\n📥 *Download it here:*`, {
                    reply_markup: { inline_keyboard: [[{ text: "⬇ Download", url: fileData.file_url }]] },
                    parse_mode: "Markdown"
                });
            }
        }
    }

    await ctx.reply("🔄 *Want to select more anime?*", {
        reply_markup: { inline_keyboard: [[{ text: "🎬 Browse More", callback_data: "browse_anime" }]] },
        parse_mode: "Markdown"
    });

    // Reset user selection after processing
    userSelections[ctx.from.id] = { episodes: [] };
});

bot.action("continue_bot", (ctx) => {
    logActivity(ctx, "User chose to continue the bot");
    sendAnimeList(ctx);
});

bot.action("browse_anime", (ctx) => {
    sendAnimeList(ctx);
});

bot.command("api", (ctx) => {
    ctx.reply(`🌐 **Current API Endpoint:**\n\`${API_URL}\``, { parse_mode: "Markdown" });
});

// ℹ Updated "About" Command
bot.command('about', (ctx) => {
    ctx.reply(`
🚀 *Welcome to Noasaga Project!* 🚀  

💖 *A global anime community built by fans, for fans!* 🎌✨  

🔹 *Join our Telegram community:* [Noasaga Anime](https://t.me/NoasagaAnime)  
🔹 *Follow us on Instagram:* [@sakura_dessuu](https://www.instagram.com/sakura_dessuu)  
🔹 *Subscribe on YouTube:* [CatWithHat08](https://www.youtube.com/@catwithhat08)  
🔹 *Visit our Official Website:* [Noasaga Project](https://noasaga-project.onrender.com)  

🎭 *Enjoy streaming & downloading anime hassle-free!*
`, { parse_mode: 'Markdown', disable_web_page_preview: true });
});
bot.launch();
