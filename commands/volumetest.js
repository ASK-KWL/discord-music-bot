module.exports = {
  name: 'volumetest',
  aliases: ['vtest', 'voltest'],
  async execute(message, args) {
    try {
      const musicQueue = require('../music/queue');
      const queueData = musicQueue.getQueueList(message.guild.id);

      if (!queueData.current) {
        return message.channel.send('❌ No music is playing! Use `!play <song>` first.');
      }

      const statusMsg = await message.channel.send('🔊 **Testing volume levels...**');

      // Test different volume levels
      const volumes = [0.2, 0.5, 0.8, 1.0, 1.5, 2.0];
      
      for (const volume of volumes) {
        const percentage = Math.round(volume * 100);
        musicQueue.setVolume(message.guild.id, volume);
        
        await statusMsg.edit(`🔊 **Volume: ${percentage}%**\n\nCan you hear the music now?\n\n**Current song:** ${queueData.current.title}`);
        
        // Wait 3 seconds at each volume level
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Set back to 100%
      musicQueue.setVolume(message.guild.id, 1.0);
      
      await statusMsg.edit(
        `✅ **Volume test completed!**\n\n` +
        `**Results:**\n` +
        `• Volume reset to 100%\n` +
        `• If you heard music at higher volumes (150%+), the issue was bot volume\n` +
        `• If you heard nothing at any volume, check Discord settings\n\n` +
        `**If you still can't hear music:**\n` +
        `1. Right-click the bot in voice channel\n` +
        `2. Check for volume slider and set to 100%\n` +
        `3. Try: \`!fixsound\` for complete troubleshooting\n` +
        `4. Restart Discord completely`
      );

      // Auto-delete after showing results
      setTimeout(() => {
        statusMsg.delete().catch(() => {});
      }, 15000);

    } catch (error) {
      console.error('Volume test error:', error);
      message.channel.send(`❌ **Error:** ${error.message}`);
    }
  },
};
