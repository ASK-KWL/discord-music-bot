module.exports = {
  name: 'help',
  execute(message, args) {
    const prefix = process.env.PREFIX || '!';
    
    // If no specific command requested, show all commands
    if (!args[0]) {
      const helpEmbed = {
        color: 0x0099ff,
        title: '🎵 Music Bot Commands',
        description: `Use \`${prefix}help <command>\` for detailed information about a specific command.`,
        fields: [
          {
            name: '🎶 Music Commands',
            value: `\`${prefix}play <song/url>\` - Play a song or playlist\n` +
                   `\`${prefix}pause\` - Pause the current song\n` +
                   `\`${prefix}resume\` - Resume playback\n` +
                   `\`${prefix}skip\` - Skip to next song\n` +
                   `\`${prefix}stop\` - Stop music and clear queue\n` +
                   `\`${prefix}leave\` - Disconnect from voice channel`,
            inline: false
          },
          {
            name: '📋 Queue Commands',
            value: `\`${prefix}queue\` - Show current queue\n` +
                   `\`${prefix}clear\` - Clear the queue\n` +
                   `\`${prefix}remove <number>\` - Remove song from queue\n` +
                   `\`${prefix}shuffle\` - Shuffle the queue`,
            inline: false
          },
          {
            name: '🔁 Loop Commands',
            value: `\`${prefix}loop\` - Show loop status\n` +
                   `\`${prefix}loop off\` - Disable looping\n` +
                   `\`${prefix}loop song\` - Loop current song\n` +
                   `\`${prefix}loop queue\` - Loop entire queue`,
            inline: false
          },
          {
            name: '🔧 Utility Commands',
            value: `\`${prefix}nowplaying\` - Show current song info\n` +
                   `\`${prefix}volume <1-100>\` - Set volume\n` +
                   `\`${prefix}cleanup\` - Clean temporary files\n` +
                   `\`${prefix}help\` - Show this help message`,
            inline: false
          }
        ],
        footer: {
          text: `Bot created with ❤️ | Prefix: ${prefix}`
        },
        timestamp: new Date()
      };

      return message.channel.send({ embeds: [helpEmbed] });
    }

    // Detailed help for specific commands
    const command = args[0].toLowerCase();
    const commandHelp = getCommandHelp(command, prefix);
    
    if (commandHelp) {
      const detailEmbed = {
        color: 0x0099ff,
        title: `📖 Help: ${prefix}${command}`,
        description: commandHelp.description,
        fields: [
          {
            name: '📝 Usage',
            value: commandHelp.usage,
            inline: false
          },
          {
            name: '💡 Examples',
            value: commandHelp.examples,
            inline: false
          }
        ],
        footer: {
          text: `Use ${prefix}help for all commands`
        }
      };

      if (commandHelp.aliases) {
        detailEmbed.fields.push({
          name: '🔗 Aliases',
          value: commandHelp.aliases,
          inline: false
        });
      }

      message.channel.send({ embeds: [detailEmbed] });
    } else {
      message.channel.send(`❌ Command \`${command}\` not found! Use \`${prefix}help\` to see all available commands.`);
    }
  },
};

function getCommandHelp(command, prefix) {
  const commandInfo = {
    'play': {
      description: 'Play a song or add it to the queue. Supports YouTube URLs, search terms, and playlists.',
      usage: `${prefix}play <song name or YouTube URL>`,
      examples: `${prefix}play Never Gonna Give You Up\n${prefix}play https://www.youtube.com/watch?v=dQw4w9WgXcQ\n${prefix}play https://www.youtube.com/playlist?list=PLSaOVYWKGD3FqzOK0y-AiGtAP9THiZLRa`,
      aliases: 'p'
    },
    'pause': {
      description: 'Pause the currently playing song.',
      usage: `${prefix}pause`,
      examples: `${prefix}pause`
    },
    'resume': {
      description: 'Resume the paused song.',
      usage: `${prefix}resume`,
      examples: `${prefix}resume`,
      aliases: 'unpause'
    },
    'skip': {
      description: 'Skip the current song and play the next one in queue.',
      usage: `${prefix}skip`,
      examples: `${prefix}skip`,
      aliases: 's, next'
    },
    'stop': {
      description: 'Stop the music and clear the entire queue.',
      usage: `${prefix}stop`,
      examples: `${prefix}stop`
    },
    'queue': {
      description: 'Display the current music queue with loop status.',
      usage: `${prefix}queue`,
      examples: `${prefix}queue`,
      aliases: 'q'
    },
    'clear': {
      description: 'Clear all songs from the queue except the currently playing one.',
      usage: `${prefix}clear`,
      examples: `${prefix}clear`
    },
    'remove': {
      description: 'Remove a specific song from the queue by its position number.',
      usage: `${prefix}remove <position>`,
      examples: `${prefix}remove 3\n${prefix}remove 1`,
      aliases: 'rm, delete'
    },
    'shuffle': {
      description: 'Randomly shuffle all songs in the queue.',
      usage: `${prefix}shuffle`,
      examples: `${prefix}shuffle`
    },
    'loop': {
      description: 'Control loop settings for the current song or entire queue.',
      usage: `${prefix}loop [off|song|queue]`,
      examples: `${prefix}loop\n${prefix}loop song\n${prefix}loop queue\n${prefix}loop off`,
      aliases: 'repeat'
    },
    'nowplaying': {
      description: 'Show information about the currently playing song.',
      usage: `${prefix}nowplaying`,
      examples: `${prefix}nowplaying`,
      aliases: 'np, current'
    },
    'volume': {
      description: 'Set the playback volume (1-100). Default is 80.',
      usage: `${prefix}volume <1-100>`,
      examples: `${prefix}volume 50\n${prefix}volume 100`,
      aliases: 'vol'
    },
    'leave': {
      description: 'Disconnect the bot from the voice channel and clean up temporary files.',
      usage: `${prefix}leave`,
      examples: `${prefix}leave`,
      aliases: 'disconnect, dc'
    },
    'cleanup': {
      description: 'Manually clean up temporary audio files.',
      usage: `${prefix}cleanup`,
      examples: `${prefix}cleanup`
    },
    'help': {
      description: 'Show this help message or get detailed help for a specific command.',
      usage: `${prefix}help [command]`,
      examples: `${prefix}help\n${prefix}help play\n${prefix}help loop`,
      aliases: 'h, commands'
    }
  };

  return commandInfo[command] || null;
}