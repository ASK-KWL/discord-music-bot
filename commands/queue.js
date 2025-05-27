const queue = require('../music/queue');

module.exports = {
  name: 'queue',
  execute(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue || serverQueue.songs.length === 0) {
      return message.reply('❌ There are no songs in the queue!');
    }

    // Loop status
    let loopStatus = '';
    if (serverQueue.loop === 'song') {
      loopStatus = '🔂 **Looping Current Song**\n';
    } else if (serverQueue.loop === 'queue') {
      loopStatus = '🔁 **Looping Queue**\n';
    }

    const songList = serverQueue.songs
      .slice(0, 10) // Show first 10 songs
      .map((song, index) => {
        if (index === 0) {
          return `**Now Playing:** ${song.title}`;
        } else {
          return `${index}. ${song.title}`;
        }
      })
      .join('\n');

    const queueEmbed = {
      color: 0x0099ff,
      title: '🎵 Music Queue',
      description: loopStatus + songList,
      footer: {
        text: serverQueue.songs.length > 10 
          ? `And ${serverQueue.songs.length - 10} more...` 
          : `${serverQueue.songs.length} song(s) in queue`
      }
    };

    message.channel.send({ embeds: [queueEmbed] });
  },
};
