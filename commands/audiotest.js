const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'audiotest',
  async execute(message) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      message.channel.send('🎵 Testing with simplified WAV generation...');

      // Create a very simple WAV file - mono 44.1kHz
      const audioPath = path.join(__dirname, '..', 'temp_simple_tone.wav');
      
      const sampleRate = 44100; // Standard CD quality
      const duration = 2; // 2 seconds
      const frequency = 440;
      const amplitude = 0.5; // Increased amplitude
      const channels = 1; // Mono for simplicity
      
      const numSamples = sampleRate * duration;
      const dataSize = numSamples * channels * 2; // 2 bytes per sample
      const fileSize = 44 + dataSize; // WAV header is 44 bytes
      
      const buffer = Buffer.alloc(fileSize);
      let offset = 0;
      
      // Simple WAV header
      buffer.write('RIFF', offset); offset += 4;
      buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
      buffer.write('WAVE', offset); offset += 4;
      buffer.write('fmt ', offset); offset += 4;
      buffer.writeUInt32LE(16, offset); offset += 4; // PCM chunk size
      buffer.writeUInt16LE(1, offset); offset += 2;  // PCM format
      buffer.writeUInt16LE(channels, offset); offset += 2;
      buffer.writeUInt32LE(sampleRate, offset); offset += 4;
      buffer.writeUInt32LE(sampleRate * channels * 2, offset); offset += 4;
      buffer.writeUInt16LE(channels * 2, offset); offset += 2;
      buffer.writeUInt16LE(16, offset); offset += 2; // 16 bits per sample
      buffer.write('data', offset); offset += 4;
      buffer.writeUInt32LE(dataSize, offset); offset += 4;
      
      // Generate clean sine wave
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude * 32767;
        buffer.writeInt16LE(Math.round(sample), offset);
        offset += 2;
      }
      
      fs.writeFileSync(audioPath, buffer);
      message.channel.send('✅ Generated simple mono WAV file');

      // Create connection
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: 'play',
        }
      });

      // Use file path directly
      const resource = createAudioResource(fs.createReadStream(audioPath), {
        inputType: StreamType.Arbitrary,
        inlineVolume: true
      });

      if (resource.volume) {
        resource.volume.setVolume(1.0);
      }

      let finished = false;
      player.on('stateChange', (oldState, newState) => {
        console.log(`Audio Test: ${oldState.status} -> ${newState.status}`);
        message.channel.send(`🎵 Player: ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === AudioPlayerStatus.Playing && !finished) {
          message.channel.send('🔊 **SIMPLE WAV AUDIO IS PLAYING!**');
        }
        
        if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing && !finished) {
          finished = true;
          message.channel.send('✅ Simple audio finished');
          
          // Cleanup
          try {
            fs.unlinkSync(audioPath);
          } catch (err) {
            console.error('Cleanup error:', err);
          }
          
          setTimeout(() => {
            if (connection.state.status !== 'destroyed') {
              connection.destroy();
            }
          }, 500);
        }
      });

      player.on('error', (error) => {
        console.error('Audio test error:', error);
        message.channel.send(`❌ Audio error: ${error.message}`);
      });

      connection.subscribe(player);
      player.play(resource);
      message.channel.send('🎵 Playing simple WAV file...');

    } catch (error) {
      console.error('Audio test error:', error);
      message.channel.send(`❌ Test failed: ${error.message}`);
    }
  },
};
