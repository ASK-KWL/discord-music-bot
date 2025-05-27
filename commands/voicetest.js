const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'voicetest',
  async execute(message) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      message.channel.send('🔧 Starting voice connection test...');

      // Step 1: Create connection
      console.log('Creating voice connection...');
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      message.channel.send('✅ Voice connection created');

      // Step 2: Check connection state
      connection.on('stateChange', (oldState, newState) => {
        console.log(`Connection: ${oldState.status} -> ${newState.status}`);
        message.channel.send(`🔗 Connection: ${oldState.status} -> ${newState.status}`);
      });

      // Step 3: Create simple audio player
      console.log('Creating audio player...');
      const player = createAudioPlayer();

      // Step 4: Create a simple test tone (no external dependencies)
      const testAudio = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'; // Simple test audio
      
      try {
        const resource = createAudioResource(testAudio, {
          inlineVolume: true
        });

        if (resource.volume) {
          resource.volume.setVolume(1.0); // Max volume for testing
        }

        message.channel.send('✅ Audio resource created');

        // Step 5: Subscribe and play
        console.log('Subscribing player to connection...');
        connection.subscribe(player);
        message.channel.send('✅ Player subscribed to connection');

        // Step 6: Add player event listeners
        player.on('stateChange', (oldState, newState) => {
          console.log(`Player: ${oldState.status} -> ${newState.status}`);
          message.channel.send(`🎵 Player: ${oldState.status} -> ${newState.status}`);
          
          if (newState.status === AudioPlayerStatus.Playing) {
            message.channel.send('🔊 **AUDIO SHOULD BE PLAYING NOW!**');
          }
          
          if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing) {
            message.channel.send('✅ Audio finished playing');
            connection.destroy();
          }
        });

        player.on('error', error => {
          console.error('Player error:', error);
          message.channel.send(`❌ Player error: ${error.message}`);
        });

        // Step 7: Start playing
        console.log('Starting playback...');
        player.play(resource);
        message.channel.send('🎵 Playback started - listen for audio!');

      } catch (resourceError) {
        console.error('Resource creation error:', resourceError);
        message.channel.send(`❌ Resource error: ${resourceError.message}`);
      }

    } catch (error) {
      console.error('Voice test error:', error);
      message.channel.send(`❌ Voice test failed: ${error.message}`);
    }
  },
};