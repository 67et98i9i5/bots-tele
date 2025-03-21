const { Telegraf } = require('telegraf');
const axios = require('axios'); 
const fs = require('fs'); 
const path = require('path'); 
require('dotenv').config();
const bot = new Telegraf("7846813473:AAGentIPQ68PUJA2sxj99mMsWpA-Oe9j2yc");

const API_URL = "https://noasaga-api-main-sbmi.onrender.com/anime/data";
const LOG_FILE = path.join(__dirname, '../logs', 'actions.txt'); 

let animeDataCache = null; 

// Function to fetch anime data
async function loadAnimeData(forceUpdate = false) {
    try {
        console.log("🔄 Checking for anime data updates...");
        const response = await axios.get(API_URL);
        const newData = response.data;

        if (JSON.stringify(newData) !== JSON.stringify(animeDataCache) || forceUpdate) {
            animeDataCache = newData;
            console.log("✅ Anime data updated!");
        }
    } catch (error) {
        console.error("❌ Error loading anime data:", error);
    }
}

loadAnimeData(true);
setInterval(loadAnimeData, Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000);

// Function to log user activity
function logActivity(ctx, action) {
    const user = ctx.from;
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${user.first_name} ${user.last_name || ""} (ID: ${user.id}) - ${action}\n`;

    console.log(logEntry.trim()); // Show in console

    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) console.error("❌ Error writing log:", err);
    });
}

// Bot start
bot.start((ctx) => {
    logActivity(ctx, "Started the bot");
    if (!animeDataCache) return ctx.reply("❌ Anime data is not loaded yet. Please try again later.");
    ctx.reply('Welcome! Please select an anime:');
    sendAnimeList(ctx);
});

// Send anime list
function sendAnimeList(ctx) {
    if (!animeDataCache) return ctx.reply("❌ Anime data is not loaded yet.");
    
    const keyboard = Object.keys(animeDataCache).map(anime => [{
        text: anime,
        callback_data: `anime_${anime}`
    }]);

    ctx.reply('Select an anime:', {
        reply_markup: { inline_keyboard: keyboard }
    });
}

// Handle anime selection
bot.action(/anime_(.+)/, (ctx) => {
    const animeName = ctx.match[1];
    logActivity(ctx, `Selected Anime: ${animeName}`);

    const animeInfo = animeDataCache[animeName];
    if (!animeInfo) return ctx.reply("❌ Anime not found.");

    const keyboard = Object.keys(animeInfo)
        .filter(key => key !== 'anime_id' && typeof animeInfo[key] === 'object')
        .map(season => [{
            text: season,
            callback_data: `season_${animeName}_${season}`
        }]);

    keyboard.push([{ text: '⬅ Back', callback_data: 'back_to_anime' }]);

    ctx.editMessageText(`Select a season from ${animeName}:`, {
        reply_markup: { inline_keyboard: keyboard }
    }).catch(() => ctx.reply(`Select a season from ${animeName}:`, {
        reply_markup: { inline_keyboard: keyboard }
    }));
});

// Handle season selection
bot.action(/season_(.+)_(.+)/, (ctx) => {
    const [animeName, seasonName] = ctx.match.slice(1);
    logActivity(ctx, `Selected Season: ${seasonName} from ${animeName}`);

    const seasonData = animeDataCache[animeName]?.[seasonName];
    if (!seasonData || !seasonData.episodes) return ctx.reply("❌ No episodes available for this season.");

    const keyboard = Object.keys(seasonData.episodes).map(ep => [{
        text: ep,
        callback_data: `episode_${animeName}_${seasonName}_${ep}`
    }]);

    keyboard.push([{ text: '⬅ Back', callback_data: `anime_${animeName}` }]);

    ctx.editMessageText(`Select an episode from ${seasonName}:`, {
        reply_markup: { inline_keyboard: keyboard }
    }).catch(() => ctx.reply(`Select an episode from ${seasonName}:`, {
        reply_markup: { inline_keyboard: keyboard }
    }));
});

// Handle episode selection
bot.action(/episode_(.+)_(.+)_(.+)/, (ctx) => {
    const [animeName, seasonName, episodeName] = ctx.match.slice(1);
    logActivity(ctx, `Selected Episode: ${episodeName} from ${seasonName} of ${animeName}`);

    const episodeData = animeDataCache[animeName]?.[seasonName]?.episodes?.[episodeName];
    if (!episodeData || !episodeData.qualities) return ctx.reply("❌ No available qualities for this episode.");

    const keyboard = Object.keys(episodeData.qualities).map(q => [{
        text: q,
        callback_data: `quality_${animeName}_${seasonName}_${episodeName}_${q}`
    }]);
    keyboard.push([{ text: '⬅ Back', callback_data: `season_${animeName}_${seasonName}` }]);

    ctx.editMessageText(`Select quality for ${episodeName}:`, {
        reply_markup: { inline_keyboard: keyboard }
    }).catch(() => ctx.reply(`Select quality for ${episodeName}:`, {
        reply_markup: { inline_keyboard: keyboard }
    }));
});

// Handle quality selection
bot.action(/quality_(.+)_(.+)_(.+)_(.+)/, (ctx) => {
    const [animeName, seasonName, episodeName, quality] = ctx.match.slice(1);
    logActivity(ctx, `Selected Quality: ${quality} for ${episodeName} from ${seasonName} of ${animeName}`);

    const fileData = animeDataCache[animeName]?.[seasonName]?.episodes?.[episodeName]?.qualities?.[quality];

    if (!fileData || (fileData.file_id === "" && fileData.file_url === "N/A")) {
        return ctx.reply("❌ This episode is unavailable for the selected quality. Please try another quality.");
    }

    ctx.reply(`Anime: ${animeName}\nSeason: ${seasonName}\nEpisode: ${episodeName}\nQuality: ${quality}\nFile Size: ${fileData.file_size}`)
        .then(() => {
            if (fileData.file_id) {
                ctx.replyWithVideo(fileData.file_id);
            } else if (fileData.file_url && fileData.file_url !== "N/A") {
                ctx.reply('Download the file:', {
                    reply_markup: {
                        inline_keyboard: [[{ text: '📥 Download', url: fileData.file_url }]]
                    }
                });
            } else {
                ctx.reply("❌ No valid file source available.");
            }
        });
});

// Back to anime list
bot.action('back_to_anime', (ctx) => {
    logActivity(ctx, "Returned to Anime List");
    sendAnimeList(ctx);
});

bot.command('api', (ctx) => {
    ctx.reply('For API click here:',{
        reply_markup: {
            inline_keyboard: [[{text: 'CLICK HERE', url: "https://noasaga-api-main.onrender.com"}]]
        }
    });
});

bot.command('about', (ctx) => {
    ctx.reply(`🚀 *Welcome to Noasaga Project!* 🚀  

        Noasaga is a global anime community created by *Code-67et98i9i5* for anime lovers worldwide! Our goal is to provide a space where anime fans can *discuss, share, and connect* with like-minded people. 🎌✨  
        
        🔹 *Join our Telegram community:* [Noasaga Anime](https://t.me/NoasagaAnime)  
        🔹 *Follow us on Instagram:* [@sakura_dessuu](https://www.instagram.com/sakura_dessuu)  
        🔹 *Subscribe on YouTube:* [CatWithHat08](https://www.youtube.com/@catwithhat08)  
        🔹 *Visit our Official Website:* [Noasaga Project](https://noasaga-project.onrender.com)  
        
        💖 *Thank you for being part of our anime family!* 💖`, 
        { parse_mode: 'Markdown', disable_web_page_preview: true });
});

bot.launch();
