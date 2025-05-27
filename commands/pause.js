const queue = require('../music/queue');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'pause',
  execute(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) {
      return message.channel.send('❌ Nothing is currently playing!');
    }

    if (serverQueue.player.state.status === AudioPlayerStatus.Playing) {
      serverQueue.player.pause();
      message.channel.send('⏸️ **Paused playback!**');
    } else {
      message.channel.send('▶️ Music is already paused!');
    }
  },
};
