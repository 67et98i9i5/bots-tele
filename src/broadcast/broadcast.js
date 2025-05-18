const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');

// Your bot token
const bot = new Telegraf('');

let userData = {}; // Store user data temporarily

// Cooldown mechanism (to avoid spamming)
const delay = require('util').promisify(setTimeout);

// 📤 Sends message to users from data/userIds.json
async function sendToUsersFromFile(uploaderId) {
  try {
    // Load user IDs from the JSON file
    const filePath = path.join(__dirname, '../data', 'userIds.json');
    const rawData = fs.readFileSync(filePath);
    const userIds = JSON.parse(rawData); // Direct array of user IDs

    if (userIds.length === 0) {
      console.log("❌ No users found in the file.");
      return;
    }

    if (!userData[uploaderId]) {
      console.log(`❌ No message data found for uploader ${uploaderId}`);
      return;
    }

    const { fileId, messageText, buttonText, buttonUrl } = userData[uploaderId];

    let successCount = 0;
    let errorCount = 0;

    // Loop through all user IDs and send the message
    for (let receiverId of userIds) {
      try {
        await bot.telegram.sendPhoto(receiverId, fileId, {
          caption: messageText, // Use the message text provided by the user
          reply_markup: {
            inline_keyboard: [[{ text: buttonText, url: buttonUrl }]], // Button with URL
          },
        });

        console.log(`✅ Sent to user: ${receiverId}`);
        successCount++;
        await delay(1000); // Optional: Add a delay between messages
      } catch (err) {
        console.error(`❌ Failed to send to user ${receiverId}:`, err);
        errorCount++;
      }
    }

    console.log(`✅ Total Success: ${successCount} users`);
    console.log(`❌ Total Errors: ${errorCount} users`);

  } catch (err) {
    console.error("❌ Error reading the user IDs file or sending to users:", err);
  }
}

// /start command
bot.start((ctx) => {
  ctx.reply('Welcome! Upload an image, I’ll send it with a button to users in the file.');
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
        inline_keyboard: [[{ text: buttonText, url: buttonUrl }]], // Button with URL
      },
    });
    ctx.reply('Type "yes" to confirm and send it to users from the file.');
  } else {
    if (ctx.message.text.toLowerCase() === 'yes') {
      ctx.reply('Sending message...');
      sendToUsersFromFile(userId); // Sends the message to users from the file
      delete userData[userId];
    } else {
      ctx.reply('Cancelled. Upload a new image to start again.');
      delete userData[userId];
    }
  }
});

// 🚀 Launch bot
bot.launch().then(() => console.log("Bot started ✅"));
