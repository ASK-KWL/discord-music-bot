const musicQueue = require('../music/queue');

module.exports = {
  name: 'clear',
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ You need to be in a voice channel to clear the queue!');
      }

      const queue = musicQueue.getQueueList(message.guild.id);
      
      if (queue.queue.length === 0) {
        return message.channel.send('❌ Queue is already empty!');
      }

      const clearedCount = queue.queue.length;
      musicQueue.clearQueue(message.guild.id);
      
      message.channel.send(`🗑️ **Cleared ${clearedCount} song${clearedCount > 1 ? 's' : ''} from queue!**`);
      
      // If nothing is currently playing, start inactivity timer
      if (!queue.current) {
        message.channel.send('📭 No songs in queue. Will leave in 3 minutes if no new songs are added.');
        musicQueue.startInactivityTimer(message.guild.id, message.channel);
      }

    } catch (error) {
      console.error('Clear command error:', error);
      message.channel.send('❌ Error clearing queue!');
    }
  },
};
