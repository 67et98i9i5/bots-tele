const fs = require("fs");

const extrasData = JSON.parse(fs.readFileSync("json/extras.json", "utf8"));

const sendApi = (ctx) => {
    // ctx.reply(`📜 API Documentation: ${extrasData.api}`);
    ctx.reply(`Coming soon!!`);
};

const sendSocials = (ctx) => {
    const socialLinks = extrasData.socials.map(s => `📌 ${s.name}: ${s.link}`).join("\n");
    // ctx.reply(`🌍 Connect with us:\n\n${socialLinks}`);
    ctx.reply(`Coming soon!!`);
};

const sendChannels = (ctx) => {
    const channelLinks = extrasData.channels.map(c => `▶️ ${c.name}: ${c.link}`).join("\n");
    // ctx.reply(`📺 Our Channels:\n\n${channelLinks}`);
    ctx.reply(`Coming soon!!`);
};

module.exports = { sendApi, sendSocials, sendChannels };
