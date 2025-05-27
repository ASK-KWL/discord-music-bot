const { createReadStream } = require('fs');
const { join } = require('path');
const { createAudioResource, StreamType } = require('@discordjs/voice');
const queue = require('../music/queue');
const { createAudioConnection } = require('../music/player');

module.exports = {
  name: 'test',
  async execute(message) {
    try {
      message.channel.send('🔊 Testing audio playback...');
      
      // Get or create queue
      let serverQueue = queue.get(message.guild.id);
      if (!serverQueue) {
        const connection = createAudioConnection(message);
        
        // Create an audio player using @discordjs/voice directly
        const { createAudioPlayer, NoSubscriberBehavior } = require('@discordjs/voice');
        const player = createAudioPlayer({
          behaviors: {
            noSubscriber: NoSubscriberBehavior.Pause,
          },
        });
        
        serverQueue = {
          connection,
          player,
          songs: [{ title: 'Audio Test', url: 'test' }],
        };
        
        queue.set(message.guild.id, serverQueue);
      }
      
      // Use a test audio provided by YouTube
      const play = require('play-dl');
      const stream = await play.stream('https://www.youtube.com/watch?v=dQw4w9WgXcQ'); // Never Gonna Give You Up - should work
      
      // Create an audio resource from the stream
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true,
      });
      
      if (resource.volume) {
        resource.volume.setVolume(1.0);
      }
      
      // Play the audio
      serverQueue.connection.subscribe(serverQueue.player);
      serverQueue.player.play(resource);
      
      message.channel.send('▶️ Playing test audio... You should hear something now.');
    } catch (error) {
      console.error('Test command error:', error);
      message.reply(`❌ Test failed: ${error.message}`);
    }
  },
};