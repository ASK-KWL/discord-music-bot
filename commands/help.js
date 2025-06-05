const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  aliases: ['h', 'commands'],
  description: 'Show all available commands',
  async execute(message, args) {
    try {
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎵 Music Bot Commands')
        .setDescription('Here are all the available commands:')
        .addFields(
          {
            name: '🎵 Music Commands',
            value: [
              '`!play <song/url>` - Play a song from YouTube',
              '`!skip` - Skip the current song',
              '`!queue` - Show the current queue',
              '`!stop` - Stop music and clear queue',
              '`!leave` - Leave the voice channel',
              '`!volume <1-100>` - Set volume (if available)'
            ].join('\n'),
            inline: false
          },
          {
            name: '🔧 Utility Commands',
            value: [
              '`!cleanup [number]` - Clean bot messages (default: 50)',
              '`!cleanup --all [number]` - Clean bot & command messages',
              '`!cleanup @user [number]` - Clean specific user\'s messages',
              '`!test` - Test YouTube audio functionality',
              '`!voicetest` - Test basic voice functionality'
            ].join('\n'),
            inline: false
          },
          {
            name: '📋 Command Aliases',
            value: [
              '`!p` → play, `!s` → skip, `!q` → queue',
              '`!dc` → leave, `!clean` → cleanup',
              '`!h` → help, `!commands` → help'
            ].join('\n'),
            inline: false
          },
          {
            name: '🎛️ Interactive Controls',
            value: 'Use the buttons that appear with now playing messages for quick control!',
            inline: false
          },
          {
            name: '💡 Cleanup Examples',
            value: [
              '`!cleanup` - Delete 50 bot messages',
              '`!cleanup 25` - Delete 25 bot messages',
              '`!cleanup --all` - Delete bot and command messages',
              '`!cleanup @user 10` - Delete 10 messages from user'
            ].join('\n'),
            inline: false
          }
        )
        .setFooter({ 
          text: 'Bot made with ❤️ | Messages auto-delete to keep chat clean',
          iconURL: message.client.user.displayAvatarURL()
        })
        .setTimestamp();

      // If specific command requested
      if (args.length > 0) {
        const commandName = args[0].toLowerCase();
        const command = message.client.commands.get(commandName);
        
        if (command) {
          const commandEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📖 Command: ${command.name}`)
            .setDescription(command.description || 'No description available')
            .setTimestamp();

          if (command.aliases && command.aliases.length > 0) {
            commandEmbed.addFields({
              name: 'Aliases:',
              value: command.aliases.map(alias => `\`!${alias}\``).join(', '),
              inline: true
            });
          }

          const helpMessage = await message.channel.send({ embeds: [commandEmbed] });
          
          // Auto-delete after 30 seconds
          setTimeout(() => {
            if (helpMessage && !helpMessage.deleted) {
              helpMessage.delete().catch(() => {});
            }
          }, 30000);
          
          return;
        } else {
          return message.channel.send(`❌ Command \`${commandName}\` not found!`);
        }
      }

      const helpMessage = await message.channel.send({ embeds: [embed] });
      
      // Auto-delete help message after 45 seconds to give time to read
      setTimeout(() => {
        if (helpMessage && !helpMessage.deleted) {
          helpMessage.delete().catch(() => {});
        }
      }, 45000);

    } catch (error) {
      console.error('Help command error:', error);
      message.channel.send('❌ Error displaying help information!');
    }
  },
};