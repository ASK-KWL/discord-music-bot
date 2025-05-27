const yts = require('yt-search');
const ytdl = require('ytdl-core');
const { createStream, createAudioConnection, createPlayer } = require('../music/player');
const queue = require('../music/queue');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'play',
  async execute(message, args) {
    const query = args.join(' ');
    if (!query) return message.reply('🎵 Please provide a YouTube link or search keywords.');

    const serverQueue = queue.get(message.guild.id);

    const video = ytdl.validateURL(query)
      ? { url: query, title: "Requested Video" }  // You can fetch title later or improve this
      : (await yts(query)).videos[0];

    if (!video) return message.reply('❌ No results found.');

    const song = {
      title: video.title,
      url: video.url,
    };

    if (!serverQueue) {
      const connection = createAudioConnection(message);
      const songs = [song];
      const { player, resource } = createPlayer(createStream(song.url));

      connection.subscribe(player);
      player.play(resource);

      // Listen for state changes, handle queue progression
      player.on('stateChange', (oldState, newState) => {
        if (oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle) {
          songs.shift();
          if (songs.length > 0) {
            const next = createPlayer(createStream(songs[0].url));
            connection.subscribe(next.player);
            next.player.play(next.resource);

            // Replace player with new one in queue data
            queue.set(message.guild.id, { connection, songs, player: next.player });
          } else {
            queue.delete(message.guild.id);
            connection.destroy();
          }
        }
      });

      queue.set(message.guild.id, { connection, songs, player });
      message.channel.send(`▶️ Now playing: **${song.title}**`);
    } else {
      serverQueue.songs.push(song);
      message.channel.send(`✅ Added to queue: **${song.title}**`);
    }
  },
};
