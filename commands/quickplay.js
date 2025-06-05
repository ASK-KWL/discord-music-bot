const { createYouTubePlayerWithProcessing } = require('../music/player');

module.exports = {
  name: 'quickplay',
  aliases: ['qp'],
  async execute(message, args) {
    try {
      if (!args.length) {
        return message.channel.send('❌ Please provide a YouTube URL!');
      }

      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      const url = args.join(' ');
      
      // Validate URL
      if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        return message.channel.send('❌ Please provide a valid YouTube URL!');
      }

      const statusMsg = await message.channel.send('🚀 **Quick Play - Starting immediately...**');

      try {
        // Create connection
        const { createAudioConnection } = require('../music/player');
        const connection = createAudioConnection(message);
        
        await statusMsg.edit('🎵 **Creating yt-dlp player...**');
        
        // Use yt-dlp directly since it's working
        const { createYouTubePlayerWithProcessing } = require('../music/player');
        const { player, resource } = await createYouTubePlayerWithProcessing(url);
        
        let startTime = Date.now();
        let playingStarted = false;
        
        player.on('stateChange', async (oldState, newState) => {
          const elapsed = Date.now() - startTime;
          console.log(`Quick Play (${elapsed}ms): ${oldState.status} -> ${newState.status}`);
          
          if (newState.status === 'playing' && !playingStarted) {
            playingStarted = true;
            await statusMsg.edit(`🔊 **Quick Play Success!** (${elapsed}ms)\n\n🎵 YouTube audio is now playing!\n\nUsing: **yt-dlp + FFmpeg**`);
          }
          
          if (newState.status === 'idle' && oldState.status === 'playing') {
            await statusMsg.edit(`✅ **Quick Play finished** (${elapsed}ms)\n\nyt-dlp method working perfectly!`);
            
            setTimeout(() => {
              if (connection.state.status !== 'destroyed') {
                connection.destroy();
              }
            }, 1000);
          }
        });

        player.on('error', async (error) => {
          console.error('Quick play error:', error);
          await statusMsg.edit(`❌ **Quick Play failed:** ${error.message}`);
        });

        connection.subscribe(player);
        player.play(resource);
        
        await statusMsg.edit('▶️ **Starting yt-dlp playback...**');

      } catch (error) {
        console.error('Quick play error:', error);
        await statusMsg.edit(`❌ **Quick Play failed:** ${error.message}`);
      }

    } catch (error) {
      console.error('Quick play command error:', error);
      message.channel.send(`❌ **Quick Play error:** ${error.message}`);
    }
  },
};
