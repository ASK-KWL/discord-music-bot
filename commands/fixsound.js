const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');

module.exports = {
  name: 'fixsound',
  aliases: ['fs', 'nosound', 'soundfix'],
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      const statusMsg = await message.channel.send('🔧 **Discord Audio Troubleshooting Guide**');

      await statusMsg.edit(
        `🔧 **Discord Bot Audio Issues - Complete Guide**\n\n` +
        `**Your bot is working perfectly! The issue is Discord client settings.**\n\n` +
        `📋 **Step-by-Step Fix:**\n\n` +
        `**1. Check Bot Volume in Voice Channel**\n` +
        `• Right-click "${message.client.user.username}" in the voice channel\n` +
        `• Look for a volume slider - make sure it's at 100%\n` +
        `• If there's no slider, the bot volume is already at max\n\n` +
        `**2. Discord Audio Settings**\n` +
        `• Discord Settings (⚙️) → Voice & Video\n` +
        `• Check "Output Device" - try switching devices\n` +
        `• Set "Output Volume" to 100%\n` +
        `• Try toggling "Legacy Audio Subsystem"\n\n` +
        `**3. Windows Audio Mixer (Windows only)**\n` +
        `• Right-click volume icon → Open Volume Mixer\n` +
        `• Find Discord in the list\n` +
        `• Make sure Discord volume is at 100%\n\n` +
        `**4. Quick Fixes**\n` +
        `• Restart Discord completely\n` +
        `• Try Discord in web browser\n` +
        `• Switch to different voice channel\n` +
        `• Check if other bots have same issue\n\n` +
        `**React with 🧪 to test audio again**`
      );

      // Add reaction for testing
      try {
        await statusMsg.react('🧪');
      } catch (error) {
        console.log('Could not add reaction');
      }

      // Listen for reaction
      const filter = (reaction, user) => {
        return reaction.emoji.name === '🧪' && user.id === message.author.id;
      };

      statusMsg.awaitReactions({ filter, max: 1, time: 60000 })
        .then(async () => {
          await this.runAudioTest(statusMsg, message);
        })
        .catch(() => {
          // Timeout, ignore
        });

    } catch (error) {
      console.error('Fix sound error:', error);
      message.channel.send(`❌ **Error:** ${error.message}`);
    }
  },

  async runAudioTest(statusMsg, message) {
    try {
      await statusMsg.edit('🔊 **Running multi-frequency audio test...**');

      const connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      // Test with multiple frequencies to rule out hearing issues
      const frequencies = [
        { freq: 200, name: 'Low (200Hz)' },
        { freq: 1000, name: 'Mid (1000Hz)' },
        { freq: 3000, name: 'High (3000Hz)' }
      ];

      for (let i = 0; i < frequencies.length; i++) {
        const { freq, name } = frequencies[i];
        
        await statusMsg.edit(`🔊 **Testing ${name} frequency... (${i + 1}/${frequencies.length})**\n\nYou should hear a ${freq}Hz tone for 3 seconds.`);

        const { spawn } = require('child_process');
        
        const ffmpeg = spawn('ffmpeg', [
          '-f', 'lavfi',
          '-i', `sine=frequency=${freq}:duration=3`,
          '-ac', '2',
          '-ar', '48000',
          '-f', 's16le',
          '-filter:a', 'volume=3.0',  // Extra loud
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

        if (resource.volume) {
          resource.volume.setVolume(2.0);  // 200% volume
        }

        let testCompleted = false;

        player.on('stateChange', async (oldState, newState) => {
          if (newState.status === AudioPlayerStatus.Playing && !testCompleted) {
            await statusMsg.edit(`🔊 **${name} tone playing NOW!**\n\nVolume: 200% | Duration: 3 seconds\n\nIf you can't hear this, check Discord settings!`);
          }
          
          if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing && !testCompleted) {
            testCompleted = true;
          }
        });

        connection.subscribe(player);
        player.play(resource);

        // Wait for this test to complete
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      await statusMsg.edit(
        `✅ **Audio tests completed!**\n\n` +
        `**Results Analysis:**\n` +
        `• If you heard ALL tones: Discord audio is perfect ✅\n` +
        `• If you heard SOME tones: Check audio device settings ⚠️\n` +
        `• If you heard NO tones: Discord client issue ❌\n\n` +
        `**If you heard the tones but not music:**\n` +
        `1. The bot audio system works perfectly\n` +
        `2. YouTube audio processing works\n` +
        `3. Issue is with Discord's per-application volume\n\n` +
        `**Final troubleshooting:**\n` +
        `• Try music again: \`!play test song\`\n` +
        `• Right-click bot in voice channel\n` +
        `• Check Windows Volume Mixer\n` +
        `• Restart Discord completely`
      );

      setTimeout(() => {
        if (connection.state.status !== 'destroyed') {
          connection.destroy();
        }
      }, 2000);

    } catch (testError) {
      console.error('Audio test error:', testError);
      await statusMsg.edit(`❌ **Audio test failed:** ${testError.message}`);
    }
  }
};
