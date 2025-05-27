const queue = require('../music/queue');

module.exports = {
  name: 'resume',
  execute(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) return message.reply('❌ Nothing is paused.');

    serverQueue.player.unpause();
    message.channel.send('▶️ Resumed playback.');
  },
};
