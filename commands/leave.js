const queue = require('../music/queue');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Temporary directory for downloads
const TEMP_DIR = path.join(os.tmpdir(), 'discord-music-bot');

module.exports = {
  name: 'leave',
  execute(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) return message.reply('❌ I\'m not in a voice channel.');

    // Stop the player and destroy connection first
    if (serverQueue.player) {
      serverQueue.player.stop(true); // Force stop
    }
    
    if (serverQueue.connection) {
      serverQueue.connection.destroy();
    }
    
    // Remove from queue
    queue.delete(message.guild.id);

    // Wait longer for resources to be fully released
    setTimeout(() => {
      cleanupTempFiles();
    }, 5000); // Wait 5 seconds

    message.channel.send('👋 Disconnected from the voice channel. Cleaning up files...');
  },
};

function cleanupTempFiles() {
  if (!fs.existsSync(TEMP_DIR)) return;
  
  try {
    const files = fs.readdirSync(TEMP_DIR);
    console.log(`Found ${files.length} temp files to clean up`);
    
    files.forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      attemptFileCleanup(filePath, file);
    });
  } catch (error) {
    console.error('Error reading temp directory:', error);
  }
}

function attemptFileCleanup(filePath, fileName, retryCount = 0) {
  const maxRetries = 5;
  const retryDelay = 2000 * (retryCount + 1);
  
  try {
    // Check if file is still locked by trying to read it
    const fd = fs.openSync(filePath, 'r+');
    fs.closeSync(fd);
    
    // If we can open it, it's safe to delete
    fs.unlinkSync(filePath);
    console.log(`✅ Cleaned up temp file: ${fileName}`);
  } catch (error) {
    if ((error.code === 'EBUSY' || error.code === 'ENOENT') && retryCount < maxRetries) {
      console.log(`⏳ File ${fileName} still in use, retry ${retryCount + 1}/${maxRetries} in ${retryDelay}ms...`);
      setTimeout(() => {
        attemptFileCleanup(filePath, fileName, retryCount + 1);
      }, retryDelay);
    } else if (error.code === 'ENOENT') {
      console.log(`✅ File ${fileName} already deleted`);
    } else {
      console.error(`❌ Could not delete ${fileName} after ${retryCount + 1} attempts:`, error.message);
    }
  }
}