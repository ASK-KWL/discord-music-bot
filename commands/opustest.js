const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const { Readable } = require('stream');

module.exports = {
  name: 'opustest',
  async execute(message) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      message.channel.send('🎵 Testing with Opus-encoded audio...');

      // Create connection
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate audio using FFmpeg with proper Discord settings
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'sine=frequency=440:duration=3',
        '-ac', '2',           // Stereo
        '-ar', '48000',       // 48kHz sample rate (Discord requirement)
        '-f', 's16le',        // 16-bit PCM
        '-'
      ]);

      if (!ffmpeg.stdout) {
        throw new Error('FFmpeg stdout not available');
      }

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: 'play',
        }
      });

      const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw,
        inlineVolume: true
      });

      if (resource.volume) {
        resource.volume.setVolume(1.0);
      }

      message.channel.send('✅ FFmpeg audio stream created');

      // Event handling
      let finished = false;
      player.on('stateChange', (oldState, newState) => {
        console.log(`Opus Test Player: ${oldState.status} -> ${newState.status}`);
        message.channel.send(`🎵 Player: ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === AudioPlayerStatus.Playing && !finished) {
          message.channel.send('🔊 **FFMPEG OPUS AUDIO IS PLAYING!**');
        }
        
        if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing && !finished) {
          finished = true;
          message.channel.send('✅ FFmpeg audio finished');
          setTimeout(() => {
            if (connection.state.status !== 'destroyed') {
              connection.destroy();
            }
          }, 500);
        }
      });

      player.on('error', (error) => {
        console.error('FFmpeg player error:', error);
        message.channel.send(`❌ FFmpeg error: ${error.message}`);
      });

      ffmpeg.on('error', (error) => {
        console.error('FFmpeg process error:', error);
        message.channel.send(`❌ FFmpeg process error: ${error.message}`);
      });

      // Subscribe and play
      connection.subscribe(player);
      player.play(resource);
      message.channel.send('🎵 Playing FFmpeg-generated audio...');

    } catch (error) {
      console.error('Opus test error:', error);
      message.channel.send(`❌ Opus test failed: ${error.message}`);
      
      if (error.message.includes('spawn ffmpeg ENOENT')) {
        message.channel.send('💡 **FFmpeg not found!** Install FFmpeg: https://ffmpeg.org/download.html');
      }
    }
  },
};
