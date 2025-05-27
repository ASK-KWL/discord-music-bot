const queue = require('../music/queue');

module.exports = {
  name: 'loop',
  execute(message, args) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) {
      return message.reply('❌ There is no music playing!');
    }

    if (!args[0]) {
      // Show current loop status
      let status = 'Off';
      if (serverQueue.loop === 'song') status = 'Current Song';
      if (serverQueue.loop === 'queue') status = 'Queue';
      
      return message.channel.send(`🔁 Current loop status: **${status}**\n\nUsage:\n\`!loop off\` - Disable loop\n\`!loop song\` - Loop current song\n\`!loop queue\` - Loop entire queue`);
    }

    const mode = args[0].toLowerCase();

    switch (mode) {
      case 'off':
      case 'disable':
      case 'stop':
        serverQueue.loop = false;
        message.channel.send('🔁 Loop disabled');
        break;

      case 'song':
      case 'track':
      case 'current':
        serverQueue.loop = 'song';
        message.channel.send('🔂 Now looping current song');
        break;

      case 'queue':
      case 'all':
      case 'playlist':
        serverQueue.loop = 'queue';
        message.channel.send('🔁 Now looping entire queue');
        break;

      default:
        message.channel.send('❌ Invalid loop mode!\n\nUsage:\n\`!loop off\` - Disable loop\n\`!loop song\` - Loop current song\n\`!loop queue\` - Loop entire queue');
        break;
    }
  },
};