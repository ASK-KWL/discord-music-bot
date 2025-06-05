const musicQueue = require('../music/queue');

module.exports = {
  name: 'stop',
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ You need to be in a voice channel to stop!');
      }

      try {
        const queue = musicQueue.getQueueList(message.guild.id);
        
        if (!queue.current && queue.queue.length === 0) {
          musicQueue.clearQueue(message.guild.id);
          return message.channel.send('❌ Nothing is playing and queue is empty!');
        }

        const wasPlaying = queue.current !== null;
        const queueLength = queue.queue.length;
        
        musicQueue.stop(message.guild.id);
        
        let stopMessage = '⏹️ **Stopped playback and cleared queue!**';
        if (wasPlaying) {
          stopMessage += `\n🎵 Stopped: **${queue.current.title}**`;
        }
        if (queueLength > 0) {
          stopMessage += `\n📭 Cleared ${queueLength} song${queueLength > 1 ? 's' : ''} from queue`;
        }
        
        message.channel.send(stopMessage);
        
      } catch (requireError) {
        console.error('Queue system error:', requireError);
        message.channel.send('❌ Queue system not available.');
      }

    } catch (error) {
      console.error('Stop command error:', error);
      message.channel.send('❌ Error stopping music!');
    }
  },
};
