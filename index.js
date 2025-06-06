require('dotenv').config();

const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Use environment variables
const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = process.env.PREFIX || '!';

client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Update your message handler to support aliases
client.on('messageCreate', async message => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  // Command aliases
  const aliases = {
    'p': 'play',
    's': 'skip',
    'next': 'skip',
    'q': 'queue',
    'np': 'nowplaying',
    'current': 'nowplaying',
    'vol': 'volume',
    'dc': 'leave',
    'disconnect': 'leave',
    'h': 'help',
    'commands': 'help',
    'rm': 'remove',
    'delete': 'remove',
    'repeat': 'loop',
    'unpause': 'resume',
    'clean': 'cleanup',
    'clear': 'cleanup',
    'purge': 'cleanup',
    'cleanbot': 'cleanbotmessages',
    'deletebot': 'cleanbotmessages',
    'stop': 'leave',
    // Test command aliases
    't': 'test',
    'vt': 'voicetest',
    'bt': 'basictest',
    'ft': 'ffmpegtest',
    'st': 'simpletest',
    'qt': 'quickplay',
    'qp': 'quickplay',
    'qtest': 'quicktest',
    'dp': 'directplay',
    'db': 'debug',
    'dd': 'debugdelete',
    'td': 'testdelete',
    // Quick access aliases
    'pause': 'pause',
    'resume': 'resume',
    'r': 'resume',
    'shuffle': 'shuffle',
    'sh': 'shuffle',
    'mix': 'shuffle',
    'loop': 'loop',
    'l': 'loop',
    'repeat': 'loop',
    'join': 'join',
    'j': 'join'
  };

  // Check if command exists or has an alias
  const command = client.commands.get(commandName) || client.commands.get(aliases[commandName]);
  if (!command) return;

  try {
    await command.execute(message, args);
    
    // Auto-delete command message for certain commands
    const actualCommandUsed = aliases[commandName] || commandName;
    const autoDeleteCommands = [
      'skip', 'queue', 'help', 'test', 'voicetest', 'basictest', 'ffmpegtest', 'ytdltest', 'debugdelete',
      'simpletest', 'quickplay', 'quicktest', 'directplay', 'debug', 'volume', 'loop', 'shuffle', 'testdelete',
      'fixsound', 'volumetest', 'audiofix',
      's', 'q', 'h', 'commands', 't', 'vt', 'bt', 'ft', 'st', 'qt', 'qp', 'qtest', 'dp', 'db', 'vol', 'l', 'sh', 'dd', 'td', 'fs', 'vtest'
    ];
    
    // Special handling for cleanup commands - don't auto-delete, let the command handle it
    const cleanupCommands = ['cleanup', 'clear', 'clean', 'purge', 'cleanbotmessages', 'cleanbot', 'deletebot'];
    
    // Check if this is a cleanup command
    if (cleanupCommands.includes(commandName) || cleanupCommands.includes(actualCommandUsed)) {
      console.log(`Cleanup command detected: ${commandName} - letting command handle deletion`);
      return; // Don't auto-delete cleanup commands
    }
    
    // Auto-delete other commands
    if (autoDeleteCommands.includes(commandName) || 
        autoDeleteCommands.includes(actualCommandUsed) || 
        autoDeleteCommands.includes(command.name)) {
      
      console.log(`Auto-deleting command: ${commandName} (resolved to: ${actualCommandUsed})`);
      
      setTimeout(() => {
        if (message && !message.deleted) {
          message.delete().catch((error) => {
            console.log(`Failed to delete message: ${error.message}`);
          });
        }
      }, 2000);
    }
    
  } catch (error) {
    console.error('Error executing command:', error);
    
    try {
      const errorMsg = await message.reply('❌ There was an error executing that command!');
      setTimeout(() => errorMsg.delete().catch(() => {}), 10000);
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError);
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const [action, type, guildId] = interaction.customId.split('_');
  
  if (action !== 'music') return;

  const musicQueue = require('./music/queue');
  const queue = musicQueue.getQueueList(guildId);

  try {
    switch (type) {
      case 'playpause':
        if (queue.isPlaying) {
          musicQueue.pause(guildId);
          await interaction.reply({ content: '⏸️ Paused', ephemeral: true });
        } else {
          musicQueue.resume(guildId);
          await interaction.reply({ content: '▶️ Resumed', ephemeral: true });
        }
        
        // Update button immediately (1 second delay)
        setTimeout(() => {
          musicQueue.updateNowPlayingMessage(guildId, queue.isPlaying);
        }, 1000);
        break;

      case 'skip':
        if (queue.current) {
          const currentTitle = queue.current.title;
          const skipped = musicQueue.skip(guildId, interaction.channel);
          if (skipped) {
            await interaction.reply({ content: `⏭️ Skipped: **${currentTitle}**`, ephemeral: true });
            
            // Update will happen automatically when next song starts playing
            // But add a delay for visual feedback
            setTimeout(() => {
              musicQueue.updateNowPlayingMessage(guildId, queue.isPlaying);
            }, 2000);
          } else {
            await interaction.reply({ content: '❌ Nothing to skip!', ephemeral: true });
          }
        } else {
          await interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
        }
        break;

      case 'loop':
        const loopMode = musicQueue.toggleLoop(guildId);
        let loopText;
        let loopEmoji;
        switch (loopMode) {
          case 'song':
            loopText = '🔂 Loop: Song';
            loopEmoji = '🔂';
            break;
          case 'queue':
            loopText = '🔁 Loop: Queue';
            loopEmoji = '🔁';
            break;
          default:
            loopText = '🔄 Loop: Off';
            loopEmoji = '🔄';
        }
        await interaction.reply({ 
          content: `${loopEmoji} ${loopText}`, 
          ephemeral: true 
        });
        
        // Update loop button immediately (1.5 second delay)
        setTimeout(() => {
          musicQueue.updateNowPlayingMessage(guildId, queue.isPlaying);
        }, 1500);
        break;

      case 'stop':
        musicQueue.stop(guildId);
        await interaction.reply({ content: '⏹️ Stopped and cleared queue!', ephemeral: true });
        
        // The message will be deleted when stop() is called, so no update needed
        break;

      case 'queue':
        // Show queue in ephemeral message
        if (!queue.current && queue.queue.length === 0) {
          await interaction.reply({ content: '📭 Queue is empty!', ephemeral: true });
        } else {
          let queueText = '';
          if (queue.current) {
            queueText += `🎵 **Now Playing:** ${queue.current.title}\n`;
            if (queue.loopMode !== 'off') {
              const loopEmoji = queue.loopMode === 'song' ? '🔂' : '🔁';
              const loopText = queue.loopMode === 'song' ? 'Song' : 'Queue';
              queueText += `${loopEmoji} **Loop:** ${loopText}\n`;
            }
            queueText += `🎚️ **Status:** ${queue.isPlaying ? 'Playing' : 'Paused'}\n\n`;
          }
          if (queue.queue.length > 0) {
            queueText += `📋 **Up Next:**\n`;
            queueText += queue.queue.slice(0, 10).map((song, index) => 
              `${index + 1}. ${song.title}`
            ).join('\n');
            if (queue.queue.length > 10) {
              queueText += `\n... and ${queue.queue.length - 10} more`;
            }
          } else {
            queueText += `📋 **Queue is empty**`;
          }
          await interaction.reply({ content: queueText, ephemeral: true });
        }
        break;

      default:
        await interaction.reply({ content: '❌ Unknown action!', ephemeral: true });
    }

  } catch (error) {
    console.error('Button interaction error:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ An error occurred!', ephemeral: true });
    }
  }
});

client.login(TOKEN);
