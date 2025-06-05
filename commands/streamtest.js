const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const { Readable } = require('stream');

module.exports = {
  name: 'streamtest',
  async execute(message) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      message.channel.send('🎵 Testing with real-time audio stream...');

      // Create connection
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Create a readable stream that generates audio
      class ToneStream extends Readable {
        constructor(options = {}) {
          super(options);
          this.sampleRate = 48000; // Discord's preferred rate
          this.frequency = 440;
          this.amplitude = 0.2; // Reduced amplitude to prevent clipping
          this.duration = 3; // seconds
          this.samplesGenerated = 0;
          this.totalSamples = this.sampleRate * this.duration;
          this.chunkSize = 960; // Smaller, more manageable chunks
        }

        _read() {
          if (this.samplesGenerated >= this.totalSamples) {
            this.push(null); // End of stream
            return;
          }
          
          const samplesToGenerate = Math.min(this.chunkSize, this.totalSamples - this.samplesGenerated);
          const buffer = Buffer.alloc(samplesToGenerate * 4); // 4 bytes per sample (stereo 16-bit)
          
          for (let i = 0; i < samplesToGenerate; i++) {
            const t = this.samplesGenerated / this.sampleRate;
            const sampleValue = Math.sin(2 * Math.PI * this.frequency * t) * this.amplitude;
            
            // Convert to 16-bit integer with proper clamping
            const sample = Math.max(-32768, Math.min(32767, Math.round(sampleValue * 32767)));
            
            // Write identical samples to both channels
            buffer.writeInt16LE(sample, i * 4);     // Left channel
            buffer.writeInt16LE(sample, i * 4 + 2); // Right channel
            
            this.samplesGenerated++;
          }
          
          this.push(buffer);
        }
      }

      const toneStream = new ToneStream();
      
      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: 'play',
        }
      });

      const resource = createAudioResource(toneStream, {
        inputType: StreamType.Raw,
        inlineVolume: true
      });

      if (resource.volume) {
        resource.volume.setVolume(1.0);
      }

      message.channel.send('✅ Real-time audio stream created');

      // Event handling
      let finished = false;
      player.on('stateChange', (oldState, newState) => {
        console.log(`Stream Test Player: ${oldState.status} -> ${newState.status}`);
        message.channel.send(`🎵 Player: ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === AudioPlayerStatus.Playing && !finished) {
          message.channel.send('🔊 **STREAMING AUDIO IS PLAYING!**');
        }
        
        if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing && !finished) {
          finished = true;
          message.channel.send('✅ Stream audio finished');
          setTimeout(() => {
            if (connection.state.status !== 'destroyed') {
              connection.destroy();
            }
          }, 500);
        }
      });

      player.on('error', (error) => {
        console.error('Stream player error:', error);
        message.channel.send(`❌ Stream error: ${error.message}`);
      });

      // Subscribe and play
      connection.subscribe(player);
      player.play(resource);
      message.channel.send('🎵 Playing real-time generated audio stream...');

    } catch (error) {
      console.error('Stream test error:', error);
      message.channel.send(`❌ Stream test failed: ${error.message}`);
    }
  },
};
