const { Telegraf } = require('telegraf');
const User = require('./user'); // Assuming your User model is exported here
const fs = require('fs');

// Your bot token
const bot = new Telegraf('7846813473:AAF77LtoEGmiBiok85Q7oO00yWFvCog8llU');

let userData = {}; // Store user data temporarily

// Cooldown mechanism (to avoid spamming)
const cooldown = () => delay(Math.random() * (5000 - 2000) + 2000);

// 📤 Sends message to all users in the JSON file
async function sendToAllUsers(uploaderId) {
  try {
    // Fetch all user IDs from the JSON file
    const userIdsRaw = fs.readFileSync('userIds.json', 'utf-8');
    const allUserIds = JSON.parse(userIdsRaw);

    if (allUserIds.length === 0) {
      console.log("❌ No users found in the JSON file.");
      return;
    }

    if (!userData[uploaderId]) {
      console.log(`❌ No message data found for uploader ${uploaderId}`);
      return;
    }

    const { fileId, messageText, buttonText, buttonUrl } = userData[uploaderId];

    // Loop through all user IDs and send the message
    for (let receiverId of allUserIds) {
      await bot.telegram.sendPhoto(receiverId, fileId, {
        caption: messageText, // Use the message text provided by the user
        reply_markup: {
          inline_keyboard: [[{ text: buttonText, url: buttonUrl }]],
        },
      });

      console.log(`✅ Sent to user: ${receiverId}`);
      await cooldown(); // Optionally add a delay between messages
    }
  } catch (err) {
    console.error("❌ Error sending to users:", err);
  }
}

// /start command
bot.start((ctx) => {
  ctx.reply('Welcome! Upload an image, I’ll send it with a button to all users in JSON file.');
});

// 📷 Handle photo
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const fileId = ctx.message.photo[0].file_id;
  userData[userId] = { fileId };

  ctx.reply('Got the image! Now enter the message text:');
});

// ✍️ Handle text step-by-step
bot.on('text', (ctx) => {
  const userId = ctx.from.id;
  const user = userData[userId];

  if (!user) return;

  if (!user.messageText) {
    user.messageText = ctx.message.text;
    ctx.reply('Now enter the button text:');
  } else if (!user.buttonText) {
    user.buttonText = ctx.message.text;
    ctx.reply('Now send the button URL:');
  } else if (!user.buttonUrl) {
    user.buttonUrl = ctx.message.text;

    // Preview the message
    const { fileId, messageText, buttonText, buttonUrl } = userData[userId];
    ctx.replyWithPhoto(fileId, {
      caption: messageText, // Show the user's message text
      reply_markup: {
        inline_keyboard: [[{ text: buttonText, url: buttonUrl }]],
      },
    });
    ctx.reply('Type "yes" to confirm and send it to all users in JSON file.');
  } else {
    if (ctx.message.text.toLowerCase() === 'yes') {
      ctx.reply('Sending message...');
      sendToAllUsers(userId); // Sends the message to all users
      delete userData[userId];
    } else {
      ctx.reply('Cancelled. Upload a new image to start again.');
      delete userData[userId];
    }
  }
});

// 🚀 Launch bot
bot.launch().then(() => console.log("Bot started ✅"));