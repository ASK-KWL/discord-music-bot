const queue = require('../music/queue');

module.exports = {
  name: 'loop',
  aliases: ['repeat'],
  async execute(message, args) {
    try {
      const musicQueue = require('../music/queue');
      const queueData = musicQueue.getQueueList(message.guild.id);

      if (!queueData.current) {
        return message.channel.send('❌ Nothing is currently playing!');
      }

      // Check if user wants to set specific mode
      const mode = args[0]?.toLowerCase();
      let newMode;
      
      if (mode === 'song' || mode === 's' || mode === '1') {
        newMode = musicQueue.setLoopMode(message.guild.id, 'song');
      } else if (mode === 'queue' || mode === 'q' || mode === '2') {
        newMode = musicQueue.setLoopMode(message.guild.id, 'queue');
      } else if (mode === 'off' || mode === '0') {
        newMode = musicQueue.setLoopMode(message.guild.id, 'off');
      } else {
        // No specific mode provided, toggle through modes
        newMode = musicQueue.toggleLoop(message.guild.id);
      }

      let statusText;
      switch (newMode) {
        case 'song':
          statusText = `🔂 **Loop: Song**\n\n**${queueData.current.title}** will repeat when it ends.`;
          break;
        case 'queue':
          statusText = `🔁 **Loop: Queue**\n\nThe entire queue (${queueData.queue.length + 1} songs) will repeat.`;
          break;
        default:
          statusText = `🔄 **Loop: Off**\n\nQueue will continue normally.`;
      }
      
      const statusMsg = await message.channel.send(
        `${statusText}\n\n**Usage:**\n• \`!loop\` - Toggle modes\n• \`!loop song\` - Repeat current song\n• \`!loop queue\` - Repeat entire queue\n• \`!loop off\` - Disable loop`
      );

      // Auto-delete after 8 seconds
      setTimeout(() => {
        statusMsg.delete().catch(() => {});
      }, 8000);

    } catch (error) {
      console.error('Loop command error:', error);
      message.channel.send(`❌ **Error:** ${error.message}`);
    }
  },
};