const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = {
  name: 'cleanup',
  async execute(message) {
    const tempDir = path.join(os.tmpdir(), 'discord-music-bot');
    
    message.channel.send('🧹 Cleaning up temporary files...');
    
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        
        if (files.length === 0) {
          message.channel.send('✅ No files to clean up.');
          return;
        }
        
        message.channel.send(`Found ${files.length} temporary files.`);
        
        let deleted = 0;
        for (const file of files) {
          fs.unlinkSync(path.join(tempDir, file));
          deleted++;
        }
        
        message.channel.send(`✅ Cleaned up ${deleted} temporary files.`);
      } else {
        message.channel.send('✅ No temporary directory found.');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      message.reply(`❌ Error during cleanup: ${error.message}`);
    }
  }
};