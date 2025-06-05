module.exports = {
  name: 'testdelete',
  async execute(message, args) {
    try {
      // Send a few test messages
      const msg1 = await message.channel.send('🧪 **Test message 1** - This will be deleted in 5 seconds');
      const msg2 = await message.channel.send('🧪 **Test message 2** - This will be deleted in 5 seconds');
      const msg3 = await message.channel.send('🧪 **Test message 3** - This will be deleted in 5 seconds');
      
      const statusMsg = await message.channel.send('⏰ **Testing bulk delete in 5 seconds...**');

      setTimeout(async () => {
        try {
          // Try bulk delete
          await message.channel.bulkDelete([message, msg1, msg2, msg3, statusMsg]);
          console.log('✅ Bulk delete test successful');
        } catch (bulkError) {
          console.error('❌ Bulk delete failed:', bulkError);
          
          // Fallback: delete individually
          const messages = [message, msg1, msg2, msg3, statusMsg];
          for (const msg of messages) {
            try {
              if (msg && !msg.deleted) {
                await msg.delete();
              }
            } catch (deleteError) {
              console.error(`Failed to delete individual message: ${deleteError.message}`);
            }
          }
        }
      }, 5000);

    } catch (error) {
      console.error('Test delete error:', error);
      message.channel.send(`❌ **Test delete failed:** ${error.message}`);
    }
  },
};
