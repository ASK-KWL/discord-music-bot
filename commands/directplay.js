const { AudioPlayerStatus } = require('@discordjs/voice');
const { createAudioConnection, createYouTubePlayerWithProcessing } = require('../music/player');

module.exports = {
  name: 'directplay',
  aliases: ['dp'],
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      const url = args[0];
      if (!url) {
        return message.channel.send('❌ **Usage:** `!dp <YouTube URL>`');
      }

      const statusMsg = await message.channel.send('🎵 **Direct playback test starting...**');
      
      // Create connection
      const connection = createAudioConnection(message);
      await statusMsg.edit('✅ **Voice connection established**');
      
      // Try different methods in order
      const methods = [
        { name: 'ytdl-core (Fast)', func: 'createYtdlCorePlayer' },
        { name: 'yt-dlp + FFmpeg', func: 'createYouTubePlayerWithProcessing' },
        { name: 'play-dl', func: 'createPlayer' }
      ];
      
      let playerData = null;
      
      for (const method of methods) {
        try {
          await statusMsg.edit(`🔄 **Trying ${method.name}...**`);
          
          const { createPlayer, createYouTubePlayerWithProcessing, createYtdlCorePlayer } = require('../music/player');
          
          switch (method.func) {
            case 'createYtdlCorePlayer':
              playerData = await createYtdlCorePlayer(url);
              break;
            case 'createYouTubePlayerWithProcessing':
              playerData = await createYouTubePlayerWithProcessing(url);
              break;
            case 'createPlayer':
              playerData = await createPlayer(url);
              break;
          }
          
          if (playerData) {
            console.log(`✅ Direct play using ${method.name}`);
            break;
          }
          
        } catch (methodError) {
          console.error(`${method.name} failed:`, methodError.message);
          await statusMsg.edit(`⚠️ **${method.name} failed, trying next...**`);
          continue;
        }
      }
      
      if (!playerData) {
        return await statusMsg.edit(`❌ **All methods failed!**\n\n**Solutions:**\n• Update yt-dlp: \`pip install --upgrade yt-dlp\`\n• Check FFmpeg installation\n• Try: \`!vt\` for voice test`);
      }
      
      const { player, resource } = playerData;
      await statusMsg.edit('✅ **Audio processing successful!**');
      
      // Set up simple event handlers
      player.on('stateChange', async (oldState, newState) => {
        console.log(`Direct Player: ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === 'playing') {
          await statusMsg.edit(`🔊 **DIRECT PLAYBACK ACTIVE!**\n\n🎵 Audio should be playing now.\n\n**Controls:**\n• React ❌ to stop\n• Check your Discord volume`);
          
          // Add stop reaction
          try {
            await statusMsg.react('❌');
          } catch (error) {
            console.log('Could not add reaction');
          }
        }
        
        if (newState.status === 'idle' && oldState.status === 'playing') {
          await statusMsg.edit('✅ **Direct playback finished!**');
          setTimeout(() => {
            if (connection.state.status !== 'destroyed') {
              connection.destroy();
            }
          }, 2000);
        }
      });
      
      player.on('error', async (error) => {
        console.error('Direct player error:', error);
        await statusMsg.edit(`❌ **Direct playback error:** ${error.message}`);
      });
      
      // Handle stop reaction
      const filter = (reaction, user) => {
        return reaction.emoji.name === '❌' && user.id === message.author.id;
      };
      
      statusMsg.awaitReactions({ filter, max: 1, time: 300000 })
        .then(() => {
          player.stop(true);
          statusMsg.edit('⏹️ **Direct playback stopped by user**');
          setTimeout(() => {
            if (connection.state.status !== 'destroyed') {
              connection.destroy();
            }
          }, 1000);
        })
        .catch(() => {
          // Timeout, ignore
        });
      
      // Subscribe and play
      connection.subscribe(player);
      player.play(resource);
      
      await statusMsg.edit('▶️ **Starting direct playback...**');
      
    } catch (error) {
      console.error('Direct play error:', error);
      message.channel.send(`❌ **Direct play failed:** ${error.message}`);
    }
  },
};
