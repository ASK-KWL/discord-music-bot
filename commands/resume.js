const queue = require('../music/queue');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'resume',
  execute(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) {
      return message.channel.send('❌ Nothing is currently playing!');
    }

    if (serverQueue.player.state.status === AudioPlayerStatus.Paused || 
        serverQueue.player.state.status === AudioPlayerStatus.AutoPaused) {
      serverQueue.player.unpause();
      message.channel.send('▶️ **Resumed playback!**');
    } else {
      message.channel.send('⏸️ Music is already playing!');
    }
  },
};
