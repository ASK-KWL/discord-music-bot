const { createAudioConnection, createPlayer, getSongInfo } = require('../music/player');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'test',
  async execute(message, args) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      // Test with Rick Roll (known working video)
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

      message.channel.send(`🧪 Testing with stable ytdl-core: ${testUrl}`);

      // Step 1: Get song info
      message.channel.send('📋 Getting song info...');
      const songInfo = await getSongInfo(testUrl);
      message.channel.send(`🎵 Found: **${songInfo.title}**`);

      // Step 2: Create connection
      message.channel.send('🔗 Creating voice connection...');
      const connection = createAudioConnection(message);

      // Step 3: Create player
      message.channel.send('🎵 Creating stable YouTube player...');
      const { player, resource } = await createPlayer(testUrl);

      // Step 4: Set up event listeners
      player.on('stateChange', (oldState, newState) => {
        console.log(`Stable Player: ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === AudioPlayerStatus.Playing) {
          message.channel.send('🔊 **STABLE YOUTUBE AUDIO IS PLAYING!**');
        }
        
        if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing) {
          message.channel.send('✅ Stable YouTube audio finished');
          connection.destroy();
        }
      });

      player.on('error', error => {
        console.error('Stable Player error:', error);
        message.channel.send(`❌ Stable player error: ${error.message}`);
      });

      // Step 5: Subscribe and play
      message.channel.send('▶️ Starting stable YouTube playback...');
      connection.subscribe(player);
      player.play(resource);

    } catch (error) {
      console.error('Stable YouTube test error:', error);
      message.channel.send(`❌ Stable test failed: ${error.message}`);
    }
  },
};