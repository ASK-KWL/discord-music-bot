const musicQueue = require('../music/queue');

module.exports = {
  name: 'queue',
  async execute(message, args) {
    try {
      const queue = musicQueue.getQueueList(message.guild.id);
      
      if (!queue.current && queue.queue.length === 0) {
        return message.channel.send('❌ The queue is empty!');
      }

      let queueText = '';
      
      if (queue.current) {
        queueText += `🎵 **Now Playing:**\n${queue.current.title}\n\n`;
      }
      
      if (queue.queue.length > 0) {
        queueText += `📋 **Queue:**\n`;
        queue.queue.slice(0, 10).forEach((song, index) => {
          queueText += `${index + 1}. ${song.title}\n`;
        });
        
        if (queue.queue.length > 10) {
          queueText += `\n... and ${queue.queue.length - 10} more songs`;
        }
      }

      message.channel.send(queueText);

    } catch (error) {
      console.error('Queue command error:', error);
      message.channel.send('❌ Error displaying queue!');
    }
  },
};
