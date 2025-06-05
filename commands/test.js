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

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const statusMsg = await message.channel.send('🧪 **Testing multiple YouTube extraction methods...**');

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const methods = [
        { name: 'yt-dlp + FFmpeg (Primary)', func: 'createYouTubePlayerWithProcessing' },
        { name: 'play-dl (Fallback)', func: 'createPlayer' },
        { name: 'Direct FFmpeg', func: 'createDirectFFmpegPlayer' },
        { name: 'ytdl-core', func: 'createYtdlCorePlayer' }
      ];

      let attempts = 0;
      const maxAttempts = methods.length;
      
      while (attempts < maxAttempts) {
        attempts++;
        const method = methods[attempts - 1];
        
        try {
          await statusMsg.edit(`🔄 **Attempt ${attempts}/${maxAttempts}: Testing ${method.name}...**`);
          
          const { createPlayer, createYouTubePlayerWithProcessing, createYtdlCorePlayer, createDirectFFmpegPlayer } = require('../music/player');
          
          let playerData;
          switch (method.func) {
            case 'createPlayer':
              playerData = await createPlayer(testUrl);
              break;
            case 'createYouTubePlayerWithProcessing':
              playerData = await createYouTubePlayerWithProcessing(testUrl);
              break;
            case 'createDirectFFmpegPlayer':
              playerData = await createDirectFFmpegPlayer(testUrl);
              break;
            case 'createYtdlCorePlayer':
              playerData = await createYtdlCorePlayer(testUrl);
              break;
          }
          
          const { player, resource } = playerData;

          let finished = false;
          let playingReported = false;
          let startTime = Date.now();
          
          player.on('stateChange', async (oldState, newState) => {
            const elapsed = Date.now() - startTime;
            console.log(`Test Player ${method.name} (${elapsed}ms): ${oldState.status} -> ${newState.status}`);
            
            if (newState.status === AudioPlayerStatus.Buffering && !playingReported) {
              await statusMsg.edit(`📊 **${method.name} buffering...**`);
            }
            
            if (newState.status === AudioPlayerStatus.Playing && !playingReported) {
              playingReported = true;
              await statusMsg.edit(`🔊 **SUCCESS with ${method.name}!** (${elapsed}ms)\n\n🎵 YouTube audio is playing!\n\nIf you can't hear it, check your Discord volume settings.`);
            }
            
            if (newState.status === AudioPlayerStatus.Idle) {
              if (oldState.status === AudioPlayerStatus.Playing && !finished) {
                finished = true;
                await statusMsg.edit(`✅ **${method.name} test completed!** (${elapsed}ms)\n\n🎉 YouTube extraction working with ${method.name}!`);
              } else if (oldState.status === AudioPlayerStatus.Buffering && !playingReported) {
                // This method failed, continue to next
                return;
              }
              
              setTimeout(() => {
                if (connection.state.status !== 'destroyed') {
                  connection.destroy();
                }
              }, 1000);
            }
          });

          player.on('error', async (error) => {
            console.error(`${method.name} player error:`, error);
            // Don't edit status here, let it continue to next method
          });

          connection.subscribe(player);
          player.play(resource);
          await statusMsg.edit(`▶️ **Starting ${method.name} playback...**`);
          
          // Wait for success or failure with longer timeout for FFmpeg methods
          const timeout = method.name.includes('FFmpeg') ? 20000 : 10000;
          
          await new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              if (!playingReported) {
                console.log(`${method.name} timed out after ${timeout}ms`);
              }
              resolve();
            }, timeout);
            
            player.once('stateChange', (oldState, newState) => {
              if (newState.status === AudioPlayerStatus.Playing) {
                clearTimeout(timeoutId);
                resolve();
              } else if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Buffering) {
                clearTimeout(timeoutId);
                resolve();
              }
            });
          });
          
          if (playingReported) {
            return; // Success, exit the retry loop
          }

        } catch (attemptError) {
          console.error(`${method.name} attempt failed:`, attemptError);
          await statusMsg.edit(`⚠️ **${method.name} failed:** ${attemptError.message.substring(0, 100)}...`);
          
          if (attempts === maxAttempts) {
            // All methods failed, use fallback
            await statusMsg.edit('🔄 **All YouTube methods failed. Testing with generated tone...**');
            
            const { createFallbackPlayer } = require('../music/player');
            const { player, resource } = await createFallbackPlayer();
            
            player.on('stateChange', async (oldState, newState) => {
              if (newState.status === AudioPlayerStatus.Playing) {
                await statusMsg.edit('🔊 **FALLBACK TONE PLAYING!**\n\nIf you hear this 440Hz tone, your Discord audio works perfectly.\n\n**The issue is with YouTube extraction methods.**\n\n**Solutions:**\n• Update dependencies: `npm update`\n• Ensure FFmpeg is in PATH\n• Try: `pip install --upgrade yt-dlp`');
              }
              
              if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing) {
                await statusMsg.edit('✅ **Audio system test complete.**\n\nYour Discord audio works perfectly! The problem is YouTube extraction.\n\n**Next steps:**\n1. Update all dependencies\n2. Verify FFmpeg installation\n3. Check yt-dlp with: `yt-dlp --version`');
              }
            });
            
            connection.subscribe(player);
            player.play(resource);
            await statusMsg.edit('🎵 **Playing fallback test tone...**');
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

    } catch (error) {
      console.error('Test error:', error);
      message.channel.send(`❌ **Test failed:** ${error.message}`);
    }
  },
};