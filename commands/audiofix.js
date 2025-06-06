const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');

module.exports = {
  name: 'audiofix',
  aliases: ['af', 'fixaudio', 'soundtest'],
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      const statusMsg = await message.channel.send('🔧 **Advanced Audio Diagnostics Starting...**');

      // Step 1: Check bot permissions
      const permissions = voiceChannel.permissionsFor(message.guild.members.me);
      const hasConnect = permissions.has('Connect');
      const hasSpeak = permissions.has('Speak');
      
      await statusMsg.edit(
        `📋 **Permission Check:**\n` +
        `• Connect: ${hasConnect ? '✅' : '❌'}\n` +
        `• Speak: ${hasSpeak ? '✅' : '❌'}\n\n` +
        `${!hasConnect || !hasSpeak ? '⚠️ **Missing permissions! Grant bot Connect and Speak permissions.**' : '✅ **Permissions OK**'}`
      );
      
      if (!hasConnect || !hasSpeak) {
        return await statusMsg.edit('❌ **Bot needs Connect and Speak permissions in voice channel!**');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Create connection with enhanced settings
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await statusMsg.edit('🔗 **Voice connection established**\n\n📊 **Testing Discord audio pipeline...**');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 3: Generate VERY LOUD test tone
      const { spawn } = require('child_process');
      
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'sine=frequency=1000:duration=8',  // 8 second 1000Hz tone
        '-ac', '2',
        '-ar', '48000',
        '-f', 's16le',
        '-filter:a', 'volume=2.0',  // Double volume
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

      // Set volume to MAXIMUM
      if (resource.volume) {
        resource.volume.setVolume(2.0);  // 200% volume for testing
      }

      let audioStarted = false;
      let startTime = Date.now();

      player.on('stateChange', async (oldState, newState) => {
        const elapsed = Date.now() - startTime;
        console.log(`Audio Fix Test (${elapsed}ms): ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === AudioPlayerStatus.Playing && !audioStarted) {
          audioStarted = true;
          await statusMsg.edit(
            `🔊 **MAXIMUM VOLUME AUDIO TEST PLAYING!** (${elapsed}ms)\n\n` +
            `🎵 **You should hear a VERY LOUD 1000Hz beep for 8 seconds!**\n\n` +
            `**If you STILL can't hear it:**\n\n` +
            `🔧 **Discord Settings:**\n` +
            `• Right-click the bot in voice channel\n` +
            `• Check if bot volume slider is at 100%\n` +
            `• User Settings > Voice & Video > Output Device\n\n` +
            `🔧 **System Settings:**\n` +
            `• Check Windows/Mac system volume\n` +
            `• Check headphone/speaker connection\n` +
            `• Try different audio output device\n\n` +
            `🔧 **Discord App:**\n` +
            `• Restart Discord completely\n` +
            `• Check Discord's audio output device\n` +
            `• Try Discord web version\n\n` +
            `**Volume: 200% | Frequency: 1000Hz | Duration: 8 seconds**\n` +
            `**Channel: ${voiceChannel.name}**`
          );
        }
        
        if (newState.status === AudioPlayerStatus.Idle) {
          if (oldState.status === AudioPlayerStatus.Playing) {
            await statusMsg.edit(
              `✅ **Audio hardware test completed!** (${elapsed}ms)\n\n` +
              `**Results:**\n` +
              `• Discord connection: ✅ Working\n` +
              `• Audio generation: ✅ Working\n` +
              `• Bot permissions: ✅ Working\n` +
              `• Audio pipeline: ✅ Working\n\n` +
              `${audioStarted ? 
                '🎉 **If you heard the loud beep, everything is perfect!**\n\n**Try:** `!play <song>` for music' : 
                '⚠️ **If you didn\'t hear anything, the issue is with your Discord/system audio settings, not the bot.**'
              }\n\n` +
              `**Next steps if no sound:**\n` +
              `1. Restart Discord completely\n` +
              `2. Check Discord audio output device\n` +
              `3. Test with different voice channel\n` +
              `4. Try Discord web version\n` +
              `5. Check Windows audio mixer`
            );
          } else {
            await statusMsg.edit(`❌ **Audio test failed** - No playback detected`);
          }
          
          setTimeout(() => {
            if (connection.state.status !== 'destroyed') {
              connection.destroy();
            }
          }, 3000);
        }
      });

      player.on('error', async (error) => {
        console.error('Audio fix test error:', error);
        await statusMsg.edit(`❌ **Audio system error:** ${error.message}`);
      });

      // Subscribe and play with debug info
      connection.subscribe(player);
      player.play(resource);
      await statusMsg.edit('▶️ **Starting MAXIMUM VOLUME audio test...**\n\n⚠️ **Warning: This will be LOUD!**');

      // Extra debugging info
      setTimeout(async () => {
        if (!audioStarted) {
          await statusMsg.edit(
            `⚠️ **Audio test timeout (10s)**\n\n` +
            `The audio system didn't start within 10 seconds.\n\n` +
            `**This usually means:**\n` +
            `• Discord API issues\n` +
            `• Network connectivity problems\n` +
            `• Discord client audio driver issues\n\n` +
            `**Try:**\n` +
            `1. Completely restart Discord\n` +
            `2. Try a different voice channel\n` +
            `3. Test with Discord web version\n` +
            `4. Check if other bots have audio issues too`
          );
        }
      }, 10000);

    } catch (error) {
      console.error('Audio fix test error:', error);
      message.channel.send(`❌ **Audio fix test failed:** ${error.message}`);
    }
  },
};
