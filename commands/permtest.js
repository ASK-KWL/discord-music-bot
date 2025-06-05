const { PermissionsBitField } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  name: 'permtest',
  async execute(message) {
    try {
      const voiceChannel = message.member.voice.channel;
      if (!voiceChannel) {
        return message.channel.send('❌ Join a voice channel first!');
      }

      message.channel.send('🔍 Running comprehensive diagnostics...');

      // Check bot permissions
      const permissions = voiceChannel.permissionsFor(message.guild.members.me);
      const requiredPerms = [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak,
        PermissionsBitField.Flags.UseVAD
      ];

      message.channel.send('**🔐 Permission Check:**');
      for (const perm of requiredPerms) {
        const hasPermission = permissions.has(perm);
        const permName = Object.keys(PermissionsBitField.Flags).find(key => PermissionsBitField.Flags[key] === perm);
        message.channel.send(`${hasPermission ? '✅' : '❌'} ${permName}: ${hasPermission ? 'Yes' : 'No'}`);
      }

      // Check voice channel details
      message.channel.send(`\n**🎤 Voice Channel Info:**`);
      message.channel.send(`📺 Channel: ${voiceChannel.name} (${voiceChannel.id})`);
      message.channel.send(`👥 Members: ${voiceChannel.members.size}`);
      message.channel.send(`🔊 Bitrate: ${voiceChannel.bitrate} bps`);
      message.channel.send(`👤 User limit: ${voiceChannel.userLimit || 'None'}`);

      // Check existing connections
      const existingConnection = getVoiceConnection(message.guild.id);
      if (existingConnection) {
        message.channel.send(`⚠️ **Existing connection found:** ${existingConnection.state.status}`);
        existingConnection.destroy();
        message.channel.send('🗑️ Destroyed existing connection');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Test basic connection
      message.channel.send('\n**🔗 Testing Connection:**');
      try {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false,
        });

        message.channel.send('✅ Connection object created');

        // Monitor connection states
        let stateCount = 0;
        const stateTimeout = setTimeout(() => {
          message.channel.send('⏰ Connection state monitoring timeout');
        }, 10000);

        connection.on('stateChange', (oldState, newState) => {
          stateCount++;
          message.channel.send(`🔄 State ${stateCount}: ${oldState.status} -> ${newState.status}`);
          
          if (newState.status === 'ready') {
            clearTimeout(stateTimeout);
            message.channel.send('🎉 **Connection is READY! Audio should work now.**');
            
            setTimeout(() => {
              connection.destroy();
              message.channel.send('✅ Test completed - connection destroyed');
            }, 2000);
          } else if (newState.status === 'destroyed') {
            clearTimeout(stateTimeout);
            message.channel.send('🔚 Connection destroyed');
          } else if (newState.status === 'disconnected') {
            clearTimeout(stateTimeout);
            message.channel.send('❌ Connection disconnected - may indicate permission issues');
          }
        });

        connection.on('error', (error) => {
          message.channel.send(`❌ Connection error: ${error.message}`);
          clearTimeout(stateTimeout);
        });

      } catch (connectionError) {
        message.channel.send(`❌ Failed to create connection: ${connectionError.message}`);
      }

      // System info
      message.channel.send(`\n**💻 System Info:**`);
      message.channel.send(`🤖 Node.js: ${process.version}`);
      message.channel.send(`📦 Discord.js: ${require('discord.js').version}`);
      message.channel.send(`🎵 Voice: ${require('@discordjs/voice').version || 'Unknown'}`);
      message.channel.send(`🖥️ Platform: ${process.platform}`);

    } catch (error) {
      console.error('Permission test error:', error);
      message.channel.send(`❌ Diagnostic test failed: ${error.message}`);
    }
  },
};
