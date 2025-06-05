const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');

module.exports = {
  name: 'voicetest',
  async execute(message) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      const statusMsg = await message.channel.send('🔧 **Starting voice system test...**');

      // Step 1: Create basic connection
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await statusMsg.edit('✅ **Voice connection established**');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 2: Generate audio with FFmpeg directly
      const { spawn } = require('child_process');
      
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'sine=frequency=800:duration=5',  // 5 second 800Hz tone
        '-ac', '2',                             // Stereo
        '-ar', '48000',                         // 48kHz
        '-f', 's16le',                          // Raw PCM
        '-'
      ]);

      await statusMsg.edit('🎵 **Generated 5-second test tone (800Hz)**');

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: 'play',
          maxMissedFrames: Math.round(5000 / 20)
        }
      });

      const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw,
        inlineVolume: true
      });

      if (resource.volume) {
        resource.volume.setVolume(1.0);
      }

      // Step 3: Test audio playback
      let finished = false;
      let startTime = Date.now();
      
      player.on('stateChange', async (oldState, newState) => {
        const elapsed = Date.now() - startTime;
        console.log(`Voice Test (${elapsed}ms): ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === AudioPlayerStatus.Buffering) {
          await statusMsg.edit('📊 **Audio buffering...**');
        }
        
        if (newState.status === AudioPlayerStatus.Playing && !finished) {
          await statusMsg.edit(`🔊 **AUDIO IS PLAYING!** (${elapsed}ms)\n\n🎵 You should hear a clear 800Hz tone for 5 seconds.\n\nIf you can't hear it, check:\n• Discord bot volume slider\n• Your system volume\n• Voice channel permissions`);
        }
        
        if (newState.status === AudioPlayerStatus.Idle) {
          if (oldState.status === AudioPlayerStatus.Playing && !finished) {
            finished = true;
            await statusMsg.edit(`✅ **Voice test completed!** (${elapsed}ms)\n\nIf you heard the tone, your Discord audio system is working perfectly!`);
          } else if (oldState.status === AudioPlayerStatus.Buffering && !finished) {
            await statusMsg.edit(`❌ **Audio failed** - Went from buffering to idle\n\nThis indicates a problem with the audio pipeline.`);
          }
          
          setTimeout(() => {
            if (connection.state.status !== 'destroyed') {
              connection.destroy();
            }
          }, 1000);
        }
      });

      player.on('error', async (error) => {
        console.error('Voice test player error:', error);
        await statusMsg.edit(`❌ **Player error:** ${error.message}`);
      });

      // Handle FFmpeg errors
      ffmpeg.on('error', async (error) => {
        console.error('FFmpeg error:', error);
        await statusMsg.edit(`❌ **FFmpeg error:** ${error.message}`);
      });

      ffmpeg.stderr.on('data', (data) => {
        const message = data.toString();
        if (message.includes('error') || message.includes('Error')) {
          console.error('FFmpeg stderr:', message);
        }
      });

      // Step 4: Subscribe and play
      connection.subscribe(player);
      player.play(resource);
      await statusMsg.edit('▶️ **Starting audio playback...**');

      // Timeout check
      setTimeout(async () => {
        if (!finished) {
          await statusMsg.edit('⚠️ **Timeout** - Audio should have finished by now. Check console for errors.');
        }
      }, 12000);

    } catch (error) {
      console.error('Voice test error:', error);
      message.channel.send(`❌ **Voice test failed:** ${error.message}`);
    }
  },
};