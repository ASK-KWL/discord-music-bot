module.exports = {
  name: 'debugdelete',
  async execute(message, args) {
    try {
      const testMsg = await message.channel.send('🧪 **This message will auto-delete in 3 seconds...**');
      
      console.log(`Debug delete test: Message ID ${testMsg.id} will be deleted in 3 seconds`);
      
      setTimeout(async () => {
        try {
          await testMsg.delete();
          console.log(`✅ Successfully deleted test message ${testMsg.id}`);
        } catch (error) {
          console.error(`❌ Failed to delete test message: ${error.message}`);
        }
      }, 3000);

      // Also test command message deletion
      setTimeout(async () => {
        try {
          await message.delete();
          console.log(`✅ Successfully deleted command message ${message.id}`);
        } catch (error) {
          console.error(`❌ Failed to delete command message: ${error.message}`);
        }
      }, 5000);

    } catch (error) {
      console.error('Debug delete error:', error);
      message.channel.send(`❌ **Debug delete failed:** ${error.message}`);
    }
  },
};
