require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
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
    'stop': 'leave',
  };

  // Check if command exists or has an alias
  const command = client.commands.get(commandName) || client.commands.get(aliases[commandName]);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error('Error executing command:', error);
    message.reply('❌ There was an error executing that command!');
  }
});

client.login(TOKEN);
