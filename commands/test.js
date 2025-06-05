const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const { createYouTubePlayerWithProcessing, createPlayer } = require('../music/player');

module.exports = {
  name: 'test',
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
      message.channel.send('🧪 Testing YouTube audio...');

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        message.channel.send('🔄 Trying processed YouTube method...');
        const { player, resource } = await createYouTubePlayerWithProcessing(testUrl);

        let finished = false;
        player.on('stateChange', (oldState, newState) => {
          console.log(`Test Player: ${oldState.status} -> ${newState.status}`);
          
          if (newState.status === AudioPlayerStatus.Playing && !finished) {
            message.channel.send('🔊 **YOUTUBE AUDIO IS PLAYING!**');
          }
          
          if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing && !finished) {
            finished = true;
            message.channel.send('✅ YouTube audio finished');
            setTimeout(() => {
              if (connection.state.status !== 'destroyed') {
                connection.destroy();
              }
            }, 500);
          }
        });

        player.on('error', (error) => {
          console.error('YouTube error:', error);
          message.channel.send(`❌ YouTube error: ${error.message}`);
        });

        connection.subscribe(player);
        player.play(resource);
        message.channel.send('▶️ YouTube playback started...');

      } catch (processedError) {
        message.channel.send(`❌ YouTube failed: ${processedError.message}`);
        
        const fallbackResource = createAudioResource('https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav');
        const fallbackPlayer = createAudioPlayer();
        
        fallbackPlayer.on('stateChange', (oldState, newState) => {
          if (newState.status === AudioPlayerStatus.Playing) {
            message.channel.send('🔊 **FALLBACK AUDIO PLAYING!**');
          }
        });
        
        connection.subscribe(fallbackPlayer);
        fallbackPlayer.play(fallbackResource);
        message.channel.send('🎵 Playing fallback audio...');
      }

    } catch (error) {
      console.error('Test error:', error);
      message.channel.send(`❌ Test failed: ${error.message}`);
    }
  },
};