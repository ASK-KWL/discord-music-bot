const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const { AudioPlayerStatus } = require('@discordjs/voice');
const queue = require('../music/queue');
const { createAudioConnection, createPlayer, getSongInfo } = require('../music/player');

module.exports = {
  name: 'play',
  async execute(message, args) {
    const query = args.join(' ');
    if (!query) return message.reply('🎵 Please provide a search query or YouTube URL.');

    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ You need to be in a voice channel!');
      }

      let videoUrl;
      let songTitle;

      // Check if it's a YouTube URL
      if (ytdl.validateURL(query)) {
        videoUrl = query;
        message.channel.send('🎵 YouTube URL detected!');
      } else {
        // Search for song
        message.channel.send('🔍 Searching for song...');
        const searchResults = await yts(query);
        if (!searchResults.videos.length) {
          return message.reply('❌ No videos found for your search.');
        }
        
        videoUrl = searchResults.videos[0].url;
        message.channel.send(`🎵 Found: **${searchResults.videos[0].title}**`);
      }

      // Get song info
      const songInfo = await getSongInfo(videoUrl);
      songTitle = songInfo.title;

      // Check if already in queue
      let serverQueue = queue.get(message.guild.id);

      if (serverQueue) {
        // Add to existing queue
        serverQueue.songs.push({
          title: songTitle,
          url: videoUrl,
          requestedBy: message.author.username
        });
        return message.channel.send(`➕ **${songTitle}** has been added to the queue! Position: ${serverQueue.songs.length}`);
      }

      // Create new queue
      message.channel.send('⏳ Loading audio...');

      const connection = createAudioConnection(message);
      const { player, resource } = await createPlayer(videoUrl);

      // Create server queue
      serverQueue = {
        connection,
        player,
        songs: [{
          title: songTitle,
          url: videoUrl,
          requestedBy: message.author.username
        }],
        loop: false,
        textChannel: message.channel
      };

      queue.set(message.guild.id, serverQueue);

      // Set up player events
      player.on('stateChange', (oldState, newState) => {
        console.log(`Main Player: ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === AudioPlayerStatus.Playing) {
          message.channel.send(`▶️ **Now playing:** ${songTitle}`);
        }
        
        // Handle auto-pause (when no one is listening)
        if (newState.status === AudioPlayerStatus.AutoPaused) {
          console.log('🔄 Player auto-paused, attempting to resume...');
          // Try to unpause after a short delay
          setTimeout(() => {
            if (player.state.status === AudioPlayerStatus.AutoPaused) {
              player.unpause();
              console.log('🔄 Attempted to resume from auto-pause');
            }
          }, 1000);
        }
        
        if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing) {
          const currentQueue = queue.get(message.guild.id);
          if (currentQueue) {
            // Handle looping
            if (currentQueue.loop === 'song') {
              message.channel.send(`🔂 Looping: **${currentQueue.songs[0].title}**`);
              playNextSong(message, currentQueue);
              return;
            }

            // Handle queue progression
            if (currentQueue.loop === 'queue') {
              const currentSong = currentQueue.songs.shift();
              currentQueue.songs.push(currentSong);
            } else {
              currentQueue.songs.shift();
            }
            
            if (currentQueue.songs.length > 0) {
              message.channel.send(`🎵 Playing next: **${currentQueue.songs[0].title}**`);
              playNextSong(message, currentQueue);
            } else {
              if (currentQueue.loop !== 'queue') {
                message.channel.send('✅ Queue finished. Leaving voice channel.');
                currentQueue.connection.destroy();
                queue.delete(message.guild.id);
              }
            }
          }
        }
      });

      player.on('error', error => {
        console.error('Main player error:', error);
        message.channel.send(`❌ Playback error: ${error.message}`);
        
        // Try to skip to next song
        const currentQueue = queue.get(message.guild.id);
        if (currentQueue && currentQueue.songs.length > 1) {
          currentQueue.songs.shift();
          playNextSong(message, currentQueue);
        }
      });

      // Start playing
      connection.subscribe(player);
      player.play(resource);

    } catch (error) {
      console.error('Play error:', error);
      message.reply(`❌ Error playing song: ${error.message}`);
    }
  },
};

// Helper function for playing next song
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
          // Handle looping FIRST
          if (currentQueue.loop === 'song') {
            console.log('🔂 Looping current song');
            message.channel.send(`🔂 Looping: **${currentQueue.songs[0].title}**`);
            // Don't shift the queue, just replay the same song
            playNextSong(message, currentQueue);
            return;
          }

          // Handle queue progression
          if (currentQueue.loop === 'queue') {
            console.log('🔁 Queue loop - moving song to end');
            const currentSong = currentQueue.songs.shift();
            currentQueue.songs.push(currentSong);
            message.channel.send(`🔁 Queue loop: **${currentQueue.songs[0].title}**`);
          } else {
            // Normal mode - remove current song
            currentQueue.songs.shift();
          }
          
          // Check if there are more songs
          if (currentQueue.songs.length > 0) {
            message.channel.send(`🎵 Playing next: **${currentQueue.songs[0].title}**`);
            playNextSong(message, currentQueue);
          } else {
            // Only exit if NOT in queue loop mode
            if (currentQueue.loop !== 'queue') {
              message.channel.send('✅ Queue finished. Leaving voice channel.');
              currentQueue.connection.destroy();
              queue.delete(message.guild.id);
            }
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error playing next song:', error);
    message.channel.send(`❌ Error playing next song: ${error.message}`);
  }
}