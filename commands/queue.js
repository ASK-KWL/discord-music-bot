const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'queue',
  async execute(message, args) {
    try {
      const musicQueue = require('../music/queue');
      const queue = musicQueue.getQueueList(message.guild.id);
      
      if (!queue.current && queue.queue.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setColor('#ffff00')
          .setTitle('📭 Empty Queue')
          .setDescription('The queue is empty! Use `!play <song>` to add some music.')
          .setTimestamp();
        return message.channel.send({ embeds: [emptyEmbed] });
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📋 Music Queue')
        .setTimestamp();

      if (queue.current) {
        embed.addFields({
          name: '🎵 Now Playing',
          value: `**${queue.current.title}**\nRequested by: ${queue.current.requestedBy}\nDuration: ${musicQueue.formatDuration(queue.current.duration)}`,
          inline: false
        });
      }
      
      if (queue.queue.length > 0) {
        const queueList = queue.queue.slice(0, 10).map((song, index) => 
          `${index + 1}. **${song.title}** (${musicQueue.formatDuration(song.duration)})\n   Requested by: ${song.requestedBy}`
        ).join('\n\n');
        
        embed.addFields({
          name: `📜 Up Next (${queue.queue.length} songs)`,
          value: queueList,
          inline: false
        });
        
        if (queue.queue.length > 10) {
          embed.setFooter({ text: `... and ${queue.queue.length - 10} more songs` });
        }
      }

      message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Queue command error:', error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Error')
        .setDescription('Error displaying queue!')
        .setTimestamp();
      message.channel.send({ embeds: [errorEmbed] });
    }
  },
};
