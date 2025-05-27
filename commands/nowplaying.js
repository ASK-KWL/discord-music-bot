const queue = require('../music/queue');
const { EmbedBuilder } = require('discord.js');
const ytdl = require('youtube-dl-exec');

module.exports = {
  name: 'nowplaying',
  async execute(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue || !serverQueue.songs.length) {
      return message.reply('❌ Nothing is currently playing.');
    }
    
    const currentSong = serverQueue.songs[0];
    try {
      // Get info about the current song
      const songInfo = await ytdl.getBasicInfo(currentSong.url);
      
      const embed = new EmbedBuilder()
        .setTitle('Now Playing')
        .setDescription(`[${songInfo.videoDetails.title}](${currentSong.url})`)
        .addFields(
          { name: 'Duration', value: formatDuration(songInfo.videoDetails.lengthSeconds) },
          { name: 'Requested By', value: currentSong.requestedBy || 'Unknown' }
        )
        .setThumbnail(songInfo.videoDetails.thumbnails[0].url)
        .setColor('#0099ff');
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error getting song info:', error);
      message.channel.send(`🎵 Now playing: ${currentSong.url}`);
    }
  }
};

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}