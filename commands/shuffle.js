module.exports = {
  name: 'shuffle',
  aliases: ['mix'],
  async execute(message, args) {
    try {
      const musicQueue = require('../music/queue');
      const queueData = musicQueue.getQueueList(message.guild.id);

      if (queueData.queue.length <= 1) {
        return message.channel.send('❌ Need at least 2 songs in queue to shuffle!');
      }

      const shuffled = musicQueue.shuffleQueue(message.guild.id);
      
      if (shuffled) {
        const statusMsg = await message.channel.send(
          `🔀 **Queue shuffled!**\n\n` +
          `**${queueData.queue.length} songs** have been randomly reordered.\n` +
          `Use \`!queue\` to see the new order.`
        );

        // Auto-delete after 5 seconds
        setTimeout(() => {
          statusMsg.delete().catch(() => {});
        }, 5000);
      } else {
        message.channel.send('❌ Failed to shuffle queue!');
      }

    } catch (error) {
      console.error('Shuffle command error:', error);
      message.channel.send(`❌ **Error:** ${error.message}`);
    }
  },
};
