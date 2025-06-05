const { joinVoiceChannel } = require('@discordjs/voice');
const { getSongInfo } = require('../music/player');
const ytSearch = require('yt-search');
const musicQueue = require('../music/queue');

module.exports = {
  name: 'play',
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ You need to be in a voice channel to play music!');
      }

      if (!args.length) {
        return message.channel.send('❌ Please provide a song name or YouTube URL!');
      }

      const query = args.join(' ');
      message.channel.send(`🔍 Searching for: **${query}**`);

      let videoUrl;
      let songTitle;
      let duration = 0;

      // Check if it's already a YouTube URL
      if (query.includes('youtube.com') || query.includes('youtu.be')) {
        videoUrl = query;
        try {
          const info = await getSongInfo(videoUrl);
          songTitle = info.title;
          duration = info.duration;
        } catch {
          songTitle = 'YouTube Video';
        }
      } else {
        // Search for the song
        const searchResults = await ytSearch(query);
        if (!searchResults.videos.length) {
          return message.channel.send('❌ No results found!');
        }
        
        const video = searchResults.videos[0];
        videoUrl = video.url;
        songTitle = video.title;
        duration = video.duration.seconds;
      }

      const song = {
        title: songTitle,
        url: videoUrl,
        duration: duration,
        requestedBy: message.author.tag
      };

      // Add to queue
      const queuePosition = await musicQueue.addSong(message.guild.id, song);
      const queue = musicQueue.getQueueList(message.guild.id);

      if (queue.isPlaying) {
        message.channel.send(`✅ **${songTitle}** added to queue! Position: **${queuePosition}**`);
      } else {
        message.channel.send(`🎵 Found: **${songTitle}**`);
        message.channel.send('🔗 Connecting to voice channel...');

        // Create connection
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false,
        });

        await new Promise(resolve => setTimeout(resolve, 1500));

        // Start playing
        await musicQueue.play(message.guild.id, connection, message.channel);
      }

    } catch (error) {
      console.error('Play command error:', error);
      message.channel.send(`❌ Command failed: ${error.message}`);
    }
  },
};