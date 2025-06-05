const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const { Readable } = require('stream');

module.exports = {
  name: 'rawtest',
  async execute(message) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      message.channel.send('🎵 Testing with raw PCM audio...');

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate raw PCM data directly
      const sampleRate = 48000;
      const frequency = 440;
      const duration = 2;
      const amplitude = 0.3;
      
      const totalSamples = sampleRate * duration;
      const buffer = Buffer.alloc(totalSamples * 4); // Stereo 16-bit
      
      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        const sampleValue = Math.sin(2 * Math.PI * frequency * t) * amplitude;
        const sample = Math.round(sampleValue * 32767);
        
        // Write to both channels
        buffer.writeInt16LE(sample, i * 4);
        buffer.writeInt16LE(sample, i * 4 + 2);
      }
      
      const stream = new Readable({
        read() {
          this.push(buffer);
          this.push(null); // End stream
        }
      });

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: 'play',
        }
      });

      const resource = createAudioResource(stream, {
        inputType: StreamType.Raw,
        inlineVolume: true
      });

      if (resource.volume) {
        resource.volume.setVolume(1.0);
      }

      let finished = false;
      player.on('stateChange', (oldState, newState) => {
        console.log(`Raw Test: ${oldState.status} -> ${newState.status}`);
        message.channel.send(`🎵 Player: ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === AudioPlayerStatus.Playing && !finished) {
          message.channel.send('🔊 **RAW PCM AUDIO IS PLAYING!**');
        }
        
        if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing && !finished) {
          finished = true;
          message.channel.send('✅ Raw audio finished');
          setTimeout(() => {
            if (connection.state.status !== 'destroyed') {
              connection.destroy();
            }
          }, 500);
        }
      });

      player.on('error', (error) => {
        console.error('Raw test error:', error);
        message.channel.send(`❌ Raw error: ${error.message}`);
      });

      connection.subscribe(player);
      player.play(resource);
      message.channel.send('🎵 Playing raw PCM audio...');

    } catch (error) {
      console.error('Raw test error:', error);
      message.channel.send(`❌ Raw test failed: ${error.message}`);
    }
  },
};
