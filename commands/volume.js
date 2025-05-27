const queue = require('../music/queue');

module.exports = {
  name: 'volume',
  execute(message, args) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) return message.reply('❌ No audio playing.');

    const volume = parseFloat(args[0]);
    if (isNaN(volume) || volume < 0 || volume > 2) {
      return message.reply('🔊 Volume must be between 0.0 and 2.0');
    }

    serverQueue.player.state.resource.volume.setVolume(volume);
    message.channel.send(`🔊 Volume set to ${volume}`);
  },
};
