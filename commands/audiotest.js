const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'audiotest',
  aliases: ['at', 'soundtest'],
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      const statusMsg = await message.channel.send('🔊 **Testing Discord audio output...**');

      // Create connection
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await statusMsg.edit('✅ **Voice connection established**');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test 1: Simple beep test
      const { spawn } = require('child_process');
      
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'sine=frequency=1000:duration=3',  // 3 second 1000Hz beep
        '-ac', '2',
        '-ar', '48000',
        '-f', 's16le',
        '-filter:a', 'volume=0.5',  // Ensure volume is reasonable
        '-'
      ]);

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

      // Set volume to maximum to ensure we hear it
      if (resource.volume) {
        resource.volume.setVolume(1.0);  // 100% volume
      }

      let audioStarted = false;
      let startTime = Date.now();

      player.on('stateChange', async (oldState, newState) => {
        const elapsed = Date.now() - startTime;
        console.log(`Audio Test (${elapsed}ms): ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === AudioPlayerStatus.Playing && !audioStarted) {
          audioStarted = true;
          await statusMsg.edit(
            `🔊 **AUDIO TEST PLAYING!** (${elapsed}ms)\n\n` +
            `🎵 You should hear a **LOUD 1000Hz beep** for 3 seconds!\n\n` +
            `**If you can't hear it:**\n` +
            `• Check Discord's bot volume slider (right-click bot)\n` +
            `• Check your system volume\n` +
            `• Check voice channel permissions\n` +
            `• Verify Discord audio output device\n\n` +
            `**Debugging info:**\n` +
            `• Volume: 100%\n` +
            `• Frequency: 1000Hz\n` +
            `• Duration: 3 seconds\n` +
            `• Channel: ${voiceChannel.name}`
          );
        }
        
        if (newState.status === AudioPlayerStatus.Idle) {
          if (oldState.status === AudioPlayerStatus.Playing) {
            await statusMsg.edit(
              `✅ **Audio test completed!** (${elapsed}ms)\n\n` +
              `**Results:**\n` +
              `• Discord connection: ✅ Working\n` +
              `• Audio generation: ✅ Working\n` +
              `• Playback system: ✅ Working\n\n` +
              `${audioStarted ? '**If you heard the beep, everything is working!**' : '**If you didn\'t hear anything, check Discord settings.**'}\n\n` +
              `**Next step:** Try \`!play <song>\` for YouTube audio`
            );
          } else {
            await statusMsg.edit(`❌ **Audio test failed** - No playback detected`);
          }
          
          setTimeout(() => {
            if (connection.state.status !== 'destroyed') {
              connection.destroy();
            }
          }, 2000);
        }
      });

      player.on('error', async (error) => {
        console.error('Audio test error:', error);
        await statusMsg.edit(`❌ **Audio test error:** ${error.message}`);
      });

      // Subscribe and play
      connection.subscribe(player);
      player.play(resource);
      await statusMsg.edit('▶️ **Starting LOUD audio test...**');

      // Timeout
      setTimeout(async () => {
        if (!audioStarted) {
          await statusMsg.edit(`⚠️ **Audio test timeout**\n\nThe audio system didn't start playing within 10 seconds.\n\n**Possible issues:**\n• FFmpeg not working\n• Discord API issues\n• Voice permissions`);
        }
      }, 10000);

    } catch (error) {
      console.error('Audio test error:', error);
      message.channel.send(`❌ **Audio test failed:** ${error.message}`);
    }
  },
};
