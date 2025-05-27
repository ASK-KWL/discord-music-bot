const queue = require('../music/queue');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'status',
  execute(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) return message.reply('❌ No active audio connection.');

    const playerStatus = serverQueue.player.state.status;
    const connectionStatus = serverQueue.connection.state.status;
    
    message.channel.send(`**Bot Audio Status**:
🔈 Player Status: ${playerStatus}
🔌 Connection Status: ${connectionStatus}
🎵 Songs in Queue: ${serverQueue.songs.length}
`);

    // Add debug info to console
    console.log('Audio Debug Info:');
    console.log('Player State:', serverQueue.player.state);
    console.log('Connection State:', serverQueue.connection.state);
  },
};