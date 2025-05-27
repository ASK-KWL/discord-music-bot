const queue = require('../music/queue');

module.exports = {
  name: 'skip',
  execute(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) return message.reply('❌ No song is currently playing.');

    serverQueue.player.stop();
    message.channel.send('⏭️ Skipped the current song.');
  },
};
