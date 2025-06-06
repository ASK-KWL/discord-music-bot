const { joinVoiceChannel } = require('@discordjs/voice');
const { getSongInfo } = require('../music/player');
const { EmbedBuilder } = require('discord.js');
const musicQueue = require('../music/queue');

module.exports = {
  name: 'play',
  aliases: ['p'],
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      if (!args.length) {
        return message.channel.send('❌ **Usage:** `!play <song name or YouTube URL>`\n\n**Examples:**\n• `!play never gonna give you up`\n• `!play https://www.youtube.com/watch?v=dQw4w9WgXcQ`');
      }

      const query = args.join(' ');
      const statusMsg = await message.channel.send('🔍 **Searching for music...**');

      // Import required modules
      const musicQueue = require('../music/queue');
      const { createAudioConnection } = require('../music/player');
      
      let url = query;
      let songInfo = null;

      // Check if it's a direct YouTube URL
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      
      if (!youtubeRegex.test(query)) {
        // Search for the song
        await statusMsg.edit('🔍 **Searching YouTube...**');
        
        try {
          const ytSearch = require('yt-search');
          const searchResults = await ytSearch(query);
          
          if (!searchResults.videos.length) {
            return await statusMsg.edit(`❌ **No results found for:** ${query}`);
          }
          
          const video = searchResults.videos[0];
          url = video.url;
          songInfo = {
            title: video.title,
            duration: video.seconds || 0,
            uploader: video.author?.name || 'Unknown',
            thumbnail: video.thumbnail || null,
            requestedBy: message.author.username,
            url: url
          };
          
          await statusMsg.edit(`🎵 **Found:** ${video.title}\n👤 **Channel:** ${video.author?.name || 'Unknown'}`);
          
        } catch (searchError) {
          console.error('Search error:', searchError);
          return await statusMsg.edit(`❌ **Search failed:** ${searchError.message}`);
        }
      }

      // Get song info if not already retrieved from search
      if (!songInfo) {
        await statusMsg.edit('📋 **Getting video info...**');
        
        try {
          const { getSongInfo } = require('../music/player');
          const info = await getSongInfo(url);
          songInfo = {
            ...info,
            requestedBy: message.author.username,
            url: url
          };
        } catch (infoError) {
          console.error('Info error:', infoError);
          songInfo = {
            title: 'YouTube Audio',
            duration: 0,
            uploader: 'Unknown',
            thumbnail: null,
            requestedBy: message.author.username,
            url: url
          };
        }
      }

      const queueData = musicQueue.getQueueList(message.guild.id);

      if (!queueData.current) {
        // Nothing playing, start immediately
        await statusMsg.edit('🎵 **Creating audio player...**');
        
        let playerData = null;
        let connection = queueData.connection;
        
        // Create fresh connection if needed
        if (!connection || connection.state.status === 'destroyed') {
          connection = createAudioConnection(message);
          console.log('Created new voice connection for playback');
        }
        
        // Try multiple methods in order
        const methods = [
          { name: 'yt-dlp + FFmpeg', func: 'createYouTubePlayerWithProcessing' },
          { name: 'ytdl-core', func: 'createYtdlCorePlayer' },
          { name: 'play-dl', func: 'createPlayer' }
        ];
        
        for (const method of methods) {
          try {
            await statusMsg.edit(`🔄 **Trying ${method.name}...**`);
            
            const { createPlayer, createYouTubePlayerWithProcessing, createYtdlCorePlayer } = require('../music/player');
            
            switch (method.func) {
              case 'createYouTubePlayerWithProcessing':
                playerData = await createYouTubePlayerWithProcessing(url);
                break;
              case 'createYtdlCorePlayer':
                playerData = await createYtdlCorePlayer(url);
                break;
              case 'createPlayer':
                playerData = await createPlayer(url);
                break;
            }
            
            if (playerData) {
              console.log(`✅ Successfully created player with ${method.name}`);
              break;
            }
            
          } catch (methodError) {
            console.error(`${method.name} failed:`, methodError.message);
            await statusMsg.edit(`⚠️ **${method.name} failed, trying next method...**`);
            continue;
          }
        }
        
        if (!playerData) {
          return await statusMsg.edit(`❌ **All playback methods failed!**\n\n**Try:**\n• \`!vt\` - Test voice connection\n• Update dependencies: \`npm update\`\n• Update yt-dlp: \`pip install --upgrade yt-dlp\``);
        }
        
        try {
          const { player, resource } = playerData;
          
          // Use the queue system properly with proper logging
          console.log('Starting playback through queue system...');
          musicQueue.play(message.guild.id, songInfo, player, resource, connection, message.channel);
          
          await statusMsg.edit('✅ **Playback started!**');
          
          // Delete the status message since now playing message will appear
          setTimeout(() => {
            statusMsg.delete().catch(() => {});
          }, 3000);
          
        } catch (playError) {
          console.error('Playback start error:', playError);
          await statusMsg.edit(`❌ **Failed to start playback:** ${playError.message}`);
        }
        
      } else {
        // Add to queue
        musicQueue.addToQueue(message.guild.id, songInfo);
        const position = queueData.queue.length;
        
        await statusMsg.edit(`✅ **Added to queue (Position ${position}):** ${songInfo.title}\n👤 **Requested by:** ${songInfo.requestedBy}`);
        
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