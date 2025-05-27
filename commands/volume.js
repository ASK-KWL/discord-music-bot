const queue = require('../music/queue');

module.exports = {
  name: 'volume',
  execute(message, args) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) return message.reply('❌ No audio playing.');

    // If no args provided, show current volume
    if (!args.length) {
      const currentVolume = serverQueue.player.state.resource?.volume?.volume || 'Unknown';
      return message.reply(`🔊 Current volume: ${currentVolume}`);
    }

    const volume = parseFloat(args[0]);
    if (isNaN(volume) || volume < 0 || volume > 2) {
      return message.reply('🔊 Volume must be between 0.0 and 2.0');
    }

    try {
      if (serverQueue.player.state.resource && serverQueue.player.state.resource.volume) {
        serverQueue.player.state.resource.volume.setVolume(volume);
        message.channel.send(`🔊 Volume set to ${volume}`);
      } else {
        message.reply('❌ Cannot adjust volume at this time.');
      }
    } catch (error) {
      console.error('Error setting volume:', error);
      message.reply('❌ Error setting volume.');
    }
  },
};