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
};