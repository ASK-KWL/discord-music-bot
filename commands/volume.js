const queue = require('../music/queue');

module.exports = {
  name: 'volume',
  aliases: ['vol'],
  async execute(message, args) {
    try {
      const musicQueue = require('../music/queue');
      const queueData = musicQueue.getQueueList(message.guild.id);

      if (!queueData.current) {
        return message.channel.send('❌ Nothing is currently playing!');
      }

      if (!args.length) {
        // Show current volume
        const currentVolume = Math.round(queueData.volume * 100);
        const statusMsg = await message.channel.send(
          `🔊 **Current Volume:** ${currentVolume}%\n\n` +
          `**Usage:**\n` +
          `• \`!volume 50\` - Set volume to 50%\n` +
          `• \`!vol +\` - Increase volume by 10%\n` +
          `• \`!vol -\` - Decrease volume by 10%`
        );

        setTimeout(() => {
          statusMsg.delete().catch(() => {});
        }, 8000);
        return;
      }

      const input = args[0];
      let newVolume;

      if (input === '+' || input === 'up') {
        newVolume = Math.min(1.0, queueData.volume + 0.1);
      } else if (input === '-' || input === 'down') {
        newVolume = Math.max(0.1, queueData.volume - 0.1);
      } else {
        const volumePercent = parseInt(input);
        if (isNaN(volumePercent) || volumePercent < 1 || volumePercent > 100) {
          return message.channel.send('❌ **Invalid volume!** Use a number between 1-100, or `+`/`-` to adjust.');
        }
        newVolume = volumePercent / 100;
      }

      musicQueue.setVolume(message.guild.id, newVolume);
      
      const volumePercent = Math.round(newVolume * 100);
      const volumeEmoji = volumePercent >= 70 ? '🔊' : volumePercent >= 30 ? '🔉' : '🔈';
      
      const statusMsg = await message.channel.send(
        `${volumeEmoji} **Volume set to ${volumePercent}%**\n\n` +
        `Current song: **${queueData.current.title}**`
      );

      // Update the now playing message to reflect new volume
      setTimeout(() => {
        musicQueue.updateNowPlayingMessage(message.guild.id, queueData.isPlaying);
      }, 1000);

      // Auto-delete status message
      setTimeout(() => {
        statusMsg.delete().catch(() => {});
      }, 5000);

    } catch (error) {
      console.error('Volume command error:', error);
      message.channel.send(`❌ **Error:** ${error.message}`);
    }
  },
};