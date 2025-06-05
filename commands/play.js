const { joinVoiceChannel } = require('@discordjs/voice');
const { getSongInfo } = require('../music/player');
const { EmbedBuilder } = require('discord.js');
const musicQueue = require('../music/queue');

module.exports = {
  name: 'play',
  async execute(message, args) {
    try {
      if (!args.length) {
        return message.channel.send('❌ Please provide a YouTube URL or search query!');
      }

      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      const statusMsg = await message.channel.send('🔍 **Processing your request...**');
      
      let url = args.join(' ');
      
      // Check if it's a search query or URL
      if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        await statusMsg.edit('🔍 **Searching YouTube...**');
        
        try {
          const ytSearch = require('yt-search');
          const searchResults = await ytSearch(url);
          
          if (!searchResults.videos.length) {
            return statusMsg.edit('❌ No results found for your search!');
          }
          
          const video = searchResults.videos[0];
          url = video.url;
          
          await statusMsg.edit(`🎵 **Found:** ${video.title}`);
        } catch (searchError) {
          console.error('Search error:', searchError);
          return statusMsg.edit('❌ Failed to search YouTube. Try using a direct URL.');
        }
      }

      // Get song info
      await statusMsg.edit('📊 **Getting video information...**');
      const songInfo = await getSongInfo(url);

      // Add to queue
      const queueData = musicQueue.getQueueList(message.guild.id);

      const song = {
        title: songInfo.title,
        url: url,
        duration: songInfo.duration,
        uploader: songInfo.uploader,
        thumbnail: songInfo.thumbnail,
        requestedBy: message.author.tag
      };

      if (!queueData.current) {
        // Nothing playing, start immediately
        await statusMsg.edit('🎵 **Creating yt-dlp audio player...**');
        
        try {
          const { createAudioConnection, createYouTubePlayerWithProcessing } = require('../music/player');
          const connection = createAudioConnection(message);
          
          await statusMsg.edit('🔄 **Processing YouTube audio with yt-dlp...**');
          const { player, resource } = await createYouTubePlayerWithProcessing(url);
          
          // Use the queue system properly with proper logging
          console.log('Starting playback through queue system...');
          musicQueue.play(message.guild.id, song, player, resource, connection, message.channel);
          
          // Delete the status message since now playing message will appear
          setTimeout(() => {
            statusMsg.delete().catch(() => {});
          }, 5000);
          
        } catch (playerError) {
          console.error('Player creation error:', playerError);
          await statusMsg.edit(`❌ **Failed to play audio:** ${playerError.message}\n\n**Try:** \`!dp ${url}\` for direct playback test`);
        }
        
      } else {
        // Add to queue
        musicQueue.addToQueue(message.guild.id, song);
        const position = queueData.queue.length;
        
        await statusMsg.edit(`✅ **Added to queue (Position ${position}):** ${song.title}\n👤 **Requested by:** ${song.requestedBy}`);
        
        // Auto-delete queue confirmation
        setTimeout(() => {
          statusMsg.delete().catch(() => {});
        }, 8000);
      }

    } catch (error) {
      console.error('Play command error:', error);
      message.channel.send(`❌ **Error:** ${error.message}`);
    }
  },
};