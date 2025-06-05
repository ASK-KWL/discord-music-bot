const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'quicktest',
  aliases: ['qtest'],
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      const url = args[0] || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const statusMsg = await message.channel.send('🚀 **Quick test with yt-dlp method...**');

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        const { createYouTubePlayerWithProcessing } = require('../music/player');
        const { player, resource } = await createYouTubePlayerWithProcessing(url);
        
        let playingStarted = false;
        let startTime = Date.now();
        
        player.on('stateChange', async (oldState, newState) => {
          const elapsed = Date.now() - startTime;
          console.log(`Quick Test (${elapsed}ms): ${oldState.status} -> ${newState.status}`);
          
          if (newState.status === AudioPlayerStatus.Playing && !playingStarted) {
            playingStarted = true;
            await statusMsg.edit(`🔊 **SUCCESS!** (${elapsed}ms)\n\n✅ yt-dlp method working perfectly!\n\n🎵 YouTube audio is playing`);
          }
          
          if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing) {
            await statusMsg.edit(`✅ **Quick test completed!** (${elapsed}ms)\n\n🎉 yt-dlp method is working perfectly for YouTube playback!`);
            
            setTimeout(() => {
              if (connection.state.status !== 'destroyed') {
                connection.destroy();
              }
            }, 1000);
          }
        });

        player.on('error', async (error) => {
          console.error('Quick test error:', error);
          await statusMsg.edit(`❌ **Quick test failed:** ${error.message}`);
        });

        connection.subscribe(player);
        player.play(resource);
        await statusMsg.edit('▶️ **Starting yt-dlp playback...**');

      } catch (error) {
        console.error('Quick test error:', error);
        await statusMsg.edit(`❌ **Quick test failed:** ${error.message}`);
      }

    } catch (error) {
      console.error('Quick test command error:', error);
      message.channel.send(`❌ **Quick test error:** ${error.message}`);
    }
  },
};
