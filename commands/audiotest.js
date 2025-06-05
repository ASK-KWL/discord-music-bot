const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'audiotest',
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      const statusMsg = await message.channel.send('🎵 Testing with improved local audio generation...');

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      const { spawn } = require('child_process');
      
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'sine=frequency=440:duration=3',
        '-ac', '2',
        '-ar', '48000',
        '-f', 's16le',
        '-'
      ]);

      await statusMsg.edit('✅ Generated Discord-compatible WAV file (48kHz stereo)');

      const player = createAudioPlayer({
        behaviors: { noSubscriber: 'play' }
      });

      const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw,
        inlineVolume: true
      });

      let finished = false;
      player.on('stateChange', async (oldState, newState) => {
        await statusMsg.edit(`🎵 Player: ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === AudioPlayerStatus.Playing && !finished) {
          setTimeout(async () => {
            await statusMsg.edit('🔊 LOCAL STEREO AUDIO IS PLAYING! You should hear a 440Hz tone!');
          }, 500);
        }
        
        if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing && !finished) {
          finished = true;
          await statusMsg.edit('✅ Local audio finished');
          
          // Auto-cleanup
          setTimeout(async () => {
            try {
              await statusMsg.delete();
            } catch (error) {
              // Ignore deletion errors
            }
            
            if (connection.state.status !== 'destroyed') {
              connection.destroy();
            }
          }, 3000);
        }
      });

      connection.subscribe(player);
      player.play(resource);
      await statusMsg.edit('🎵 Playing locally generated 440Hz stereo tone...');

    } catch (error) {
      console.error('Audio test error:', error);
      message.channel.send(`❌ Test failed: ${error.message}`);
    }
  },
};
