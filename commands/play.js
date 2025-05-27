const yts = require('yt-search');
const { AudioPlayerStatus } = require('@discordjs/voice');
const queue = require('../music/queue');
const { createAudioConnection, createPlayer, getSongInfo, getPlaylistInfo, isPlaylist } = require('../music/player');

module.exports = {
  name: 'play',
  async execute(message, args) {
    const query = args.join(' ');
    if (!query) return message.reply('🎵 Please provide a YouTube link, playlist, or search query.');

    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ You need to be in a voice channel!');
      }

      // Check if it's a playlist URL
      if (isPlaylist(query)) {
        message.channel.send('📋 Playlist detected! Loading playlist...');
        
        const playlistInfo = await getPlaylistInfo(query);
        
        if (!playlistInfo.videos.length) {
          return message.reply('❌ No videos found in this playlist.');
        }

        message.channel.send(`📋 **${playlistInfo.title}**\nFound ${playlistInfo.videos.length} videos. Adding to queue...`);
        
        // Handle playlist like the playlist command
        let serverQueue = queue.get(message.guild.id);
        
        if (!serverQueue) {
          // Start playing first song from playlist
          const connection = createAudioConnection(message);
          const firstVideo = playlistInfo.videos[0];
          
          const { player, resource } = await createPlayer(firstVideo.url);
          connection.subscribe(player);
          player.play(resource);
          
          const playlistSongs = playlistInfo.videos.map(video => ({
            title: video.title,
            url: video.url,
            requestedBy: message.author.username,
            duration: video.duration
          }));
          
          serverQueue = { connection, player, songs: playlistSongs };
          queue.set(message.guild.id, serverQueue);
          
          // Add playlist progression handler
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
                  message.channel.send('✅ Playlist finished. Leaving voice channel.');
                  currentQueue.connection.destroy();
                  queue.delete(message.guild.id);
                }
              }
            }
          });
          
          message.channel.send(`▶️ Now playing: **${firstVideo.title}**\n📋 ${playlistInfo.videos.length - 1} more songs in queue`);
        } else {
          // Add playlist to existing queue
          const playlistSongs = playlistInfo.videos.map(video => ({
            title: video.title,
            url: video.url,
            requestedBy: message.author.username
          }));
          
          serverQueue.songs.push(...playlistSongs);
          message.channel.send(`✅ Added ${playlistInfo.videos.length} songs from playlist to queue!`);
        }
        
        return; // Exit early for playlist handling
      }

      // Handle single video (existing logic)
      message.channel.send('🔍 Searching for song...');
      
      let videoUrl;
      let songTitle = 'Unknown Song';
      
      if (query.includes('youtube.com/watch') || query.includes('youtu.be/')) {
        videoUrl = query;
        message.channel.send('🎵 YouTube link detected, getting song info...');
      } else {
        const searchResults = await yts(query);
        if (!searchResults.videos.length) {
          return message.reply('❌ No videos found for your search.');
        }
        
        videoUrl = searchResults.videos[0].url;
        songTitle = searchResults.videos[0].title;
        message.channel.send(`🎵 Found: **${songTitle}**`);
      }

      // Get song info
      message.channel.send('⏳ Preparing audio... (this may take a moment)');
      
      const songInfo = await getSongInfo(videoUrl);
      if (songInfo.title !== 'Unknown Title') {
        songTitle = songInfo.title;
      }
      
      // Check if already in a queue
      let serverQueue = queue.get(message.guild.id);
      
      if (!serverQueue) {
        // Create new connection and player (existing logic)
        const connection = createAudioConnection(message);
        const { player, resource } = await createPlayer(videoUrl);
        
        connection.subscribe(player);
        player.play(resource);
        
        serverQueue = {
          connection,
          player,
          songs: [{ 
            title: songTitle, 
            url: videoUrl,
            requestedBy: message.author.username
          }]
        };
        
        queue.set(message.guild.id, serverQueue);
        
        // Add state change handler (existing logic)
        player.on('stateChange', (oldState, newState) => {
          if (oldState.status === AudioPlayerStatus.Playing && 
              newState.status === AudioPlayerStatus.Idle) {
            
            const currentQueue = queue.get(message.guild.id);
            if (currentQueue) {
              currentQueue.songs.shift();
              
              if (currentQueue.songs.length > 0) {
                message.channel.send(`🎵 Playing next: **${currentQueue.songs[0].title}**`);
                playNextSong(message, currentQueue);
              } else {
                message.channel.send('✅ Queue finished. Leaving voice channel.');
                currentQueue.connection.destroy();
                queue.delete(message.guild.id);
              }
            }
          }
        });
        
        message.channel.send(`▶️ Now playing: **${songTitle}**`);
        
      } else {
        // Add to existing queue
        serverQueue.songs.push({
          title: songTitle,
          url: videoUrl,
          requestedBy: message.author.username
        });
        
        message.channel.send(`✅ Added to queue: **${songTitle}** (Position: ${serverQueue.songs.length})`);
      }
      
    } catch (error) {
      console.error('Play error:', error);
      message.reply(`❌ Error playing song: ${error.message}`);
    }
  },
};

// Helper function to play next song (same as before)
async function playNextSong(message, serverQueue) {
  try {
    const { createPlayer } = require('../music/player');
    const nextSong = serverQueue.songs[0];
    
    const { player, resource } = await createPlayer(nextSong.url);
    
    serverQueue.connection.subscribe(player);
    player.play(resource);
    serverQueue.player = player;
    
    player.on('stateChange', (oldState, newState) => {
      if (oldState.status === AudioPlayerStatus.Playing && 
          newState.status === AudioPlayerStatus.Idle) {
        
        const currentQueue = queue.get(message.guild.id);
        if (currentQueue) {
          currentQueue.songs.shift();
          
          if (currentQueue.songs.length > 0) {
            message.channel.send(`🎵 Playing next: **${currentQueue.songs[0].title}**`);
            playNextSong(message, currentQueue);
          } else {
            message.channel.send('✅ Queue finished. Leaving voice channel.');
            currentQueue.connection.destroy();
            queue.delete(message.guild.id);
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error playing next song:', error);
    message.channel.send(`❌ Error playing next song: ${error.message}`);
    
    serverQueue.songs.shift();
    if (serverQueue.songs.length > 0) {
      playNextSong(message, serverQueue);
    } else {
      serverQueue.connection.destroy();
      queue.delete(message.guild.id);
    }
  }
}