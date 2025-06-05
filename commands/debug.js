const queue = require('../music/queue');

module.exports = {
  name: 'debug',
  async execute(message) {
    const serverQueue = queue.get(message.guild.id);
    
    let debugInfo = '🔍 **Debug Information:**\n';
    debugInfo += `Voice Channel: ${message.member.voice.channel ? '✅ Connected' : '❌ Not connected'}\n`;
    debugInfo += `Bot in Queue: ${serverQueue ? '✅ Yes' : '❌ No'}\n`;
    
    if (serverQueue) {
      debugInfo += `Player State: ${serverQueue.player?._state?.status || 'Unknown'}\n`;
      debugInfo += `Connection State: ${serverQueue.connection?.state?.status || 'Unknown'}\n`;
      debugInfo += `Songs in Queue: ${serverQueue.songs?.length || 0}\n`;
      debugInfo += `Loop Mode: ${serverQueue.loop || 'Off'}\n`;
    }
    
    message.channel.send(debugInfo);
  },

  name: 'status',
  execute(message) {
    const serverQueue = queue.get(message.guild.id);
    
    let statusInfo = '📊 **Bot Status:**\n';
    
    if (!serverQueue) {
      statusInfo += '❌ No active queue\n';
    } else {
      statusInfo += `🎵 Player Status: ${serverQueue.player.state.status}\n`;
      statusInfo += `🔗 Connection Status: ${serverQueue.connection.state.status}\n`;
      statusInfo += `📝 Songs in Queue: ${serverQueue.songs.length}\n`;
      statusInfo += `🔄 Loop Mode: ${serverQueue.loop || 'Off'}\n`;
      
      if (serverQueue.songs.length > 0) {
        statusInfo += `🎵 Current Song: ${serverQueue.songs[0].title}\n`;
      }
    }
    
    const voiceChannel = message.member.voice.channel;
    statusInfo += `👤 Your Voice Channel: ${voiceChannel ? voiceChannel.name : 'None'}\n`;
    
    const botVoiceChannel = message.guild.members.me.voice.channel;
    statusInfo += `🤖 Bot Voice Channel: ${botVoiceChannel ? botVoiceChannel.name : 'None'}\n`;
    
    message.channel.send(statusInfo);
  },

  name: 'debug',
  async execute(message, args) {
    try {
      const musicQueue = require('../music/queue');
      const queueData = musicQueue.getQueueList(message.guild.id);
      
      let debugInfo = '🔍 **Debug Information:**\n\n';
      
      debugInfo += `**Voice Channel:** ${message.member.voice.channel ? `✅ ${message.member.voice.channel.name}` : '❌ Not in voice channel'}\n`;
      debugInfo += `**Current Song:** ${queueData.current ? `✅ ${queueData.current.title}` : '❌ Nothing playing'}\n`;
      debugInfo += `**Player Status:** ${queueData.player ? `✅ Connected` : '❌ No player'}\n`;
      debugInfo += `**Connection:** ${queueData.connection ? `✅ Connected` : '❌ No connection'}\n`;
      debugInfo += `**Is Playing:** ${queueData.isPlaying ? '✅ Yes' : '❌ No'}\n`;
      debugInfo += `**Queue Length:** ${queueData.queue.length}\n`;
      debugInfo += `**Volume:** ${Math.round(queueData.volume * 100)}%\n`;
      
      if (queueData.player) {
        debugInfo += `**Player State:** ${queueData.player._state.status}\n`;
      }
      
      if (queueData.connection) {
        debugInfo += `**Connection State:** ${queueData.connection.state.status}\n`;
      }

      message.channel.send(debugInfo);

    } catch (error) {
      console.error('Debug error:', error);
      message.channel.send(`❌ **Debug error:** ${error.message}`);
    }
  },
};