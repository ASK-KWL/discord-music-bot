const queue = require('../music/queue');

module.exports = {
  name: 'pause',
  execute(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) return message.reply('❌ Nothing is playing.');

    serverQueue.player.pause();
    message.channel.send('⏸️ Paused playback.');
  },
};
