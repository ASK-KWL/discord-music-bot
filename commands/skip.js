const musicQueue = require('../music/queue');

module.exports = {
  name: 'skip',
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ You need to be in a voice channel to skip!');
      }

      try {
        const musicQueue = require('../music/queue');
        const queue = musicQueue.getQueueList(message.guild.id);
        
        // Check if there's anything to skip
        if (!queue.current && queue.queue.length === 0) {
          musicQueue.clearQueue(message.guild.id);
          musicQueue.startInactivityTimer(message.guild.id, message.channel);
          return message.channel.send('❌ Nothing to skip! Queue is empty.');
        }
        
        if (!queue.current) {
          return message.channel.send('❌ Nothing is currently playing!');
        }

        const currentTitle = queue.current.title;
        const skipped = musicQueue.skip(message.guild.id, message.channel);
        
        if (skipped) {
          message.channel.send(`⏭️ **Skipped:** ${currentTitle}`);
          
          // Check if queue is now empty after skipping
          const updatedQueue = musicQueue.getQueueList(message.guild.id);
          if (updatedQueue.queue.length === 0 && !updatedQueue.isPlaying) {
            message.channel.send('📭 Queue is now empty. Will leave in 3 minutes if no new songs are added.');
          }
        } else {
          message.channel.send('❌ Nothing to skip!');
        }
        
      } catch (requireError) {
        console.error('Queue system error:', requireError);
        message.channel.send('❌ Queue system not available. Use !voicetest to check audio.');
      }

    } catch (error) {
      console.error('Skip command error:', error);
      message.channel.send('❌ Error skipping song!');
    }
  },
};
