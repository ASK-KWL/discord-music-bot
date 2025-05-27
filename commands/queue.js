const queue = require('../music/queue');

module.exports = {
  name: 'queue',
  execute(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue || serverQueue.songs.length === 0) {
      return message.reply('🎶 The queue is empty.');
    }

    const songList = serverQueue.songs.map((s, i) => `${i === 0 ? '▶️' : `${i}.`} ${s.title}`).join('\n');
    message.channel.send(`🎵 Current Queue:\n${songList}`);
  },
};
