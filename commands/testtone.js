const { createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('ffmpeg-static');
const queue = require('../music/queue');

module.exports = {
  name: 'testtone',
  async execute(message) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ You need to be in a voice channel!');
      }
      
      message.channel.send('🔊 Generating a simple test tone...');
      
      // Create a temporary file path
      const tempFile = path.join(__dirname, '..', 'test-tone.mp3');
      
      // Use FFmpeg to generate a test tone
      const ffmpegProcess = spawn(ffmpeg, [
        '-f', 'lavfi', 
        '-i', 'sine=frequency=440:duration=5',  // 440 Hz tone for 5 seconds
        '-c:a', 'libmp3lame',
        '-q:a', '0',
        tempFile
      ]);
      
      // Wait for FFmpeg to finish
      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          message.channel.send('✅ Test tone generated. Playing now...');
          
          // Create connection
          const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
          });
          
          // Create a read stream from the generated file
          const fileStream = fs.createReadStream(tempFile);
          
          // Create audio player
          const player = createAudioPlayer();
          
          // Create audio resource
          const resource = createAudioResource(fileStream, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true
          });
          
          // Set volume to maximum
          if (resource.volume) {
            resource.volume.setVolume(1.0);
          }
          
          // Connect player to connection
          connection.subscribe(player);
          
          // Play the resource
          player.play(resource);
          
          // Add to queue
          queue.set(message.guild.id, {
            connection,
            player,
            songs: [{ title: 'Test Tone', url: 'none' }]
          });
          
          // Log state changes for debugging
          player.on('stateChange', (oldState, newState) => {
            console.log(`Player state changed: ${oldState.status} -> ${newState.status}`);
            
            if (oldState.status === 'playing' && newState.status === 'idle') {
              message.channel.send('✅ Test tone finished playing');
              
              // Delete the temporary file
              fs.unlink(tempFile, (err) => {
                if (err) console.error('Error deleting temp file:', err);
              });
            }
          });
          
        } else {
          message.channel.send(`❌ Failed to generate test tone (FFmpeg exit code: ${code})`);
        }
      });
      
    } catch (error) {
      console.error('Test tone error:', error);
      message.reply(`❌ Test tone failed: ${error.message}`);
    }
  },
};