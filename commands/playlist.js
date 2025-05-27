const { AudioPlayerStatus } = require('@discordjs/voice');
const queue = require('../music/queue');
const { createAudioConnection, createPlayer, getPlaylistInfo, isPlaylist } = require('../music/player');

module.exports = {
  name: 'playlist',
  async execute(message, args) {
    const playlistUrl = args.join(' ');
    if (!playlistUrl) return message.reply('🎵 Please provide a YouTube playlist URL.');

    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ You need to be in a voice channel!');
      }

      // Check if it's actually a playlist URL
      if (!isPlaylist(playlistUrl)) {
        return message.reply('❌ Please provide a valid YouTube playlist URL.');
      }

      message.channel.send('🔍 Loading playlist... (this may take a moment)');
      
      // Get playlist info
      const playlistInfo = await getPlaylistInfo(playlistUrl);
      
      if (!playlistInfo.videos.length) {
        return message.reply('❌ No videos found in this playlist.');
      }

      message.channel.send(`📋 **${playlistInfo.title}**\nFound ${playlistInfo.videos.length} videos. Adding to queue...`);
      
      // Check if already in a queue
      let serverQueue = queue.get(message.guild.id);
      
      if (!serverQueue) {
        // Create new connection and start playing first song
        const connection = createAudioConnection(message);
        const firstVideo = playlistInfo.videos[0];
        
        message.channel.send(`⏳ Preparing first song: **${firstVideo.title}**`);
        const { player, resource } = await createPlayer(firstVideo.url);
        
        // Connect and play
        connection.subscribe(player);
        player.play(resource);
        
        // Create queue with all playlist videos
        const playlistSongs = playlistInfo.videos.map(video => ({
          title: video.title,
          url: video.url,
          requestedBy: message.author.username,
          duration: video.duration
        }));
        
        serverQueue = {
          connection,
          player,
          songs: playlistSongs
        };
        
        queue.set(message.guild.id, serverQueue);
        
        // Add state change handler for playlist progression
        player.on('stateChange', (oldState, newState) => {
          console.log(`Player state changed: ${oldState.status} -> ${newState.status}`);
          
          if (oldState.status === AudioPlayerStatus.Playing && 
              newState.status === AudioPlayerStatus.Idle) {
            
            const currentQueue = queue.get(message.guild.id);
            if (currentQueue) {
              currentQueue.songs.shift(); // Remove finished song
              
              if (currentQueue.songs.length > 0) {
                // Play next song in playlist
                message.channel.send(`🎵 Playing next: **${currentQueue.songs[0].title}** (${currentQueue.songs.length} left)`);
                playNextSong(message, currentQueue);
              } else {
                // Playlist finished
                message.channel.send('✅ Playlist finished. Leaving voice channel.');
                currentQueue.connection.destroy();
                queue.delete(message.guild.id);
              }
            }
          }
        });
        
        message.channel.send(`▶️ Now playing: **${firstVideo.title}**\n📋 ${playlistInfo.videos.length - 1} more songs in queue`);
        
        // Add error handlers
        player.on('error', error => {
          console.error('Player error:', error);
          message.channel.send(`❌ Player error: ${error.message}`);
          // Try to skip to next song
          const currentQueue = queue.get(message.guild.id);
          if (currentQueue && currentQueue.songs.length > 1) {
            currentQueue.songs.shift();
            playNextSong(message, currentQueue);
          }
        });
        
      } else {
        // Add playlist to existing queue
        const playlistSongs = playlistInfo.videos.map(video => ({
          title: video.title,
          url: video.url,
          requestedBy: message.author.username,
          duration: video.duration
        }));
        
        serverQueue.songs.push(...playlistSongs);
        
        message.channel.send(`✅ Added ${playlistInfo.videos.length} songs from playlist to queue!\nQueue now has ${serverQueue.songs.length} songs.`);
      }
      
    } catch (error) {
      console.error('Playlist error:', error);
      message.reply(`❌ Error loading playlist: ${error.message}`);
    }
  },
};

// Helper function to play next song (same as in play.js)
async function playNextSong(message, serverQueue) {
  try {
    const { createPlayer } = require('../music/player');
    const nextSong = serverQueue.songs[0];
    
    const { player, resource } = await createPlayer(nextSong.url);
    
    serverQueue.connection.subscribe(player);
    player.play(resource);
    serverQueue.player = player; // Update player reference
    
    // Re-add state change handler for new player
    player.on('stateChange', (oldState, newState) => {
      if (oldState.status === AudioPlayerStatus.Playing && 
          newState.status === AudioPlayerStatus.Idle) {
        
        const currentQueue = queue.get(message.guild.id);
        if (currentQueue) {
          currentQueue.songs.shift();
          
          if (currentQueue.songs.length > 0) {
            message.channel.send(`🎵 Playing next: **${currentQueue.songs[0].title}** (${currentQueue.songs.length} left)`);
            playNextSong(message, currentQueue);
          } else {
            message.channel.send('✅ Queue finished. Leaving voice channel.');
            currentQueue.connection.destroy();
            queue.delete(message.guild.id);
          }
        }
      }
    });
    
    // Add error handler for skipping problematic songs
    player.on('error', error => {
      console.error('Error playing song:', error);
      message.channel.send(`❌ Error playing **${nextSong.title}**, skipping...`);
      
      // Skip to next song
      const currentQueue = queue.get(message.guild.id);
      if (currentQueue && currentQueue.songs.length > 1) {
        currentQueue.songs.shift();
        playNextSong(message, currentQueue);
      } else if (currentQueue) {
        currentQueue.connection.destroy();
        queue.delete(message.guild.id);
      }
    });
    
  } catch (error) {
    console.error('Error playing next song:', error);
    message.channel.send(`❌ Error playing next song: ${error.message}`);
    
    // Skip to next song or end queue
    serverQueue.songs.shift();
    if (serverQueue.songs.length > 0) {
      playNextSong(message, serverQueue);
    } else {
      serverQueue.connection.destroy();
      queue.delete(message.guild.id);
    }
  }
}