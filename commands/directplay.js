const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'directplay',
  aliases: ['dp'],
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
      const statusMsg = await message.channel.send('🚀 **Direct Play - Bypassing queue system...**');

      try {
        const { createAudioConnection, createYouTubePlayerWithProcessing } = require('../music/player');
        
        // Create connection
        const connection = createAudioConnection(message);
        await statusMsg.edit('🔗 **Voice connection established**');
        
        // Create player using working yt-dlp method
        await statusMsg.edit('🎵 **Creating yt-dlp player...**');
        const { player, resource } = await createYouTubePlayerWithProcessing(url);
        
        let playingStarted = false;
        let startTime = Date.now();
        
        player.on('stateChange', async (oldState, newState) => {
          const elapsed = Date.now() - startTime;
          console.log(`Direct Play (${elapsed}ms): ${oldState.status} -> ${newState.status}`);
          
          if (newState.status === AudioPlayerStatus.Buffering && !playingStarted) {
            await statusMsg.edit('📊 **Buffering audio data...**');
          }
          
          if (newState.status === AudioPlayerStatus.Playing && !playingStarted) {
            playingStarted = true;
            await statusMsg.edit(`🔊 **SUCCESS!** (${elapsed}ms)\n\n🎵 **Direct Play Active**\n\nyt-dlp method working perfectly!\n\nIf this works but !play doesn't, the issue is in the queue system.`);
          }
          
          if (newState.status === AudioPlayerStatus.Idle && playingStarted) {
            await statusMsg.edit(`✅ **Direct Play completed!** (${elapsed}ms)\n\n🎉 yt-dlp method confirmed working!\n\nIf !play still doesn't work, check the queue system.`);
            
            setTimeout(() => {
              if (connection.state.status !== 'destroyed') {
                connection.destroy();
              }
            }, 1000);
          }
        });

        player.on('error', async (error) => {
          console.error('Direct play error:', error);
          await statusMsg.edit(`❌ **Direct Play failed:** ${error.message}`);
        });

        // Subscribe and play directly (bypass queue)
        connection.subscribe(player);
        player.play(resource);
        await statusMsg.edit('▶️ **Starting direct playback...**');

      } catch (error) {
        console.error('Direct play error:', error);
        await statusMsg.edit(`❌ **Direct Play failed:** ${error.message}`);
      }

    } catch (error) {
      console.error('Direct play command error:', error);
      message.channel.send(`❌ **Direct Play error:** ${error.message}`);
    }
  },
};
