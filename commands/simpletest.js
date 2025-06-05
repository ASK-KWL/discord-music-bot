const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');

module.exports = {
  name: 'simpletest',
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      const statusMsg = await message.channel.send('🧪 **Testing with direct audio URL...**');

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test with a direct audio file URL that should work
      const testAudioUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';
      
      try {
        await statusMsg.edit('🔄 **Testing direct audio URL...**');
        
        const player = createAudioPlayer({
          behaviors: {
            noSubscriber: 'play',
            maxMissedFrames: Math.round(5000 / 20),
          }
        });

        const resource = createAudioResource(testAudioUrl, {
          inlineVolume: true,
          metadata: {
            title: 'Test Audio File',
            url: testAudioUrl
          }
        });

        if (resource.volume) {
          resource.volume.setVolume(1.0);
        }

        let finished = false;
        let playingReported = false;
        let startTime = Date.now();
        
        player.on('stateChange', async (oldState, newState) => {
          const elapsed = Date.now() - startTime;
          console.log(`Simple Test (${elapsed}ms): ${oldState.status} -> ${newState.status}`);
          
          if (newState.status === AudioPlayerStatus.Buffering && !playingReported) {
            await statusMsg.edit('📊 **Audio buffering...**');
          }
          
          if (newState.status === AudioPlayerStatus.Playing && !playingReported) {
            playingReported = true;
            await statusMsg.edit(`🔊 **SUCCESS! Direct audio is playing!** (${elapsed}ms)\n\nIf you can hear the bell sound, your audio system works perfectly!\n\nThe issue is specifically with YouTube extraction, not Discord audio.`);
          }
          
          if (newState.status === AudioPlayerStatus.Idle) {
            if (oldState.status === AudioPlayerStatus.Playing && !finished) {
              finished = true;
              await statusMsg.edit(`✅ **Direct audio test completed!** (${elapsed}ms)\n\n🎉 Your Discord audio system works perfectly!\n\nThe problem is with YouTube URL extraction methods.`);
            } else if (oldState.status === AudioPlayerStatus.Buffering && !playingReported) {
              await statusMsg.edit(`❌ **Direct audio failed** - Network or permissions issue`);
            }
            
            setTimeout(() => {
              if (connection.state.status !== 'destroyed') {
                connection.destroy();
              }
            }, 1000);
          }
        });

        player.on('error', async (error) => {
          console.error('Simple test player error:', error);
          await statusMsg.edit(`❌ **Direct audio error:** ${error.message}`);
        });

        connection.subscribe(player);
        player.play(resource);
        await statusMsg.edit('▶️ **Starting direct audio playback...**');
        
        // Timeout check
        setTimeout(async () => {
          if (!finished && !playingReported) {
            await statusMsg.edit('⚠️ **Timeout** - Direct audio should have played. This indicates a network or permissions issue.');
          }
        }, 15000);

      } catch (directError) {
        console.error('Direct audio test failed:', directError);
        await statusMsg.edit(`❌ **Direct audio test failed:** ${directError.message}\n\nTrying fallback tone...`);
        
        // Fallback to generated tone
        const { createFallbackPlayer } = require('../music/player');
        const { player, resource } = await createFallbackPlayer();
        
        player.on('stateChange', async (oldState, newState) => {
          if (newState.status === AudioPlayerStatus.Playing) {
            await statusMsg.edit('🔊 **FALLBACK TONE PLAYING!**\n\nIf you hear this 440Hz tone, your basic audio system works.\n\nBoth direct audio URLs and YouTube are problematic.');
          }
        });
        
        connection.subscribe(player);
        player.play(resource);
      }

    } catch (error) {
      console.error('Simple test error:', error);
      message.channel.send(`❌ **Simple test failed:** ${error.message}`);
    }
  },
};
