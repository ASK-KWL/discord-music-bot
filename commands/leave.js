const queue = require('../music/queue');

module.exports = {
  name: 'leave',
  execute(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) return message.reply('❌ I\'m not in a voice channel.');

    serverQueue.connection.destroy();
    queue.delete(message.guild.id);
    message.channel.send('👋 Disconnected from the voice channel.');
  },
};