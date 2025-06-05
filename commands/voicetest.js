const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'voicetest',
  async execute(message) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      message.channel.send('🔧 Starting simple voice test...');

      // Step 1: Create basic connection
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      // Step 2: Wait a moment for connection
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 3: Create player and resource
      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: 'play',
        }
      });

      const resource = createAudioResource('https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav', {
        inlineVolume: true
      });

      if (resource.volume) {
        resource.volume.setVolume(1.0);
      }

      // Step 4: Single event listener
      let finished = false;
      player.on('stateChange', (oldState, newState) => {
        console.log(`Player: ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === AudioPlayerStatus.Playing && !finished) {
          message.channel.send('🔊 **AUDIO IS PLAYING!**');
        }
        
        if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing && !finished) {
          finished = true;
          message.channel.send('✅ Audio finished');
          setTimeout(() => {
            if (connection.state.status !== 'destroyed') {
              connection.destroy();
            }
          }, 500);
        }
      });

      player.on('error', (error) => {
        console.error('Player error:', error);
        message.channel.send(`❌ Player error: ${error.message}`);
      });

      // Step 5: Subscribe and play
      connection.subscribe(player);
      player.play(resource);
      message.channel.send('🎵 Playing test audio...');

    } catch (error) {
      console.error('Voice test error:', error);
      message.channel.send(`❌ Test failed: ${error.message}`);
    }
  },
};