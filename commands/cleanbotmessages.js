module.exports = {
  name: 'cleanbotmessages',
  aliases: ['cleanbot', 'deletebot'],
  async execute(message, args) {
    try {
      const amount = parseInt(args[0]) || 100;
      const maxAmount = Math.min(amount, 100);
      
      const statusMsg = await message.channel.send(`🤖 **Cleaning bot messages...** (checking last ${maxAmount})`);
      
      const messages = await message.channel.messages.fetch({ 
        limit: maxAmount,
        before: statusMsg.id
      });
      
      // Filter only bot messages (stricter filter)
      const botMessages = messages.filter(msg => msg.author.bot);
      
      if (botMessages.size === 0) {
        return statusMsg.edit('✅ **No bot messages found!**');
      }
      
      let deletedCount = 0;
      
      // Try bulk delete first
      try {
        if (botMessages.size === 1) {
          await botMessages.first().delete();
          deletedCount = 1;
        } else {
          const deleted = await message.channel.bulkDelete(botMessages, true);
          deletedCount = deleted.size;
        }
      } catch (bulkError) {
        // Fallback to individual deletion
        for (const msg of botMessages.values()) {
          try {
            await msg.delete();
            deletedCount++;
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.log(`Failed to delete bot message: ${error.message}`);
          }
        }
      }
      
      await statusMsg.edit(`✅ **Deleted ${deletedCount} bot messages!**`);
      
      setTimeout(() => {
        statusMsg.delete().catch(() => {});
      }, 5000);
      
    } catch (error) {
      console.error('Clean bot messages error:', error);
      message.channel.send(`❌ **Error:** ${error.message}`);
    }
  },
};
